import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import './LudoLobby.css'

function LudoLobby({ onBack }) {
  const [userId, setUserId] = useState(null)
  const [friends, setFriends] = useState([])
  const [invitations, setInvitations] = useState([])
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [roomCode, setRoomCode] = useState('')
  const [selectedFriend, setSelectedFriend] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const loadRoom = useCallback(async (roomId) => {
    if (!roomId) return

    const { data: roomData, error: roomError } = await supabase
      .from('ludo_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle()

    if (roomError) {
      setMessage(roomError.message)
      return
    }

    if (!roomData) {
      setRoom(null)
      setPlayers([])
      return
    }

    const { data: playerData, error: playerError } = await supabase
      .from('ludo_players')
      .select('id, user_id, player_color, joined_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })

    if (playerError) {
      setMessage(playerError.message)
      return
    }

    setRoom(roomData)
    setPlayers(playerData || [])
  }, [])

  const refresh = useCallback(async () => {
    const { data: { user }, error: authError } =
      await supabase.auth.getUser()

    if (authError || !user) {
      setMessage('Please sign in to play Ludo.')
      setLoading(false)
      return
    }

    setUserId(user.id)

    const [friendResult, invitationResult] = await Promise.all([
      supabase.from('my_friends').select('id, username, display_name'),
      supabase
        .from('ludo_room_invitations')
        .select('id, room_id, sender_id, created_at')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])

    if (friendResult.error) {
      setMessage('Could not load your friends: ' + friendResult.error.message)
    } else {
      setFriends(friendResult.data || [])
    }

    if (invitationResult.error) {
      setMessage('Could not load invitations: ' + invitationResult.error.message)
    } else {
      setInvitations(invitationResult.data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!room?.id) return

    const timer = setInterval(() => {
      loadRoom(room.id)
    }, 5000)

    return () => clearInterval(timer)
  }, [room?.id, loadRoom])

  async function createRoom() {
    setBusy(true)
    setMessage('')

    const { data, error } = await supabase.rpc('create_ludo_room', {
      p_max_players: Number(maxPlayers),
    })

    if (error) {
      setMessage(error.message)
    } else {
      const created = Array.isArray(data) ? data[0] : data
      if (created?.room_id) {
        await loadRoom(created.room_id)
        setMessage('Your Ludo room has been created!')
      } else {
        setMessage('Room created, but its details could not be loaded. Refresh and try again.')
      }
    }

    setBusy(false)
  }

  async function joinRoom() {
    if (!roomCode.trim()) {
      setMessage('Enter a room code first.')
      return
    }

    setBusy(true)
    setMessage('')

    const { data, error } = await supabase.rpc('join_ludo_room_by_code', {
      p_room_code: roomCode.trim().toUpperCase(),
    })

    if (error) {
      setMessage(error.message)
    } else {
      await loadRoom(data)
      setMessage('You joined the Ludo room!')
      setRoomCode('')
    }

    setBusy(false)
  }

  async function inviteFriend() {
    if (!room?.id || !selectedFriend) {
      setMessage('Choose a friend to invite.')
      return
    }

    setBusy(true)
    setMessage('')

    const { error } = await supabase.rpc('invite_ludo_friend', {
      p_room_id: room.id,
      p_friend_id: selectedFriend,
    })

    setMessage(error ? error.message : 'Invitation sent!')
    setBusy(false)
  }

  async function respondToInvitation(invitationId, action) {
    setBusy(true)
    setMessage('')

    const functionName = action === 'accept'
      ? 'accept_ludo_invitation'
      : 'decline_ludo_invitation'

    const { data, error } = await supabase.rpc(functionName, {
      p_invitation_id: invitationId,
    })

    if (error) {
      setMessage(error.message)
    } else if (action === 'accept') {
      await loadRoom(data)
      setMessage('Invitation accepted. Welcome to the room!')
    } else {
      setMessage('Invitation declined.')
    }

    await refresh()
    setBusy(false)
  }

  async function copyRoomCode() {
    if (!room?.room_code) return

    try {
      await navigator.clipboard.writeText(room.room_code)
      setMessage('Room code copied!')
    } catch {
      setMessage('Your room code is: ' + room.room_code)
    }
  }

  if (loading) {
    return <section className="ludo-page"><p>Loading Ludo Naija...</p></section>
  }

  return (
    <section className="ludo-page">
      <header className="ludo-header">
        <button className="ludo-back" type="button" onClick={onBack}>
          ← Games Zone
        </button>
        <div>
          <span className="ludo-eyebrow">SANTIAGO LOVEZONE</span>
          <h1>🎲 Ludo Naija</h1>
          <p>Invite your friends. Roll the dice. Win together.</p>
        </div>
        <button type="button" className="ludo-refresh" onClick={refresh}>
          ↻ Refresh
        </button>
      </header>

      {message && <div className="ludo-message" role="status">{message}</div>}

      {room ? (
        <section className="ludo-panel">
          <div className="ludo-room-heading">
            <div>
              <span className="ludo-eyebrow">PRIVATE ROOM</span>
              <h2>Room {room.room_code}</h2>
              <p>
                {players.length} of {room.max_players} players joined
              </p>
            </div>
            <button type="button" onClick={copyRoomCode}>Copy code</button>
          </div>

          <div className="ludo-player-list">
            {players.map((player) => {
              const friend = friends.find((item) => item.id === player.user_id)
              const isYou = player.user_id === userId

              return (
                <div className="ludo-player" key={player.id}>
                  <span className={`ludo-color ${player.player_color}`} />
                  <div>
                    <strong>
                      {isYou ? 'You' : friend?.display_name || friend?.username || 'Player'}
                    </strong>
                    <small>{player.player_color.toUpperCase()}</small>
                  </div>
                  {isYou && <span className="ludo-you">YOU</span>}
                </div>
              )
            })}
            {Array.from({ length: Math.max(0, room.max_players - players.length) }).map((_, index) => (
              <div className="ludo-player ludo-empty-seat" key={index}>
                <span className="ludo-color empty" />
                <div><strong>Waiting for player</strong><small>Open seat</small></div>
              </div>
            ))}
          </div>

          <div className="ludo-invite-controls">
            <h3>Invite an accepted friend</h3>
            <div className="ludo-inline-controls">
              <select
                value={selectedFriend}
                onChange={(event) => setSelectedFriend(event.target.value)}
              >
                <option value="">Select a friend</option>
                {friends
                  .filter((friend) => !players.some((player) => player.user_id === friend.id))
                  .map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.display_name || friend.username}
                    </option>
                  ))}
              </select>
              <button type="button" disabled={busy} onClick={inviteFriend}>
                Send invite
              </button>
            </div>
          </div>

          <p className="ludo-waiting-note">
            Share the room code with friends or invite them directly.
            The playable board is the next build step.
          </p>

          <button
            type="button"
            className="ludo-secondary"
            onClick={() => {
              setRoom(null)
              setPlayers([])
              setMessage('')
            }}
          >
            Leave lobby view
          </button>
        </section>
      ) : (
        <div className="ludo-options">
          <section className="ludo-panel">
            <div className="ludo-option-icon">🏠</div>
            <h2>Create a private room</h2>
            <p>Start a room and invite friends to join your game.</p>
            <label htmlFor="ludo-player-count">Number of players</label>
            <select
              id="ludo-player-count"
              value={maxPlayers}
              onChange={(event) => setMaxPlayers(event.target.value)}
            >
              <option value="2">2 players</option>
              <option value="4">4 players</option>
            </select>
            <button type="button" disabled={busy} onClick={createRoom}>
              {busy ? 'Please wait...' : 'Create room'}
            </button>
          </section>

          <section className="ludo-panel">
            <div className="ludo-option-icon">🔑</div>
            <h2>Join with a room code</h2>
            <p>Enter the private code shared by your friend.</p>
            <label htmlFor="ludo-room-code">Room code</label>
            <input
              id="ludo-room-code"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ENTER ROOM CODE"
              maxLength={8}
            />
            <button type="button" disabled={busy} onClick={joinRoom}>
              {busy ? 'Please wait...' : 'Join room'}
            </button>
          </section>
        </div>
      )}

      <section className="ludo-panel">
        <div className="ludo-section-heading">
          <div>
            <h2>💌 Game invitations</h2>
            <p>Invitations from your accepted friends.</p>
          </div>
          <span>{invitations.length} pending</span>
        </div>

        {invitations.length === 0 ? (
          <p className="ludo-muted">No pending Ludo invitations.</p>
        ) : (
          <div className="ludo-invitation-list">
            {invitations.map((invite) => (
              <article className="ludo-invitation" key={invite.id}>
                <div>
                  <strong>Ludo room invitation</strong>
                  <small>{new Date(invite.created_at).toLocaleString()}</small>
                </div>
                <div className="ludo-invitation-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => respondToInvitation(invite.id, 'accept')}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="ludo-secondary"
                    disabled={busy}
                    onClick={() => respondToInvitation(invite.id, 'decline')}
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default LudoLobby
