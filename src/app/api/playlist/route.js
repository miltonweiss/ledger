import { NextResponse } from 'next/server'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

/**
 * Extracts playlist ID from a YouTube playlist URL.
 * Supports: youtube.com/playlist?list=ID, www.youtube.com/playlist?list=ID
 */
function getPlaylistIdFromUrl(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null
  const trimmed = urlOrId.trim()
  // If it looks like a raw playlist ID (starts with PL, etc.), use as-is
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.startsWith('http')) {
    return trimmed
  }
  try {
    const parsed = new URL(trimmed)
    const list = parsed.searchParams.get('list')
    return list || null
  } catch {
    return null
  }
}

/**
 * Fetches one page of playlist items from YouTube Data API v3.
 */
async function fetchPlaylistItemsPage(apiKey, playlistId, pageToken = null) {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: '50',
    key: apiKey
  })
  if (pageToken) params.set('pageToken', pageToken)

  const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })

  if (!res.ok) {
    const body = await res.text()
    let message = body
    try {
      const json = JSON.parse(body)
      message = json?.error?.message || json?.error?.errors?.[0]?.message || body
    } catch (_) {}
    throw new Error(message || `YouTube API error: ${res.status}`)
  }

  return res.json()
}

/**
 * GET /api/playlist?url=... or ?playlistId=...
 * Returns { videoIds: string[], totalResults: number }.
 * Requires env: YOUTUBE_API_KEY (or GOOGLE_API_KEY).
 */
export async function GET(request) {
  const url = request.url
  const { searchParams } = new URL(url)
  const playlistUrlOrId = searchParams.get('url') || searchParams.get('playlistId')

  if (!playlistUrlOrId) {
    return NextResponse.json(
      { message: 'Missing url or playlistId query parameter' },
      { status: 400 }
    )
  }

  const playlistId = getPlaylistIdFromUrl(playlistUrlOrId)
  if (!playlistId) {
    return NextResponse.json(
      { message: 'Invalid playlist URL or playlist ID' },
      { status: 400 }
    )
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Server missing YOUTUBE_API_KEY or GOOGLE_API_KEY' },
      { status: 500 }
    )
  }

  const videoIds = []
  let pageToken = null
  let totalResults = 0

  try {
    do {
      const data = await fetchPlaylistItemsPage(apiKey, playlistId, pageToken)
      totalResults = data.pageInfo?.totalResults ?? 0

      for (const item of data.items || []) {
        const videoId = item?.snippet?.resourceId?.videoId
        if (videoId) videoIds.push(videoId)
      }

      pageToken = data.nextPageToken || null
    } while (pageToken)

    return NextResponse.json({
      videoIds,
      totalResults
    })
  } catch (err) {
    console.error('[API playlist] Error:', err?.message, err)
    const status = err?.message?.includes('404') ? 404 : err?.message?.includes('403') ? 403 : 422
    return NextResponse.json(
      { message: err?.message || 'Could not fetch playlist items' },
      { status }
    )
  }
}
