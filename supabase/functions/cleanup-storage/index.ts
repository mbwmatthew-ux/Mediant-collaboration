import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deletes video/score files for takes older than RETENTION_DAYS.
// The takes row itself is kept — only the storage blobs are removed.
// Schedule via Supabase pg_cron:
//   select cron.schedule('cleanup-storage', '0 3 * * *',
//     $$select net.http_post(
//       url := '<SUPABASE_URL>/functions/v1/cleanup-storage',
//       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//     )$$);

const RETENTION_DAYS = 30
const CORS = { 'Access-Control-Allow-Origin': '*' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: CORS })
  }

  // Verify request is from a trusted source (service role key in header)
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fetch old takes that still have storage paths
  const { data: oldTakes, error } = await admin
    .from('takes')
    .select('id, video_path, score_path')
    .lt('created_at', cutoff)
    .or('video_path.not.is.null,score_path.not.is.null')
    .limit(200)

  if (error) {
    console.error('[cleanup-storage] DB query failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
  }

  if (!oldTakes?.length) {
    return new Response(JSON.stringify({ deleted: 0, message: 'Nothing to clean up' }), { headers: CORS })
  }

  let deletedFiles = 0
  const videoPaths = oldTakes.map(t => t.video_path).filter(Boolean)
  const scorePaths = oldTakes.map(t => t.score_path).filter(Boolean)

  if (videoPaths.length) {
    const { error: ve } = await admin.storage.from('recordings').remove(videoPaths)
    if (ve) console.warn('[cleanup-storage] video delete error:', ve.message)
    else deletedFiles += videoPaths.length
  }

  if (scorePaths.length) {
    const { error: se } = await admin.storage.from('sheet-music').remove(scorePaths)
    if (se) console.warn('[cleanup-storage] score delete error:', se.message)
    else deletedFiles += scorePaths.length
  }

  // Null out the paths so we don't re-attempt deletion on the next run
  const ids = oldTakes.map(t => t.id)
  await admin.from('takes').update({ video_path: null, score_path: null }).in('id', ids)

  console.log(`[cleanup-storage] cleaned ${ids.length} takes, deleted ${deletedFiles} files`)
  return new Response(
    JSON.stringify({ deleted: deletedFiles, takes: ids.length }),
    { headers: { 'Content-Type': 'application/json', ...CORS } },
  )
})
