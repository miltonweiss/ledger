import { openai } from '@ai-sdk/openai'
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  convertToModelMessages,
  type ModelMessage,
  type UIMessage,
} from 'ai'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findRelevantContent } from '@/lib/embedding'
import personalities from '../../../../prompts'

export const maxDuration = 30
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * RAG tuning
 */
const RAG_TOP_K = 5
const RAG_MIN_SIMILARITY = 0.15
const RAG_MAX_CONTEXT_CHARS = 10_000

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

function getBaseSystemPrompt(personality: number): string {
  const selected = personalities[personality] || personalities[0]
  return selected?.prompt || 'You are a helpful AI assistant.'
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getUserMessageText(message: any): string {
  if (!message || typeof message !== 'object') return ''

  if (Array.isArray(message.parts)) {
    const partsText = message.parts
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => part?.text ?? '')
      .join(' ')
      .trim()
    if (partsText) return partsText
  }

  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content.map((c: any) => c?.text ?? '').join(' ').trim()
  }
  if (typeof message.text === 'string') return message.text

  return ''
}

// ─── RAG: retrieve & format ───────────────────────────────────────────────

interface RagChunk {
  text: string
  score: number
  id: string
  title?: string
}

async function retrieveContext(userText: string): Promise<{
  context: string
  chunks: RagChunk[]
}> {
  console.log('[RAG] retrieveContext: start', {
    userTextLength: userText?.length ?? 0,
    userTextPreview: userText?.trim().slice(0, 80) + (userText?.length > 80 ? '...' : ''),
  })

  if (!userText.trim()) {
    console.log('[RAG] retrieveContext: empty userText, skip retrieval')
    return { context: '', chunks: [] }
  }

  let results: any[]
  try {
      results = await findRelevantContent(userText, supabase, { topK: RAG_TOP_K })
    console.log('[RAG] retrieveContext: findRelevantCo ntent returned', {
      count: results?.length ?? 0,
      rawSample: results?.[0] ? { keys: Object.keys(results[0]), similarity: results[0].similarity ?? results[0].score } : null,
    })
  } catch (err) {
    console.error('[RAG] retrieveContext: Retrieval failed', err)
    return { context: '', chunks: [] }
  }

  if (!results?.length) {
    console.log('[RAG] retrieveContext: no results')
    return { context: '', chunks: [] }
  }

  const beforeFilter = results.map((r: any) => ({
    text: r.text ?? r.content ?? r.metadata?.text ?? '',
    score: Number(r.similarity ?? r.score ?? 0),
    id: r.id ?? r.metadata?.id ?? r.metadata?.documentId ?? '',
    title: r.title ?? r.metadata?.title ?? undefined,
  }))
  const chunks: RagChunk[] = beforeFilter
    .filter((c) => c.score >= RAG_MIN_SIMILARITY && c.text.trim().length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, RAG_TOP_K)

  console.log('[RAG] retrieveContext: after filter/sort/slice', {
    RAG_MIN_SIMILARITY,
    RAG_TOP_K,
    beforeFilterCount: beforeFilter.length,
    afterFilterCount: beforeFilter.filter((c) => c.score >= RAG_MIN_SIMILARITY).length,
    chunksCount: chunks.length,
    chunkScores: chunks.map((c) => c.score.toFixed(3)),
    chunks: chunks.map((c, i) => ({
      index: i + 1,
      score: c.score,
      id: c.id,
      title: c.title,
      text: c.text,
    })),
  })

  if (!chunks.length) {
    console.log('[RAG] retrieveContext: no chunks above threshold')
    return { context: '', chunks: [] }
  }

  let body = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] (score: ${c.score.toFixed(2)})${c.title ? `\nTitle: ${c.title}` : ''}\n${c.text}`
    )
    .join('\n\n---\n\n')

  if (body.length > RAG_MAX_CONTEXT_CHARS) {
    body = body.slice(0, RAG_MAX_CONTEXT_CHARS) + '\n\n[TRUNCATED]'
    console.log('[RAG] retrieveContext: context truncated', { RAG_MAX_CONTEXT_CHARS, bodyLength: body.length })
  }

  const context = `Use the following sources to answer. Cite as [Source X] when used. If none are relevant, ignore them.\n\n${body}`
  console.log('[RAG] retrieveContext: done', {
    contextLength: context.length,
    chunksCount: chunks.length,
    chunksWithText: chunks.map((c, i) => ({ source: i + 1, score: c.score, text: c.text })),
  })

  return { context, chunks }
}

// ─── POST handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log('[RAG] POST: request received')
  try {
    const body = await request.json()
    const { messages = [], personality = 0 } = body

    console.log('[RAG] POST: parsed body', {
      messagesCount: messages?.length ?? 0,
      personality,
    })

    if (!Array.isArray(messages)) {
      return Response.json({ error: 'messages must be an array' }, { status: 400 })
    }

    const validRoles = new Set(['user', 'assistant', 'system', 'tool'])
    const uiMessages = (messages as any[]).filter(
      (m) => m && typeof m === 'object' && validRoles.has(m.role)
    )

    // 1. Base system prompt
    console.log('[RAG] POST: step 1 – selecting personality prompt')
    const baseSystemPrompt = getBaseSystemPrompt(Number(personality))
    console.log('[RAG] POST: baseSystemPrompt length', baseSystemPrompt.length)

    // 2. Extract last user message
    const lastUserIndex = [...uiMessages]
      .map((m) => m.role)
      .lastIndexOf('user')
    const lastUserMessage = lastUserIndex >= 0 ? uiMessages[lastUserIndex] : null
    const userText = lastUserMessage
      ? getUserMessageText(lastUserMessage)
      : ''
    console.log('[RAG] POST: step 2 – last user message', {
      hasLastUserMessage: !!lastUserMessage,
      userTextLength: userText.length,
      userTextPreview: userText.slice(0, 100) + (userText.length > 100 ? '...' : ''),
    })

    // 3. Retrieve (always — let similarity threshold filter)
    console.log('[RAG] POST: step 3 – retrieve RAG context')
    const { context: ragContext, chunks: ragChunks } =
      await retrieveContext(userText)
    console.log('[RAG] POST: RAG result', {
      ragContextLength: ragContext.length,
      ragChunksCount: ragChunks.length,
      ragChunks: ragChunks.map((c, i) => ({ source: i + 1, score: c.score, text: c.text })),
    })

    // 4. Build message array
    const historyUiMessages =
      lastUserIndex >= 0 ? uiMessages.slice(0, lastUserIndex) : uiMessages
    const historyMessages = await convertToModelMessages(historyUiMessages as UIMessage[])
    const latestUserMessages = lastUserMessage
      ? await convertToModelMessages([lastUserMessage] as UIMessage[])
      : []

    const finalMessages: ModelMessage[] = [{ role: 'system', content: baseSystemPrompt }]
    finalMessages.push(...historyMessages)

    if (ragContext) {
      finalMessages.push({ role: 'system', content: ragContext })
    }

    finalMessages.push(...latestUserMessages)

    console.log('[RAG] POST: step 4 – finalMessages', {
      totalMessages: finalMessages.length,
      roles: finalMessages.map((m) => m.role),
    })

    // 5. Stream (AI SDK 6: createUIMessageStream + createUIMessageStreamResponse)
    console.log('[RAG] POST: step 5 – starting stream')
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        console.log('[RAG] POST: execute – writing rag_context to stream', { chunksCount: ragChunks.length })
        writer.write({
          type: 'data-rag_context',
          id: generateId(),
          data: {
            chunks: ragChunks.map((c, i) => ({
              source: i + 1,
              score: c.score,
              id: c.id,
              title: c.title,
              preview: c.text.length > 1000 ? c.text.substring(0, 500) + '...' : c.text,
            })),
          },
        })

        console.log('[RAG] POST: execute – calling streamText (gpt-4.1)')
        const result = streamText({
          model: openai('gpt-4.1'),
          temperature: 0.35,
          maxOutputTokens: 2500,
          messages: finalMessages,
        })

        writer.merge(result.toUIMessageStream())
        console.log('[RAG] POST: execute – merge done')
      },
    })
    return createUIMessageStreamResponse({ stream })
  } catch (error: any) {
    console.error('[RAG] POST: Request error', { message: error?.message, stack: error?.stack })
    return Response.json({ error: error.message }, { status: 500 })
  }
}
