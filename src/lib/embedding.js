/**
 * Shared embedding logic – same model and approach as /api/embed.
 * Used by RAG to embed the user query and by findRelevantContent for retrieval.
 */
import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small')

/**
 * Get a single embedding for a query string (same as embed API uses for chunks).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedQuery(text) {
  if (!text || typeof text !== 'string') return []
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: [text.trim()],
  })
  return embeddings?.[0] ?? []
}

/**

 * @param {string} queryText
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {{ topK?: number }} [options]
 * @returns {Promise<Array<{ id: string, text: string, similarity: number, metadata?: object }>>}
 */
export async function findRelevantContent(queryText, supabaseClient, options = {}) {
  const topK = options.topK ?? 5
  const fetchLimit = Math.max(topK * 40, 200)
  if (!queryText?.trim()) return []

  const queryEmbedding = await embedQuery(queryText)
  if (!queryEmbedding.length) return []

  // Try Supabase RPC first if available (pgvector).
  const rpcMatches = await findRelevantContentWithRpc(supabaseClient, queryEmbedding, topK)
  if (rpcMatches.length) {
    const topRpcSimilarity = Math.max(
      ...rpcMatches.map((row) => Number(row?.similarity ?? 0))
    )

    if (topRpcSimilarity > 0) {
      console.log('[RAG] findRelevantContent: RPC returned', rpcMatches.length, 'matches')
      return rpcMatches
    }

    // Some RPCs return distance-like values that do not map cleanly to [0..1].
    // If normalized scores look unusable, fallback to local cosine ranking.
    console.warn('[RAG] findRelevantContent: RPC returned rows but similarity is not usable, falling back', {
      count: rpcMatches.length,
      topRpcSimilarity,
    })
  }
  console.log('[RAG] findRelevantContent: no RPC results, using fallback (document_chunks table)')

  // Fallback: fetch chunks with embeddings and rank by cosine similarity
  // Schema: id, content, embedding, chunks_number, name, date_Added
  let chunks = null
  let error = null

  ;({ data: chunks, error } = await supabaseClient
    .from('document_chunks')
    .select('id, content, embedding, chunks_number, name, date_Added')
    .not('embedding', 'is', null)
    .limit(fetchLimit))

  if (error) {
    console.error('[RAG] findRelevantContent: Supabase fallback error', {
      message: error.message,
      code: error.code,
      details: error.details,
    })
    return []
  }
  if (!chunks?.length) {
    console.warn('[RAG] findRelevantContent: no rows in document_chunks with non-null embedding (table empty or embeddings not populated)')
    return []
  }

  let invalidEmbeddingCount = 0
  const scored = chunks
    .map((row) => {
      const emb = parseEmbeddingVector(row.embedding)
      if (!emb.length || emb.length !== queryEmbedding.length) {
        invalidEmbeddingCount += 1
        return null
      }
      const similarity = cosineSimilarity(queryEmbedding, emb)
      return {
        id: String(row.id ?? ''),
        text: row.content ?? '',
        similarity,
        metadata: {
          title: row.name ?? undefined,
          name: row.name ?? undefined,
          chunkNumber: row.chunks_number ?? undefined,
          dateAdded: row.date_Added ?? undefined,
        },
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)

  if (invalidEmbeddingCount > 0) {
    console.warn('[RAG] findRelevantContent: skipped rows with invalid embedding shape', {
      invalidEmbeddingCount,
      queryEmbeddingLength: queryEmbedding.length,
    })
  }

  return scored
}

async function findRelevantContentWithRpc(supabaseClient, queryEmbedding, topK) {
  const rpcCandidates = [
    {
      fn: 'match_document_chunks',
      args: { query_embedding: queryEmbedding, match_count: topK },
    },
    {
      fn: 'match_document_chunks',
      args: { embedding: queryEmbedding, match_count: topK },
    },
    {
      fn: 'match_documents',
      args: { query_embedding: queryEmbedding, match_count: topK },
    },
  ]

  for (const candidate of rpcCandidates) {
    try {
      const { data, error } = await supabaseClient.rpc(candidate.fn, candidate.args)
      if (error || !Array.isArray(data) || data.length === 0) continue
      return data
        .map(normalizeMatchRow)
        .filter((row) => row.text && Number.isFinite(row.similarity))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
    } catch (_) {
      // RPC does not exist or signature mismatch; move to next candidate.
    }
  }

  return []
}

function normalizeMatchRow(row) {
  const similarity = normalizeSimilarityScore(row)
  return {
    id: String(row.id ?? row.chunk_id ?? row.document_chunk_id ?? ''),
    text: String(
      row.content ??
        row.text ??
        row.chunk_content ??
        row.page_content ??
        ''
    ),
    similarity,
    metadata: {
      title: row.title ?? row.name ?? row.document_name ?? undefined,
      documentId: row.document_id ?? undefined,
      chunkNumber: row.chunks_number ?? row.chunk_number ?? undefined,
    },
  }
}

function normalizeSimilarityScore(row) {
  const similarity = Number(row?.similarity)
  if (Number.isFinite(similarity)) return similarity

  const score = Number(row?.score)
  if (Number.isFinite(score)) return score

  const distance = Number(row?.distance)
  if (Number.isFinite(distance)) {
    // Convert lower-is-better distance into a bounded higher-is-better score.
    // This works for distance metrics whose ranges are not naturally [0..1].
    return 1 / (1 + Math.max(0, distance))
  }

  return 0
}

function parseEmbeddingVector(rawEmbedding) {
  if (Array.isArray(rawEmbedding)) return rawEmbedding
  if (ArrayBuffer.isView(rawEmbedding)) return Array.from(rawEmbedding)
  if (typeof rawEmbedding !== 'string') return []

  const trimmed = rawEmbedding.trim()

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    // Handle Postgres array-like fallback, e.g. "{0.1,0.2,...}".
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value))
    }
    return []
  }
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
