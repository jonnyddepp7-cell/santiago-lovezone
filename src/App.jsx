
import { useState } from 'react'
import './App.css'
import Friends from './Friends'

const chats = [
  { name: 'Sophia Williams', message: 'I miss you already ❤️', time: '10:42', avatar: 'S', color: 'pink', unread: 2 },
  { name: 'Daniel James', message: 'Are we playing tonight?', time: '09:35', avatar: 'D', color: 'purple', unread: 1 },
  { name: 'Amara Johnson', message: 'Thank you so much 😊', time: 'Yesterday', avatar: 'A', color: 'orange', unread: 0 },
  { name: 'Michael Brown', message: 'Send me the pictures!', time: 'Yesterday', avatar: 'M', color: 'blue', unread: 0 },
]

const games = [
  { icon: '💗', name: 'Truth or Dare', description: 'Discover secrets and have fun.', tag: 'POPULAR' },
  { icon: '💕', name: 'Love Quiz', description: 'How well do you know each other?', tag: 'COUPLES' },
  { icon: '🎯', name: 'Would You Rather', description: 'Make difficult and funny choices.', tag: 'FUN' },
  { icon: '💬', name: '21 Questions', description: 'Ask questions and connect deeper.', tag: 'TRENDING' },
]

function App() {
  const [activePage, setActivePage] = useState('home')

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

          <a className="nav-link" href="#chats">
            ▣ <span>Messages</span><b>3</b>
          </a>

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
            <div className="avatar purple">S</div>
            <div>
              <strong>Santiago</strong>
              <small>My profile</small>
            </div>
            <span>•••</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        {activePage === 'friends' ? (
          <Friends />
        ) : (
          <>
            <header className="topbar">
              <div>
                <h1>Good morning, Santiago! 👋</h1>
                <p>Welcome to your happy place. Let's connect today.</p>
              </div>

              <div className="top-actions">
                <button className="icon-button" aria-label="Notifications">
                  ♧
                </button>
                <div className="avatar purple">S</div>
              </div>
            </header>

            <section className="welcome-banner">
              <div>
                <span className="eyebrow">YOUR SOCIAL SPACE ❤️</span>
                <h2>Connect. Chat. Play. Love.</h2>
                <p>Good conversations create beautiful memories.</p>
                <a href="#chats" className="banner-button">
                  Start chatting →
                </a>
              </div>

              <div className="banner-heart">💜</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span>💬</span>
                <p>Total messages</p>
                <h2>128</h2>
              </div>

              <div className="stat-card">
                <span>👥</span>
                <p>Friends online</p>
                <h2>12</h2>
              </div>

              <div className="stat-card">
                <span>🎮</span>
                <p>Games played</p>
                <h2>24</h2>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel" id="chats">
                <div className="section-heading">
                  <div>
                    <h2>Recent Chats</h2>
                    <p>Your latest conversations</p>
                  </div>
                  <a href="#chats">View all →</a>
                </div>

                <div className="chat-list">
                  {chats.map((chat) => (
                    <div className="chat-item" key={chat.name}>
                      <div className={`avatar ${chat.color}`}>
                        {chat.avatar}
                      </div>

                      <div className="chat-details">
                        <strong>{chat.name}</strong>
                        <p>{chat.message}</p>
                      </div>

                      <div className="chat-meta">
                        <small>{chat.time}</small>
                        {chat.unread > 0 && (
                          <span className="unread">{chat.unread}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" id="friends">
                <div className="section-heading">
                  <div>
                    <h2>Online Friends</h2>
                    <p>People ready to chat</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePage('friends')}
                  >
                    See all →
                  </button>
                </div>

                <div className="online-friends">
                  {['Sophia', 'Daniel', 'Amara', 'Michael'].map((friend, index) => (
                    <div className="friend" key={friend}>
                      <div className={`avatar ${['pink', 'purple', 'orange', 'blue'][index]}`}>
                        {friend[0]}
                        <i className="online-dot"></i>
                      </div>
                      <strong>{friend}</strong>
                      <small>Online</small>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="games-section" id="games">
              <div className="section-heading">
                <div>
                  <h2>🎮 Couples Games Centre</h2>
                  <p>Make every moment more exciting together.</p>
                </div>
                <a href="#games">Explore games →</a>
              </div>

              <div className="games-grid">
                {games.map((game) => (
                  <div className="game-card" key={game.name}>
                    <span className="game-tag">{game.tag}</span>
                    <div className="game-icon">{game.icon}</div>
                    <h3>{game.name}</h3>
                    <p>{game.description}</p>
                    <button
                      onClick={() => alert(`${game.name} is coming soon!`)}
                    >
                      Play now →
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
