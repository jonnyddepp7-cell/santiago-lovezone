import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

const HEARTBEAT_INTERVAL = 30000

export function useGamePresence(userId) {
  const currentGame = useRef(null)

  useEffect(() => {
    if (!userId) return

    let active = true

    async function updatePresence() {
      if (!active || document.visibilityState === 'hidden') return

      const game = currentGame.current

      const { error } = await supabase
        .from('game_presence')
        .upsert(
          {
            user_id: userId,
            status: game ? 'playing' : 'online',
            current_game: game,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.error('Games Zone presence update failed:', error.message)
      }
    }

    async function markOffline() {
      await supabase
        .from('game_presence')
        .upsert(
          {
            user_id: userId,
            status: 'offline',
            current_game: null,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
    }

    updatePresence()

    const heartbeat = setInterval(updatePresence, HEARTBEAT_INTERVAL)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updatePresence()
      }
    }

    const handlePageHide = () => {
      markOffline()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      active = false
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
      markOffline()
    }
  }, [userId])

  function setPlayingGame(game) {
    if (game !== null && !['ludo', 'whot'].includes(game)) {
      console.error('Invalid Games Zone game:', game)
      return
    }

    currentGame.current = game

    if (userId) {
      supabase
        .from('game_presence')
        .upsert(
          {
            user_id: userId,
            status: game ? 'playing' : 'online',
            current_game: game,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .then(({ error }) => {
          if (error) {
            console.error('Could not update game status:', error.message)
          }
        })
    }
  }

  return { setPlayingGame }
}
