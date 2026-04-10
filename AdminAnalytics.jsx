import { useState, useEffect } from 'react';
import { messagesAPI } from '../../services/api';
import '../../styles/Messages.css';

export default function NewMessageView({ currentUser, onSelectUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await messagesAPI.getUsers();
            setUsers(data.users || []);
        } catch (err) {
            setError('Failed to load users');
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatAccountType = (type) => {
        const typeMap = {
            "user": "User",
            "talent": "Talent",
            "agency": "Agency",
            "agency_talent": "Agency Talent",
            "admin": "Admin"
        };
        return typeMap[type] || type;
    };

    return (
        <div className="new-message-view">
            <div className="new-message-header">
                <h2>New Message</h2>
                <p className="new-message-subtitle">Select a user to start a conversation</p>
            </div>

            <div className="new-message-search">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="user-search-input"
                />
            </div>

            {loading ? (
                <div className="messages-loading">Loading users...</div>
            ) : error ? (
                <div className="messages-error">{error}</div>
            ) : (
                <div className="users-list">
                    {filteredUsers.length === 0 ? (
                        <div className="users-empty">
                            <p>No users found</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="user-item"
                                onClick={() => onSelectUser(user.id)}
                            >
                                <div className="conversation-avatar">
                                    <div className="avatar-placeholder">
                                        {user.profile_picture ? (
                                            <img src={user.profile_picture} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        ) : (
                                            user.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                </div>
                                <div className="user-item-content">
                                    <div className="user-item-header">
                                        <span className="user-item-name">{user.username}</span>
                                        <span className="user-item-type">{formatAccountType(user.account_type)}</span>
                                    </div>
                                    <span className="user-item-email">{user.email}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
