import { MessageCircle } from 'lucide-react';
import '../../styles/Messages.css';

export default function ConversationList({ conversations, currentUser, onSelectConversation }) {
    const getOtherParticipant = (conversation) => {
        if (conversation.participant1_data.id === currentUser.id) {
            return conversation.participant2_data;
        }
        return conversation.participant1_data;
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getLastMessagePreview = (conversation) => {
        if (conversation.last_message) {
            const preview = conversation.last_message.content;
            return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
        }
        return 'No messages yet';
    };

    return (
        <>
            {conversations.length === 0 ? (
                <div className="conversations-empty">
                    <MessageCircle size={48} />
                    <p>No conversations yet</p>
                    <p className="conversations-empty-subtitle">Message someone from their profile to start a conversation</p>
                </div>
            ) : (
                <div className="conversations-list">
            {conversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const lastMessage = conversation.last_message;
                const unreadCount = conversation.unread_count || 0;

                return (
                    <div
                        key={conversation.id}
                        className={`conversation-item ${unreadCount > 0 ? 'unread' : ''}`}
                        onClick={() => onSelectConversation(conversation)}
                    >
                        <div className="conversation-avatar">
                            <div className="avatar-placeholder">
                                {otherParticipant.profile_picture ? (
                                    <img src={otherParticipant.profile_picture} alt={otherParticipant.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (
                                    otherParticipant.username.charAt(0).toUpperCase()
                                )}
                            </div>
                        </div>
                        <div className="conversation-content">
                            <div className="conversation-header">
                                <span className="conversation-name">{otherParticipant.username}</span>
                                {lastMessage && (
                                    <span className="conversation-time">
                                        {formatTime(lastMessage.created_at)}
                                    </span>
                                )}
                            </div>
                            <div className="conversation-preview">
                                <span className="conversation-last-message">
                                    {getLastMessagePreview(conversation)}
                                </span>
                                {unreadCount > 0 && (
                                    <span className="conversation-unread-badge">{unreadCount}</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
                </div>
            )}
        </>
    );
}
