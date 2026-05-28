import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Loads the user's takes from Supabase.
 * Returns undefined while loading, [] when done with no results.
 * Falls back to localStorage when unauthenticated.
 */
export function useTakes({ limit } = {}) {
  const { user } = useAuth()
  const [takes, setTakes] = useState(undefined)

  useEffect(() => {
    if (!user?.id) {
      try {
        const stored = JSON.parse(localStorage.getItem('mediant_takes') || '[]')
        setTakes(Array.isArray(stored) ? stored : [])
      } catch {
        setTakes([])
      }
      return
    }

    setTakes(undefined)

    let query = supabase
      .from('takes')
      .select('id, piece_title, piece_composer, instrument, score, flags, analysis_quality, analysis_backend, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (limit) query = query.limit(limit)

    query.then(({ data, error }) => {
      if (error) {
        console.error('[useTakes]', error.message)
        setTakes([])
      } else {
        setTakes(data ?? [])
      }
    })
  }, [user?.id, limit])

  return takes
}
