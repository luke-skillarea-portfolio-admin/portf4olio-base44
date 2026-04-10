import { useState, useEffect, useRef } from 'react';
import { messagesAPI } from '../../services/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import '../../styles/Messages.css';

export default function ConversationView({ conversation, currentUser, onBack, onMessageSent }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const messageRefs = useRef({});
    const isInitialLoad = useRef(true);

    useEffect(() => {
        isInitialLoad.current = true;
        setIsScrolledToBottom(false);
        setReplyingTo(null);
        messageRefs.current = {};
        loadMessages();

        // Poll for new messages every 3 seconds
        const pollInterval = setInterval(() => {
            pollForNewMessages();
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [conversation.id]);

    useEffect(() => {
        if (loading || messages.length === 0) return;

        // Use instant scroll for initial load, smooth for subsequent updates
        if (isInitialLoad.current) {
            // Use multiple timeouts to ensure DOM has fully rendered and layout is complete
            let timer2;
            const timer1 = setTimeout(() => {
                scrollToBottomInstant();
                timer2 = setTimeout(() => {
                    // Double-check scroll position after a brief delay
                    if (messagesContainerRef.current) {
                        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                    }
                    setIsScrolledToBottom(true);
                    isInitialLoad.current = false;
                }, 10);
            }, 0);
            return () => {
                clearTimeout(timer1);
                if (timer2) clearTimeout(timer2);
            };
        } else {
            scrollToBottom();
        }
    }, [messages, loading]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            setIsScrolledToBottom(false);
            const data = await messagesAPI.getConversationMessages(conversation.id);
            setMessages(data.messages || []);
            // Mark unread messages as read
            markUnreadAsRead(data.messages || []);
        } catch (err) {
            setError('Failed to load messages');
            console.error('Error loading messages:', err);
        } finally {
            setLoading(false);
        }
    };

    // Poll for new messages without resetting loading state
    const pollForNewMessages = async () => {
        try {
            const data = await messagesAPI.getConversationMessages(conversation.id);
            const newMessages = data.messages || [];

            if (newMessages.length > messages.length) {
                setMessages(newMessages);
                const newUnread = newMessages.slice(messages.length);
                markUnreadAsRead(newUnread);
            }
        } catch (err) {
            console.error('Error polling messages:', err);
        }
    };

    const markUnreadAsRead = async (messagesList) => {
        // Mark all unread messages from the other participant as read
        for (const message of messagesList) {
            if (message.sender_id !== currentUser.id && !message.read_at) {
                try {
                    await messagesAPI.markMessageRead(message.id);
                } catch (err) {
                    console.error('Error marking message as read:', err);
                }
            }
        }
    };

    const scrollToBottomInstant = () => {
        // Use scrollTop for instant scroll
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (content, attachmentType = 'none', attachmentUrl = null, replyToId = null) => {
        try {
            const data = await messagesAPI.sendMessage(
                conversation.id,
                content,
                attachmentType,
                attachmentUrl,
                replyToId
            );
            setMessages([...messages, data.message]);
            setReplyingTo(null); // Clear reply after sending
            if (onMessageSent) {
                onMessageSent();
            }
        } catch (err) {
            setError('Failed to send message');
            console.error('Error sending message:', err);
            throw err;
        }
    };

    const handleUploadAttachment = async (file) => {
        return messagesAPI.uploadAttachment(file);
    };

    const handleReply = (message) => {
        setReplyingTo(message);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const getOtherParticipant = () => {
        if (conversation.participant1_data.id === currentUser.id) {
            return conversation.participant2_data;
        }
        return conversation.participant1_data;
    };

    const otherParticipant = getOtherParticipant();

    return (
        <div className="conversation-view">
            <div className="conversation-view-header">
                <button className="back-button" onClick={onBack}>
                    ← Back
                </button>
                <div className="conversation-view-participant">
                    <div className="avatar-placeholder">
                        {otherParticipant.profile_picture ? (
                            <img src={otherParticipant.profile_picture} alt={otherParticipant.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            otherParticipant.username.charAt(0).toUpperCase()
                        )}
                    </div>
                    <span>{otherParticipant.username}</span>
                </div>
            </div>

            <div
                className="conversation-view-messages"
                ref={messagesContainerRef}
                style={{ visibility: !isScrolledToBottom && isInitialLoad.current && !loading ? 'hidden' : 'visible' }}
            >
                {loading ? (
                    <div className="messages-loading">Loading messages...</div>
                ) : error ? (
                    <div className="messages-error">{error}</div>
                ) : (
                    <>
                        <MessageList
                            messages={messages}
                            currentUser={currentUser}
                            onReply={handleReply}
                            messageRefs={messageRefs}
                        />
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <MessageInput
                onSendMessage={handleSendMessage}
                onUploadAttachment={handleUploadAttachment}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
            />
        </div>
    );
}
