import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import './GamesZone.css'
import LudoLobby from './LudoLobby'

function GamesZone() {
  const [showLudo, setShowLudo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [onlineFriends, setOnlineFriends] = useState([])
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState(null)

  const loadGamesZone = useCallback(async () => {
    setLoading(true)
    setMessage('')

    const { data: { user }, error: authError } =
      await supabase.auth.getUser()

    if (authError || !user) {
      setMessage('Please sign in to use Games Zone.')
      setLoading(false)
      return
    }

    const [adminResult, memberResult, inviteResult] = await Promise.all([
      supabase.rpc('is_game_zone_admin'),
      supabase.rpc('is_game_zone_member'),
      supabase
        .from('game_zone_invitations')
        .select('id, sender_id, created_at')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])

    if (adminResult.error || memberResult.error) {
      setMessage('Could not verify your Games Zone permissions.')
      setLoading(false)
      return
    }

    setAdmin(Boolean(adminResult.data))
    setMember(Boolean(memberResult.data))

    if (inviteResult.error) {
      setMessage('Could not load your invitations.')
    } else {
      setInvitations(inviteResult.data || [])
    }

    if (memberResult.data || adminResult.data) {
      const { data, error } = await supabase.rpc('get_online_game_friends')

      if (error) {
        setMessage('Could not load online friends: ' + error.message)
      } else {
        setOnlineFriends(data || [])
      }
    } else {
      setOnlineFriends([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadGamesZone()
  }, [loadGamesZone])

  async function respondToInvitation(id, action) {
    setBusyId(id)
    setMessage('')

    const functionName =
      action === 'accept'
        ? 'accept_game_zone_invitation'
        : 'decline_game_zone_invitation'

    const { error } = await supabase.rpc(functionName, {
      invitation_id: id,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(
        action === 'accept'
          ? 'Welcome to Games Zone! Your membership is active.'
          : 'Invitation declined.'
      )
      await loadGamesZone()
    }

    setBusyId(null)
  }

  if (showLudo) {
    return <LudoLobby onBack={() => setShowLudo(false)} />
  }

  if (loading) {
    return (
      <section className="games-zone-page">
        <p>Loading Games Zone...</p>
      </section>
    )
  }

  return (
    <section className="games-zone-page">
      <header className="games-zone-header">
        <div>
          <span className="games-zone-eyebrow">SANTIAGO LOVEZONE</span>
          <h1>🎮 Games Zone</h1>
          <p>Play, compete and create memories with your friends.</p>
        </div>

        <button type="button" onClick={loadGamesZone}>
          ↻ Refresh
        </button>
      </header>

      {message && (
        <div className="games-zone-message" role="status">
          {message}
        </div>
      )}

      {!member && !admin && (
        <section className="games-zone-panel">
          <div className="games-zone-large-icon">💌</div>
          <h2>You're invited to join Games Zone?</h2>
          <p>
            Games Zone is available to invited members. Accept an invitation
            below to unlock online games and play with your friends.
          </p>

          {invitations.length === 0 ? (
            <p className="games-zone-muted">
              You have no pending invitations yet.
            </p>
          ) : (
            <div className="games-zone-invitations">
              {invitations.map((invite) => (
                <article className="games-zone-invite" key={invite.id}>
                  <div>
                    <strong>Games Zone invitation</strong>
                    <small>
                      Received {new Date(invite.created_at).toLocaleString()}
                    </small>
                  </div>

                  <div className="games-zone-actions">
                    <button
                      type="button"
                      disabled={busyId === invite.id}
                      onClick={() =>
                        respondToInvitation(invite.id, 'accept')
                      }
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      className="secondary"
                      disabled={busyId === invite.id}
                      onClick={() =>
                        respondToInvitation(invite.id, 'decline')
                      }
                    >
                      Decline
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {(member || admin) && (
        <>
          <div className="games-zone-membership">
            <span>💜 Games Zone member</span>
            {admin && <strong>Administrator</strong>}
          </div>

          <div className="games-zone-cards">
            <article className="games-zone-card ludo-card">
              <div className="games-zone-card-icon">🎲</div>
              <span className="games-zone-label">MULTIPLAYER</span>
              <h2>Ludo Naija</h2>
              <p>
                Roll the dice, move your four tokens and race your friends
                to victory.
              </p>
              <div className="games-zone-card-footer">
                <span>2–4 players</span>
                <button type="button" onClick={() => setShowLudo(true)}>
                  Play Ludo →
                </button>
              </div>
            </article>

            <article className="games-zone-card whot-card">
              <div className="games-zone-card-icon">🃏</div>
              <span className="games-zone-label">CARD GAME</span>
              <h2>Nigerian Whot</h2>
              <p>
                Match shapes, play special cards and become the first to
                finish your cards.
              </p>
              <div className="games-zone-card-footer">
                <span>2–5 players</span>
                <button type="button" disabled>
                  Coming soon
                </button>
              </div>
            </article>
          </div>

          <section className="games-zone-panel">
            <div className="games-zone-section-heading">
              <div>
                <h2>🟢 Online Friends</h2>
                <p>Only accepted friends who are Games Zone members.</p>
              </div>
              <span>{onlineFriends.length} online</span>
            </div>

            {onlineFriends.length === 0 ? (
              <div className="games-zone-empty">
                <span>👥</span>
                <h3>No friends online right now</h3>
                <p>
                  When your accepted Games Zone friends come online,
                  they'll appear here.
                </p>
              </div>
            ) : (
              <div className="games-zone-friends">
                {onlineFriends.map((friend) => (
                  <article className="games-zone-friend" key={friend.id}>
                    <div className="games-zone-avatar">
                      {(friend.display_name || friend.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                      <span className="online-dot" />
                    </div>

                    <div>
                      <strong>
                        {friend.display_name || friend.username}
                      </strong>
                      <small>
                        {friend.status === 'playing'
                          ? `Playing ${friend.current_game}`
                          : 'Available to play'}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {admin && (
            <section className="games-zone-panel">
              <h2>🛡️ Admin Control</h2>
              <p>
                Your administrator account is recognised. Member invitations
                and management controls will be added next.
              </p>
            </section>
          )}
        </>
      )}
    </section>
  )
}

export default GamesZone
