import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'
import { corsHeaders } from '../_shared/cors.ts'

const FREE_DAILY_LIMIT = 20

const STYLE_INSTRUCTIONS: Record<string, string> = {
  Encouraging: 'Be warm, positive, and motivating. Celebrate progress and frame corrections gently.',
  Technical:   'Be detailed and analytical. Focus on mechanics, muscle memory, and specific technique. Use musical terminology freely.',
  Direct:      'Be concise and to the point. Skip pleasantries. Give the fix, nothing more.',
  Balanced:    'Mix encouragement with honest critique. Be warm but specific.',
}

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const anthropicKey  = Deno.env.get('ANTHROPIC_API_KEY')
    const supabaseUrl   = Deno.env.get('SUPABASE_URL')
    const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set')

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')

    let userId: string | null = null
    let isPro = false

    if (jwt && supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey)
      const { data: { user } } = await supabase.auth.getUser(jwt)
      userId = user?.id ?? null

      if (userId) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, plan')
          .eq('user_id', userId)
          .maybeSingle()
        isPro = sub?.status === 'active' && sub?.plan !== 'free'
      }
    }

    // ── Rate limiting (free users only) ───────────────────────────────────────
    if (userId && !isPro) {
      const kv  = await Deno.openKv()
      const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const key = ['coach_rate', userId, day]
      const current = await kv.get<number>(key)
      const count = current.value ?? 0

      if (count >= FREE_DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ error: 'Daily coaching limit reached. Upgrade to Pro for unlimited conversations.' }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...CORS } },
        )
      }

      await kv.set(key, count + 1, { expireIn: 86_400_000 }) // 24 h TTL
    }

    // ── Request body ──────────────────────────────────────────────────────────
    const { message, context, history } = await req.json()
    const { pieceTitle, pieceComposer, instrument, flags, activeFlag, coachingStyle } = context ?? {}

    const flagsSummary = Array.isArray(flags) && flags.length > 0
      ? flags.map((f: Record<string, unknown>) =>
          `- m.${f.measure} (${f.type}): ${f.title ?? ''} — ${f.body ?? ''}`
        ).join('\n')
      : 'No issues flagged.'

    const activeFlagLine = activeFlag
      ? `\nThe student is currently asking about: measure ${activeFlag.measure}, issue type "${activeFlag.type}" — "${activeFlag.title}".`
      : ''

    const styleKey = (coachingStyle ?? 'Balanced') as string
    const styleInstruction = STYLE_INSTRUCTIONS[styleKey] ?? STYLE_INSTRUCTIONS.Balanced

    const systemPrompt = [
      `You are an expert ${instrument ?? 'musician'} teacher providing one-on-one coaching.`,
      `The student just performed: "${pieceTitle ?? 'a piece'}"${pieceComposer ? ` by ${pieceComposer}` : ''}.`,
      `\nAnalysis flagged these issues:\n${flagsSummary}`,
      activeFlagLine,
      `\nCoaching style: ${styleInstruction}`,
      'Keep responses to 2–4 sentences unless a longer explanation is clearly needed.',
      'Focus on technique and musicality, not theory for its own sake.',
    ].join(' ')

    const priorMessages = Array.isArray(history)
      ? history.map((m: Record<string, string>) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      : []

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     systemPrompt,
      messages:   [...priorMessages, { role: 'user', content: message }],
    })

    const reply = (response.content[0] as { type: string; text: string })?.text ?? ''
    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    console.error('[coach-chat]', (err as Error).message)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } },
    )
  }
})
