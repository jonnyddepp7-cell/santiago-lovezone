
import { useState } from 'react'
import { supabase } from './supabase'
import './Friends.css'

export default function Friends() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [requests, setRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('search')

  async function searchPeople(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (search.trim().length < 3) {
      setError('Enter at least 3 characters.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.rpc('search_people', {
      search_term: search.trim()
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setResults(data || [])

    if (!data?.length) {
      setMessage('No matching users found.')
    }
  }

  async function sendRequest(userId) {
    setError('')
    setMessage('')

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: (await supabase.auth.getUser()).data.user.id,
        receiver_id: userId
      })

    if (error) {
      setError(error.code === '23505'
        ? 'You have already sent a request to this user.'
        : error.message)
      return
    }

    setMessage('Friend request sent successfully! ❤️')
  }

  async function loadRequests() {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (error) {
      setError(error.message)
      return
    }

    const requestsWithProfiles = await Promise.all(
      (data || []).map(async (request) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .eq('id', request.sender_id)
          .single()

        return { ...request, profile }
      })
    )

    setRequests(requestsWithProfiles)
  }

  async function respondToRequest(id, status) {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(status === 'accepted'
      ? 'Friend request accepted! ❤️'
      : 'Friend request rejected.')

    loadRequests()
  }

  async function loadFriends() {
    setError('')

    const { data, error } = await supabase
      .from('my_friends')
      .select('*')

    if (error) {
      setError(error.message)
      return
    }

    setFriends(data || [])
  }

  function changeTab(nextTab) {
    setTab(nextTab)
    setMessage('')
    setError('')

    if (nextTab === 'requests') loadRequests()
    if (nextTab === 'friends') loadFriends()
  }

  return (
    <section className="friends-page">
      <div className="friends-heading">
        <div>
          <span className="friends-label">YOUR COMMUNITY</span>
          <h1>Friends & Connections ❤️</h1>
          <p>Find people and build meaningful connections.</p>
        </div>
      </div>

      <div className="friends-tabs">
        <button
          className={tab === 'search' ? 'selected' : ''}
          onClick={() => changeTab('search')}
        >
          Find People
        </button>
        <button
          className={tab === 'requests' ? 'selected' : ''}
          onClick={() => changeTab('requests')}
        >
          Requests
        </button>
        <button
          className={tab === 'friends' ? 'selected' : ''}
          onClick={() => changeTab('friends')}
        >
          My Friends
        </button>
      </div>

      {error && <p className="friends-error">{error}</p>}
      {message && <p className="friends-message">{message}</p>}

      {tab === 'search' && (
        <>
          <form className="friends-search" onSubmit={searchPeople}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by username or exact email..."
            />
            <button disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="friends-list">
            {results.map((person) => (
              <div className="friend-card" key={person.id}>
                <div className="friend-avatar">
                  {(person.display_name || person.username)[0].toUpperCase()}
                </div>
                <div className="friend-info">
                  <strong>{person.display_name || 'Lovezone User'}</strong>
                  <span>@{person.username}</span>
                </div>
                <button onClick={() => sendRequest(person.id)}>
                  Add Friend
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="friends-list">
          {requests.length === 0 && (
            <p className="friends-empty">No pending requests.</p>
          )}

          {requests.map((request) => (
            <div className="friend-card" key={request.id}>
              <div className="friend-avatar">♥</div>
              <div className="friend-info">
                <strong>
                  {request.profile?.display_name || 'Lovezone User'}
                </strong>
                <span>@{request.profile?.username}</span>
              </div>
              <button onClick={() => respondToRequest(request.id, 'accepted')}>
                Accept
              </button>
              <button
                className="reject-button"
                onClick={() => respondToRequest(request.id, 'rejected')}
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'friends' && (
        <div className="friends-list">
          {friends.length === 0 && (
            <p className="friends-empty">You haven't added any friends yet.</p>
          )}

          {friends.map((friend) => (
            <div className="friend-card" key={friend.id}>
              <div className="friend-avatar">♥</div>
              <div className="friend-info">
                <strong>{friend.display_name || 'Lovezone User'}</strong>
                <span>@{friend.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
