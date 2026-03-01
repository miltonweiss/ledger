import { createYoutubeVideo } from '@/lib/supabase/videos'
import { createYoutubeVideoChunk } from '@/lib/supabase/video_chunks'
import { splitTextFromString } from '@/lib/langchain/textSplit'
import { embedTexts } from '@/lib/supabase/embedding'

export async function POST(req) {
  try {
    const { videoId, title, transcript } = await req.json()

    if (!videoId || !transcript) {
      return Response.json(
        { error: 'videoId and transcript are required' },
        { status: 400 }
      )
    }

    // Step 1: Save the full video + transcript to youtube_videos
    const video = await createYoutubeVideo({
      name: title || videoId,
      text: transcript,
      video_id: videoId,
    })

    if (!video) {
      return Response.json(
        { error: 'Failed to save video to database' },
        { status: 500 }
      )
    }

    // Step 2: Split the transcript into chunks
    const chunks = await splitTextFromString(transcript)

    if (!chunks || chunks.length === 0) {
      return Response.json({ videoId: video.id, chunksCreated: 0 })
    }

    // Step 3: Embed all chunks at once
    const embeddings = await embedTexts(chunks.map((c) => c.pageContent))

    // Step 4: Save each chunk with its embedding to youtube_video_chunks
    const insertResults = await Promise.all(
      chunks.map((chunk, index) =>
        createYoutubeVideoChunk({
          name: video.id,
          content: chunk.pageContent,
          embedding: embeddings[index] ?? [],
          number: index,
        })
      )
    )

    const saved = insertResults.filter(Boolean).length

    return Response.json({ videoId: video.id, chunksCreated: saved })
  } catch (error) {
    console.error('[ingest] Error:', error)
    return Response.json(
      { error: error.message || 'An error occurred during ingestion' },
      { status: 500 }
    )
  }
}
