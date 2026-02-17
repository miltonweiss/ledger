import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

export async function POST(req) {
  try {
    const { values } = await req.json();
    
    if (!values || !Array.isArray(values)) {
      return Response.json(
        { error: 'Invalid input: values must be an array' },
        { status: 400 }
      );
    }

    // Extract pageContent from each chunk if needed
    const pageContents = values.map(chunk => 
      typeof chunk === 'string' ? chunk : chunk.pageContent
    );

    // Use direct OpenAI API with provider instance
    // The openai() function automatically uses OPENAI_API_KEY from environment
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
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
