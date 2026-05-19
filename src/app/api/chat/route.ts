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
import { calculateDayStatus, canStopToday, getDefaultDayType, toLocalDateString } from '@/lib/focus-os/day.js'
import { buildTaskCleanerProposal, buildTodayRecommendation } from '@/lib/focus-os/recommendation.js'
import { calculateWeeklyScore, getWeekRange } from '@/lib/focus-os/score.js'

export const maxDuration = 30
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * RAG tuning
 */
const RAG_TOP_K = 5
const RAG_MIN_SIMILARITY = 0.3
const RAG_MAX_CONTEXT_CHARS = 10_000
const FOCUS_CONTEXT_MAX_TASKS = 12

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
    console.log('[RAG] retrieveContext: findRelevantContent returned', {
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

  if (!chunks.length && beforeFilter.length) {
    console.warn('[RAG] retrieveContext: no chunks passed RAG_MIN_SIMILARITY; returning no context', {
      RAG_MIN_SIMILARITY,
      topScores: beforeFilter.slice(0, 5).map((c) => c.score.toFixed(3)),
    })
  }

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

async function getOrCreateFocusLog(date: string) {
  const { data: existing, error: fetchError } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (fetchError) {
    console.error('[Focus OS] daily log fetch failed', fetchError)
    return null
  }

  if (existing) return existing

  const dayType = getDefaultDayType(new Date(`${date}T12:00:00`))
  const status = calculateDayStatus({ dayType } as any)
  const { data, error } = await supabase
    .from('daily_logs')
    .insert([{ date, day_type: dayType, status }])
    .select('*')
    .single()

  if (error) {
    console.error('[Focus OS] daily log create failed', error)
    return null
  }

  return data
}

async function retrieveFocusContext(userText: string) {
  const date = toLocalDateString()
  const dailyLog = await getOrCreateFocusLog(date)
  if (!dailyLog) return null

  const { start, end } = getWeekRange(new Date())
  const startDate = toLocalDateString(start)
  const endDate = toLocalDateString(end)

  const [tasksResult, todaySessionsResult, shutdownResult, weekSessionsResult, weekLogsResult] = await Promise.all([
    supabase.from('tasks').select('*').is('killed_at', null).order('created_at', { ascending: false }),
    supabase.from('focus_sessions').select('*, tasks(*)').eq('daily_log_id', dailyLog.id),
    supabase.from('shutdowns').select('*').eq('daily_log_id', dailyLog.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('focus_sessions').select('*, tasks(*)').gte('started_at', start.toISOString()).lte('started_at', end.toISOString()),
    supabase.from('daily_logs').select('*').gte('date', startDate).lte('date', endDate),
  ])

  if (tasksResult.error) console.error('[Focus OS] tasks fetch failed', tasksResult.error)
  if (todaySessionsResult.error) console.error('[Focus OS] today sessions fetch failed', todaySessionsResult.error)
  if (shutdownResult.error) console.error('[Focus OS] shutdown fetch failed', shutdownResult.error)
  if (weekSessionsResult.error) console.error('[Focus OS] week sessions fetch failed', weekSessionsResult.error)
  if (weekLogsResult.error) console.error('[Focus OS] week logs fetch failed', weekLogsResult.error)

  const tasks = tasksResult.data || []
  const todaySessions = normalizeSessions(todaySessionsResult.data || [])
  const weekSessions = normalizeSessions(weekSessionsResult.data || [])
  const mainTask = tasks.find((task: any) => task.id === dailyLog.main_block_task_id) || null
  const sideTask = tasks.find((task: any) => task.id === dailyLog.side_block_task_id) || null
  const status = calculateDayStatus({
    dayType: dailyLog.day_type,
    energy: dailyLog.energy_am,
    guilt: dailyLog.guilt_am,
    mainBlockDone: dailyLog.main_block_done || mainTask?.done,
    shutdownDone: dailyLog.shutdown_done,
    override: dailyLog.status_override,
  } as any)
  const recommendation = buildTodayRecommendation(tasks, { today: date, dayType: dailyLog.day_type, status })
  const weeklyScore = calculateWeeklyScore({ sessions: weekSessions, dailyLogs: weekLogsResult.data || [], today: new Date() })
  const stopPermission = canStopToday({
    dailyLog: { ...dailyLog, status },
    shutdown: shutdownResult.data,
    mainTask,
    dayType: dailyLog.day_type,
    focusSessions: todaySessions,
  })

  return {
    date,
    dailyLog: { ...dailyLog, status },
    tasks,
    mainTask,
    sideTask,
    recommendation,
    weeklyScore,
    stopPermission,
    shutdown: shutdownResult.data,
    userText,
  }
}

function buildFocusSystemContext(focus: any): string {
  if (!focus) return ''

  const taskLines = focus.tasks
    .filter((task: any) => !task.done && !task.killed_at)
    .slice(0, FOCUS_CONTEXT_MAX_TASKS)
    .map((task: any) => {
      return `- ${task.name} (id: ${task.id}, area: ${task.area || 'unset'}, work_type: ${task.work_type || 'unset'}, block_type: ${task.block_type || 'unset'}, energy: ${task.energy_required || 'unset'}, due: ${task.due || 'none'}, done: ${task.done ? 'yes' : 'no'}, definition_of_done: ${task.definition_of_done || 'missing'})`
    })
    .join('\n')

  return `Focus OS context for today:
Date: ${focus.date}
Day type: ${focus.dailyLog.day_type}
Status: ${focus.dailyLog.status}
Main block: ${focus.mainTask?.name || focus.recommendation?.mainBlock?.name || 'none'}
Side block: ${focus.sideTask?.name || focus.recommendation?.sideBlock?.name || 'none'}
Shutdown done: ${focus.dailyLog.shutdown_done ? 'yes' : 'no'}
Stop permission: ${focus.stopPermission.allowed ? 'allowed' : 'not yet'} — ${focus.stopPermission.message}
Weekly: WSO ${focus.weeklyScore.wsoHours}/${focus.weeklyScore.wsoTarget}h, Cash ${focus.weeklyScore.cashSessions}/${focus.weeklyScore.cashTarget}, Freelance ${focus.weeklyScore.freelanceHours}/max ${focus.weeklyScore.freelanceMax}h, Gym ${focus.weeklyScore.gymSessions}/${focus.weeklyScore.gymTarget}, Status ${focus.weeklyScore.status}
Fake work signal: ${focus.weeklyScore.fakeWork.active ? focus.weeklyScore.fakeWork.message : 'none'}

Open tasks:
${taskLines || '- No open tasks'}

Answer Focus OS questions in English, concretely, and keep the day smaller than the user's guilt wants. You may propose task/day changes, but you must not claim they are applied until the user applies the proposal.`
}

function buildFocusProposal(userText: string, focus: any) {
  if (!focus) return null
  const lower = userText.toLowerCase()
  const wantsShrink = /shrink today|shrink|mach meinen plan kleiner|clean/.test(lower)
  const wantsClarify = /clarify task|clarify|unclear/.test(lower)
  const wantsFakeProd = /find fake productivity|fake work|fake productivity/.test(lower)
  const wantsShutdownCoach = /shutdown coach|reflect|shutdown/.test(lower)

  if (wantsShrink) {
    const proposal = buildTaskCleanerProposal(focus.tasks, {
      today: focus.date,
      dayType: focus.dailyLog.day_type,
      capacityMode: focus.dailyLog.capacity_mode,
    })
    return {
      ...proposal,
      kind: 'shrink_today',
      title: 'Shrink Today',
      summary: 'Keep the useful work, cut the noise, and move anything that does not fit today.',
      daily_log_id: focus.dailyLog.id,
      date: focus.date,
      keep_tasks: focus.tasks.filter((task: any) => proposal.keep_task_ids?.includes(task.id)).map(minTask),
      cut_tasks: focus.tasks.filter((task: any) => proposal.cut_task_ids?.includes(task.id)).map(minTask),
      kill_tasks: focus.tasks.filter((task: any) => proposal.kill_task_ids?.includes(task.id)).map(minTask),
      move_task_names: focus.tasks.filter((task: any) => proposal.move_tasks?.some((move: any) => move.id === task.id)).map(minTask),
    }
  }

  // Notice: The other 3 commands (Clarify, Fake Productivity, Shutdown Coach) 
  // do not currently generate a strict FocusProposal structure yet, 
  // but they could be answered textually by the AI since they are standard questions.
  // We can return a proposal object for them later if we build a UI for them.

  return null
}

function normalizeSessions(sessions: any[]) {
  return sessions.map((session) => ({ ...session, task: session.task || session.tasks || null }))
}

function minTask(task: any) {
  return { id: task.id, name: task.name }
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
    const [{ context: ragContext, chunks: ragChunks }, focusContext] =
      await Promise.all([retrieveContext(userText), retrieveFocusContext(userText)])
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

    const focusSystemContext = buildFocusSystemContext(focusContext)
    if (focusSystemContext) {
      finalMessages.push({ role: 'system', content: focusSystemContext })
    }

    finalMessages.push(...latestUserMessages)

    console.log('[RAG] POST: step 4 – finalMessages', {
      totalMessages: finalMessages.length,
      roles: finalMessages.map((m) => m.role),
    })

    // 5. Stream (AI SDK 6: createUIMessageStream + createUIMessageStreamResponse)
    console.log('[RAG] POST: step 5 – starting stream')
    const focusProposal = buildFocusProposal(userText, focusContext)
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

        if (focusProposal) {
          writer.write({
            type: 'data-focus_proposal',
            id: generateId(),
            data: focusProposal,
          })
        }

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
