
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import './Messages.css'

export default function Messages() {
  const [friends, setFriends] = useState([])
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [unread, setUnread] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const knownMessageIds = useRef(new Set())

  useEffect(() => {
    loadFriends()
    loadUnread()

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const channel = supabase
      .channel('all-new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        payload => {
          const message = payload.new

          if (knownMessageIds.current.has(message.id)) return
          knownMessageIds.current.add(message.id)

          if (message.sender_id === currentUserId.current) return

          if (message.conversation_id === conversationIdRef.current) {
            loadMessages(message.conversation_id)
            markRead(message.conversation_id)
          } else {
            loadUnread()
            showNotification(message.content)
            playNotificationSound()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const currentUserId = useRef(null)
  const conversationIdRef = useRef(null)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      currentUserId.current = data.user?.id || null
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadFriends() {
    setLoading(true)
    const { data, error } = await supabase
      .from('my_friends')
      .select('id, username, display_name')

    if (error) setError(error.message)
    else setFriends(data || [])

    setLoading(false)
  }

  async function loadUnread() {
    const { data, error } = await supabase.rpc(
      'get_unread_message_count'
    )

    if (!error) {
      setUnread({ total: Number(data || 0) })
    }
  }

  async function markRead(id) {
    const { error } = await supabase.rpc(
      'mark_conversation_read',
      { target_conversation_id: id }
    )

    if (!error) loadUnread()
  }

  async function openConversation(friend) {
    setSelectedFriend(friend)
    setConversationId(null)
    conversationIdRef.current = null
    setMessages([])
    setError('')
    setLoading(true)

    const { data, error } = await supabase.rpc(
      'create_direct_conversation',
      { friend_user_id: friend.id }
    )

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setConversationId(data)
    conversationIdRef.current = data

    await loadMessages(data)
    await markRead(data)
    setLoading(false)
  }

  async function loadMessages(id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setMessages(data || [])
    data?.forEach(message => knownMessageIds.current.add(message.id))
  }

  function showNotification(content) {
    if (
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('SANTIAGO LOVEZONE 💜', {
        body: content,
        icon: '/favicon.ico',
      })
    }
  }

  function playNotificationSound() {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      )
      audio.play().catch(() => {})
    } catch {}
  }

  async function sendMessage(event) {
    event.preventDefault()

    const content = messageText.trim()
    if (!content || !conversationId || sending) return

    setSending(true)
    setError('')

    const { data: { user }, error: userError } =
      await supabase.auth.getUser()

    if (userError || !user) {
      setError('Please sign in again.')
      setSending(false)
      return
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessageText('')
      await loadMessages(conversationId)
    }

    setSending(false)
  }

  return (
    <section className="messages-page">
      <div className="messages-sidebar">
        <h2>Messages 💬</h2>
        <p>Your real conversations</p>

        {Number(unread.total) > 0 && (
          <p className="unread-total">
            {unread.total} unread message{unread.total === 1 ? '' : 's'}
          </p>
        )}

        {loading && !selectedFriend && <p>Loading friends...</p>}

        {!loading && friends.length === 0 && (
          <p>You have no accepted friends yet.</p>
        )}

        {friends.map(friend => (
          <button
            type="button"
            className={`message-friend ${
              selectedFriend?.id === friend.id ? 'selected' : ''
            }`}
            key={friend.id}
            onClick={() => openConversation(friend)}
          >
            <span className="message-avatar">
              {(friend.display_name || friend.username || '?')
                .charAt(0).toUpperCase()}
            </span>

            <span>
              <strong>{friend.display_name || friend.username}</strong>
              <small>@{friend.username}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="conversation-panel">
        {!selectedFriend ? (
          <div className="messages-empty">
            <h2>Welcome to Messages 💜</h2>
            <p>Select an accepted friend to start a conversation.</p>
          </div>
        ) : (
          <>
            <header className="conversation-header">
              <h3>{selectedFriend.display_name || selectedFriend.username}</h3>
              <small>@{selectedFriend.username}</small>
            </header>

            {error && <p className="messages-error">{error}</p>}

            <div className="message-history">
              {loading ? (
                <p>Loading conversation...</p>
              ) : messages.length === 0 ? (
                <p className="messages-empty">No messages yet. Say hello! ❤️</p>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`message-bubble ${
                      message.sender_id === selectedFriend.id
                        ? 'received'
                        : 'sent'
                    }`}
                  >
                    <p>{message.content}</p>
                    <small>{new Date(message.created_at).toLocaleString()}</small>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form className="message-form" onSubmit={sendMessage}>
              <input
                value={messageText}
                onChange={event => setMessageText(event.target.value)}
                placeholder="Write a message..."
                maxLength={5000}
                required
              />
              <button
                type="submit"
                disabled={sending || !messageText.trim() || !conversationId}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
