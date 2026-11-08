
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './LudoBoard.css'

const COLORS = ['red', 'blue', 'green', 'yellow']

const COLOR_NAMES = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow',
}

const START_OFFSETS = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
}

const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47]

const TRACK = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0],
]

const HOME_PATHS = {
  red: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  blue: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  green: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
}

const HOME_SLOTS = {
  red: [[2,2],[2,4],[4,2],[4,4]],
  blue: [[2,10],[2,12],[4,10],[4,12]],
  yellow: [[10,10],[10,12],[12,10],[12,12]],
  green: [[10,2],[10,4],[12,2],[12,4]],
}

const rotatePosition = (position, offset) =>
  (offset + position) % TRACK.length

function LudoBoard({ room, players, userId, onBack, onRefresh }) {
  const [gameState, setGameState] = useState(room?.game_state || {})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dice, setDice] = useState(null)
  const [turnId, setTurnId] = useState(room?.current_turn || null)
  const [winnerId, setWinnerId] = useState(room?.winner_id || null)
  const [rolling, setRolling] = useState(false)

  const myPlayer = players.find(player => player.user_id === userId)
  const currentPlayer = players.find(player => player.user_id === turnId)
  const myTurn = Boolean(turnId && turnId === userId)
  const myColor = myPlayer?.player_color

  const orderedPlayers = useMemo(
    () => [...players].sort(
      (a, b) => COLORS.indexOf(a.player_color) - COLORS.indexOf(b.player_color)
    ),
    [players]
  )

  const syncRoom = useCallback(async () => {
    if (!room?.id) return

    const { data, error } = await supabase
      .from('ludo_rooms')
      .select('game_state, current_turn, winner_id, status')
      .eq('id', room.id)
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data) return

    setGameState(data.game_state || {})
    setTurnId(data.current_turn)
    setWinnerId(data.winner_id)
    setDice(data.game_state?.dice ?? null)

    if (data.status === 'finished') {
      setMessage('The match has finished!')
    }
  }, [room?.id])

  useEffect(() => {
    syncRoom()

    const channel = supabase
      .channel(`ludo-board-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ludo_rooms',
          filter: `id=eq.${room.id}`,
        },
        payload => {
          const updated = payload.new
          setGameState(updated.game_state || {})
          setTurnId(updated.current_turn)
          setWinnerId(updated.winner_id)
          setDice(updated.game_state?.dice ?? null)
        }
      )
      .subscribe()

    const timer = setInterval(syncRoom, 4000)

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [room.id, syncRoom])

  async function rollDice() {
    if (!myTurn || busy || dice !== null || winnerId) return

    setBusy(true)
    setRolling(true)
    setMessage('Rolling dice...')

    const { data, error } = await supabase.rpc('roll_ludo_dice', {
      p_room_id: room.id,
    })

    setRolling(false)

    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }

    const result = Array.isArray(data) ? data[0] : data

    if (result?.dice_result !== undefined) {
      if (result.turn_changed) {
        setDice(null)

        const { data: latestRoom, error: stateError } = await supabase
          .from('ludo_rooms')
          .select('game_state')
          .eq('id', room.id)
          .maybeSingle()

        if (stateError) {
          setMessage(stateError.message)
        } else if (latestRoom?.game_state?.three_sixes_forfeit) {
          setMessage('Three consecutive sixes! Your turn has been forfeited.')
        } else if (latestRoom?.game_state?.no_legal_move) {
          setMessage(
            `You rolled ${result.dice_result}, but none of your tokens can move. Your turn has passed.`
          )
        } else {
          setMessage('Your turn has passed.')
        }
      } else {
        setDice(result.dice_result)
        setMessage(`You rolled ${result.dice_result}. Select a token to move.`)
      }
    }

    await syncRoom()
    setBusy(false)
  }

  async function moveToken(tokenIndex) {
    if (!myTurn || busy || dice === null || winnerId) return

    setBusy(true)
    setMessage('Moving token...')

    const { data, error } = await supabase.rpc('move_ludo_token', {
      p_room_id: room.id,
      p_token_index: tokenIndex,
    })

    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }

    const result = data || {}

    setMessage(
      result.winner
        ? 'Congratulations! You won the match!'
        : result.captured > 0
          ? `Great move! You captured ${result.captured} token(s).`
          : 'Token moved successfully.'
    )

    await syncRoom()
    await onRefresh?.()
    setBusy(false)
  }

  const tokens = gameState?.tokens || {}
  const myPositions = tokens[myColor] || [-1, -1, -1, -1]

  const canMove = tokenIndex => {
    if (!myTurn || dice === null || busy || winnerId) return false

    const position = myPositions[tokenIndex]

    if (position === -1) return dice === 6
    if (position === 58) return false

    return position + dice <= 58
  }

  const tokenAt = (row, col) => {
    const found = []

    COLORS.forEach(color => {
      const positions = tokens[color] || [-1, -1, -1, -1]

      positions.forEach((position, index) => {
        let square = null

        if (position === -1) {
          square = HOME_SLOTS[color][index]
        } else if (position >= 0 && position <= 51) {
          square = TRACK[
            rotatePosition(position, START_OFFSETS[color])
          ]
        } else if (position >= 52 && position <= 57) {
          square = HOME_PATHS[color][position - 52]
        } else if (position === 58) {
          square = [7, 7]
        }

        if (square && square[0] === row && square[1] === col) {
          found.push({ color, index })
        }
      })
    })

    return found
  }

  const getCellClass = (row, col) => {
    const classes = ['ludo-cell']

    if (row <= 5 && col <= 5) classes.push('home-red')
    if (row <= 5 && col >= 9) classes.push('home-blue')
    if (row >= 9 && col >= 9) classes.push('home-yellow')
    if (row >= 9 && col <= 5) classes.push('home-green')

    const trackIndex = TRACK.findIndex(
      point => point[0] === row && point[1] === col
    )

    if (trackIndex !== -1) {
      classes.push('track-cell')

      if (SAFE_SQUARES.some(square =>
        (START_OFFSETS.red + square) % 52 === trackIndex
      )) {
        classes.push('safe-cell')
      }
    }

    COLORS.forEach(color => {
      if (HOME_PATHS[color].some(point =>
        point[0] === row && point[1] === col
      )) {
        classes.push(`home-path-${color}`)
      }
    })

    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
      classes.push('ludo-center')
    }

    return classes.join(' ')
  }

  const renderCell = (row, col) => {
    const trackIndex = TRACK.findIndex(
      point => point[0] === row && point[1] === col
    )

    const homeColor = COLORS.find(color =>
      HOME_PATHS[color].some(point =>
        point[0] === row && point[1] === col
      )
    )

    const trackTokens = tokenAt(row, col)

    return (
      <div
        key={`${row}-${col}`}
        className={getCellClass(row, col)}
      >
        <>
          {row === 7 && col === 7 && (
            <span className="ludo-center-star">★</span>
          )}

          {trackIndex !== -1 && (
            <span className="ludo-square-number">
              {trackIndex + 1}
            </span>
          )}

          {homeColor && (
            <span className={`home-path-dot ${homeColor}`} />
          )}

          {trackTokens.length > 0 && (
            <div className="ludo-cell-tokens">
              {trackTokens.map(token => (
                <span
                  key={`${token.color}-${token.index}`}
                  className={`board-piece ${token.color}`}
                  title={`${COLOR_NAMES[token.color]} token ${token.index + 1}`}
                >
                  {token.index + 1}
                </span>
              ))}
            </div>
          )}
        </>
      </div>
    )
  }

  return (
    <section className="ludo-board-page">
      <header className="ludo-board-header">
        <button type="button" onClick={onBack}>← Room</button>

        <div>
          <span>SANTIAGO LOVEZONE</span>
          <h2>🎲 Ludo Naija</h2>
        </div>

        <button type="button" onClick={syncRoom}>↻ Refresh</button>
      </header>

      <div className="ludo-board-status">
        <div>
          <small>ROOM CODE</small>
          <strong>{room.room_code}</strong>
        </div>
        <div>
          <small>YOUR COLOUR</small>
          <strong className={`board-color-text ${myColor || ''}`}>
            {myColor ? COLOR_NAMES[myColor] : 'Spectator'}
          </strong>
        </div>
        <div>
          <small>GAME STATUS</small>
          <strong>{winnerId ? 'Finished' : 'Playing'}</strong>
        </div>
      </div>

      {message && (
        <div className="ludo-board-message" role="status">{message}</div>
      )}

      <div className="ludo-turn-banner">
        {winnerId ? (
          <strong>
            🏆 {winnerId === userId ? 'You won!' : 'The match is over!'}
          </strong>
        ) : (
          <>
            <strong>
              {myTurn ? '🎯 Your turn!' : `Waiting for ${currentPlayer?.player_color || 'player'}...`}
            </strong>
            <span>{myTurn ? 'Roll the dice to play.' : 'Watch the board for updates.'}</span>
          </>
        )}
      </div>

      <div className="ludo-game-layout">
        <div className="ludo-board-art">
          <div className="ludo-grid">
            {Array.from({ length: 15 }, (_, row) =>
              Array.from({ length: 15 }, (_, col) =>
                renderCell(row, col)
              )
            )}
          </div>
        </div>

        <aside className="ludo-game-controls">
          <div className="ludo-dice-box">
            <small>YOUR DICE</small>
            <div className={`ludo-dice ${rolling ? 'rolling' : ''}`}>
              {dice ?? '🎲'}
            </div>
            <button
              type="button"
              disabled={!myTurn || busy || dice !== null || Boolean(winnerId)}
              onClick={rollDice}
            >
              {busy ? 'Please wait...' : 'Roll dice'}
            </button>
          </div>

          <div className="ludo-token-controls">
            <h3>Your tokens</h3>

            {!myColor ? (
              <p>You are not seated in this room.</p>
            ) : (
              myPositions.map((position, index) => (
                <button
                  type="button"
                  className={`ludo-token-choice ${myColor}`}
                  key={index}
                  disabled={!canMove(index)}
                  onClick={() => moveToken(index)}
                >
                  <span>Token {index + 1}</span>
                  <small>
                    {position === -1
                      ? 'At home'
                      : position === 58
                        ? 'Finished'
                        : position >= 52
                          ? `Home path ${position - 51}`
                          : `Track ${position}`}
                  </small>
                  {canMove(index) && <b>MOVE →</b>}
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <section className="ludo-score-panel">
        <h3>Players</h3>

        {orderedPlayers.map(player => (
          <div className="ludo-score-player" key={player.id}>
            <span className={`ludo-score-dot ${player.player_color}`} />
            <strong>{player.user_id === userId ? 'You' : 'Opponent'}</strong>
            <span>{COLOR_NAMES[player.player_color]}</span>
            <small>
              {(tokens[player.player_color] || [-1, -1, -1, -1])
                .filter(position => position === 58).length} / 4 home
            </small>
            {player.user_id === turnId && <b>TURN</b>}
          </div>
        ))}
      </section>

      <p className="ludo-board-footnote">
        Dice rolls and moves are validated by the game server.
      </p>
    </section>
  )
}

export default LudoBoard
