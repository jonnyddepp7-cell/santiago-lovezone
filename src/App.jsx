
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'
import Friends from './Friends'
import Messages from './Messages'

const games = [
  {
    icon: '💗',
    name: 'Truth or Dare',
    description: 'Discover secrets and have fun.',
    tag: 'POPULAR',
  },
  {
    icon: '💕',
    name: 'Love Quiz',
    description: 'How well do you know each other?',
    tag: 'COUPLES',
  },
  {
    icon: '🎯',
    name: 'Would You Rather',
    description: 'Make difficult and funny choices.',
    tag: 'FUN',
  },
  {
    icon: '💬',
    name: '21 Questions',
    description: 'Ask questions and connect deeper.',
    tag: 'TRENDING',
  },
]

function App() {
  const [activePage, setActivePage] = useState('home')
  const [profile, setProfile] = useState(null)
  const [friendCount, setFriendCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setLoading(true)
      setProfileError('')

      const { data: { user }, error: authError } =
        await supabase.auth.getUser()

      if (authError || !user) {
        if (mounted) {
          setProfile(null)
          setProfileError('Please sign in to view your dashboard.')
          setLoading(false)
        }
        return
      }

      const { data: profileData, error: profileLoadError } =
        await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .maybeSingle()

      const { data: friendsData, error: friendsError } =
        await supabase
          .from('my_friends')
          .select('id')

      if (!mounted) return

      if (profileLoadError) {
        setProfileError('Could not load your profile.')
      } else {
        setProfile({
          name:
            profileData?.display_name ||
            user.user_metadata?.display_name ||
            profileData?.username ||
            user.email?.split('@')[0] ||
            'Lovezone User',
          username: profileData?.username || '',
        })
      }

      if (!friendsError) {
        setFriendCount(friendsData?.length || 0)
      }

      setLoading(false)
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const displayName = profile?.name || 'Lovezone User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">♥</div>
          <div>
            <h2>SANTIAGO</h2>
            <span>LOVEZONE</span>
          </div>
        </div>

        <p className="nav-heading">MENU</p>

        <nav className="navigation">
          <button
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            type="button"
            onClick={() => setActivePage('home')}
          >
            ⌂ <span>Home</span>
          </button>

          <button
            className={`nav-link ${activePage === 'messages' ? 'active' : ''}`}
            type="button"
            onClick={() => setActivePage('messages')}
          >
            ▣ <span>Messages</span>
          </button>

          <button
            className={`nav-link ${activePage === 'friends' ? 'active' : ''}`}
            type="button"
            onClick={() => setActivePage('friends')}
          >
            ♙ <span>Friends</span>
          </button>

          <a className="nav-link" href="#couples">
            ♡ <span>Couples Zone</span>
          </a>

          <a className="nav-link" href="#games">
            ♧ <span>Games Centre</span>
          </a>

          <a className="nav-link" href="#calls">
            ☎ <span>Calls</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-link" href="#settings">
            ⚙ <span>Settings</span>
          </a>

          <div className="profile-mini">
            <div className="avatar purple">{initial}</div>

            <div>
              <strong>{loading ? 'Loading...' : displayName}</strong>
              <small>
                {profile?.username
                  ? `@${profile.username}`
                  : 'My profile'}
              </small>
            </div>

            <button
              type="button"
              aria-label="Sign out"
              onClick={async () => {
                const { error } = await supabase.auth.signOut()

                if (error) {
                  alert(error.message)
                } else {
                  window.location.reload()
                }
              }}
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        {activePage === 'friends' ? (
          <Friends />
        ) : activePage === 'messages' ? (
          <Messages />
        ) : (
          <>
            <header className="topbar">
              <div>
                <h1>
                  {loading
                    ? 'Welcome to Lovezone!'
                    : `Hello, ${displayName}!`} 👋
                </h1>
                <p>Your space to connect, chat, play, and love.</p>
              </div>

              <div className="top-actions">
                <button className="icon-button" aria-label="Notifications">
                  ♧
                </button>
                <div className="avatar purple">{initial}</div>
              </div>
            </header>

            {profileError && (
              <div className="panel">
                <p>{profileError}</p>
              </div>
            )}

            <section className="welcome-banner">
              <div>
                <span className="eyebrow">YOUR SOCIAL SPACE ❤️</span>
                <h2>Connect. Chat. Play. Love.</h2>
                <p>Good conversations create beautiful memories.</p>

                <button
                  type="button"
                  className="banner-button"
                  onClick={() => setActivePage('friends')}
                >
                  Find friends →
                </button>
              </div>

              <div className="banner-heart">💜</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span>💬</span>
                <p>Messages</p>
                <h2>Not available yet</h2>
                <small>Messaging is not connected yet.</small>
              </div>

              <div className="stat-card">
                <span>👥</span>
                <p>Accepted friends</p>
                <h2>{loading ? '...' : friendCount}</h2>
                <small>Based on accepted friend requests.</small>
              </div>

              <div className="stat-card">
                <span>🎮</span>
                <p>Games played</p>
                <h2>Not available yet</h2>
                <small>Game tracking is not connected yet.</small>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel" id="chats">
                <div className="section-heading">
                  <div>
                    <h2>Recent Chats</h2>
                    <p>Your conversations will appear here.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePage('messages')}
                  >
                    Open messages →
                  </button>
                </div>

                <div className="empty-state">
                  <div className="game-icon">💬</div>
                  <h3>No conversations to show</h3>
                  <p>
                    Your real conversations will appear here when you start
                    messaging friends.
                  </p>
                </div>
              </div>

              <div className="panel" id="friends">
                <div className="section-heading">
                  <div>
                    <h2>Your Friends</h2>
                    <p>
                      {friendCount === 1
                        ? 'You have 1 accepted friend.'
                        : `You have ${friendCount} accepted friends.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePage('friends')}
                  >
                    Manage friends →
                  </button>
                </div>

                <div className="empty-state">
                  <div className="game-icon">👥</div>

                  <h3>
                    {friendCount
                      ? 'Your friends are ready'
                      : 'Build your circle'}
                  </h3>

                  <p>
                    {friendCount
                      ? 'Open Friends to view your accepted friends.'
                      : 'Search for people by username and send friend requests.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => setActivePage('friends')}
                  >
                    Find friends →
                  </button>
                </div>
              </div>
            </section>

            <section className="games-section" id="games">
              <div className="section-heading">
                <div>
                  <h2>🎮 Couples Games Centre</h2>
                  <p>Make every moment more exciting together.</p>
                </div>
              </div>

              <div className="games-grid">
                {games.map((game) => (
                  <div className="game-card" key={game.name}>
                    <span className="game-tag">{game.tag}</span>
                    <div className="game-icon">{game.icon}</div>
                    <h3>{game.name}</h3>
                    <p>{game.description}</p>

                    <button
                      type="button"
                      onClick={() =>
                        alert(`${game.name} is not available yet.`)
                      }
                    >
                      Coming soon
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <footer>© 2026 SANTIAGO LOVEZONE · Made with 💜</footer>
          </>
        )}
      </main>
    </div>
  )
}

export default App
