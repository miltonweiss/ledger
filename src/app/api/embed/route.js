import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

export async function POST(req) {
  try {
    const body = await req.json();
    const model = openai.embedding('text-embedding-3-small');

    if (typeof body?.text === 'string') {
      const text = body.text.trim();
      if (!text) {
        return Response.json(
          { error: 'Invalid input: text must be a non-empty string' },
          { status: 400 }
        );
      }

      const { embeddings } = await embedMany({
        model,
        values: [text],
      });

      return Response.json({ embedding: embeddings?.[0] ?? [] });
    }

    const { values } = body ?? {};
    if (!values || !Array.isArray(values)) {
      return Response.json(
        { error: 'Invalid input: provide text(string) or values(array)' },
        { status: 400 }
      );
    }

    // Extract pageContent from each chunk if needed
    const pageContents = values.map((chunk) =>
      typeof chunk === 'string' ? chunk : chunk?.pageContent
    );

    const { embeddings } = await embedMany({
      model,
      values: pageContents,
    });

    return Response.json({ embeddings });
  } catch (error) {
    console.error('Embedding error:', error);
    return Response.json(
      { error: error.message || 'An error occurred during embedding' },
      { status: 500 }
    );
  }
}
