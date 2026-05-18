import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_INDEXER_BASE_URL = 'http://127.0.0.1:8000';

function getIndexerEndpoint() {
  const baseUrl = (process.env.INDEXER_API_URL || DEFAULT_INDEXER_BASE_URL).trim();
  return `${baseUrl.replace(/\/+$/, '')}/index-markdown`;
}

function getTimeoutMs() {
  const parsed = Number(process.env.INDEXER_TIMEOUT_MS || 60000);
  if (!Number.isFinite(parsed) || parsed <= 0) return 60000;
  return parsed;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const documentId = typeof body?.document_id === 'string' ? body.document_id.trim() : '';
    const category = typeof body?.category === 'string' ? body.category.trim() : '';
    const markdown = typeof body?.markdown === 'string' ? body.markdown : '';

    if (!documentId || !category || !markdown.trim()) {
      return NextResponse.json(
        { error: 'document_id, category, and markdown are required.' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

    let response;
    try {
      response = await fetch(getIndexerEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          category,
          markdown,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.detail || payload?.error || 'Indexer service request failed.';
      return NextResponse.json(
        { error: typeof detail === 'string' ? detail : JSON.stringify(detail) },
        { status: response.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Indexer request timed out.' },
        { status: 504 }
      );
    }

    console.error('Index markdown proxy error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to contact indexer service.' },
      { status: 500 }
    );
  }
}
