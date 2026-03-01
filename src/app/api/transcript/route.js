import { NextResponse } from 'next/server'
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

export async function GET(request) {
  const url = request.url
  console.log("[API transcript] GET request, url:", url)
  const { searchParams } = new URL(url)
  const videoId = searchParams.get('videoId')
  console.log("[API transcript] searchParams videoId:", videoId)

  if (!videoId) {
    console.log("[API transcript] missing videoId, returning 400")
    return NextResponse.json({ message: "Missing videoId" }, { status: 400 })
  }

  try {
    console.log("[API transcript] calling YoutubeTranscript.fetchTranscript(", videoId, ")")
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    console.log("[API transcript] fetchTranscript result: isArray:", Array.isArray(transcript), "length:", transcript?.length, "first item:", transcript?.[0])
    return NextResponse.json(transcript, { status: 200 })
  } catch (err) {
    console.error("[API transcript] fetchTranscript error:", err?.message, err)
    return NextResponse.json({ message: err?.message || "Could not fetch transcript" }, { status: 422 })
  }
}