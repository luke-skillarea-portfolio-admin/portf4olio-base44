import { Users, Plus } from 'lucide-react';
import '../../styles/Messages.css';

export default function GroupList({ groups, onSelectGroup, onCreateGroup }) {
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

    const getLastMessagePreview = (group) => {
        if (group.last_message) {
            const preview = `${group.last_message.sender_username}: ${group.last_message.content}`;
            return preview.length > 45 ? preview.substring(0, 45) + '...' : preview;
        }
        return 'No messages yet';
    };

    return (
        <div className="groups-section">
            <div className="groups-header">
                <h3>Groups</h3>
                <button className="create-group-btn" onClick={onCreateGroup} title="Create Group">
                    <Plus size={18} />
                </button>
            </div>
            {groups.length === 0 ? (
                <div className="groups-empty">
                    <Users size={32} />
                    <p>No groups yet</p>
                </div>
            ) : (
                <div className="groups-list">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            className="conversation-item group-item"
                            onClick={() => onSelectGroup(group)}
                        >
                            <div className="conversation-avatar group-avatar">
                                <Users size={20} />
                            </div>
                            <div className="conversation-content">
                                <div className="conversation-header">
                                    <span className="conversation-name">{group.name}</span>
                                    {group.last_message && (
                                        <span className="conversation-time">
                                            {formatTime(group.last_message.created_at)}
                                        </span>
                                    )}
                                </div>
                                <div className="conversation-preview">
                                    <span className="conversation-last-message">
                                        {getLastMessagePreview(group)}
                                    </span>
                                    <span className="group-member-count">{group.member_count} members</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
