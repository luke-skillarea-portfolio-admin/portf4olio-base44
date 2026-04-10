import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { messagesAPI, groupsAPI } from '../services/api';
import ConversationList from '../components/messages/ConversationList';
import ConversationView from '../components/messages/ConversationView';
import GroupList from '../components/messages/GroupList';
import GroupChatView from '../components/messages/GroupChatView';
import CreateGroupView from '../components/messages/CreateGroupView';
import GroupManageView from '../components/messages/GroupManageView';
import JoinGroupView from '../components/messages/JoinGroupView';
import BottomNav from '../components/layout/BottomNav';
import '../styles/Messages.css';

export default function Messages({ onNavigateToFeed, onNavigate, inviteCode, onClearInviteCode, messageTargetUserId, onClearMessageTarget }) {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showManageGroup, setShowManageGroup] = useState(null);
    const [showJoinGroup, setShowJoinGroup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();

        // Poll for new conversations/messages every 5 seconds
        const pollInterval = setInterval(() => {
            if (!selectedConversation && !selectedGroup) {
                pollData();
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [selectedConversation, selectedGroup]);

    // Handle invite code from URL
    useEffect(() => {
        if (inviteCode) {
            setShowJoinGroup(true);
        }
    }, [inviteCode]);

    // Handle message target from profile - auto open/create conversation
    useEffect(() => {
        const openConversationWithUser = async () => {
            if (messageTargetUserId && user) {
                try {
                    const data = await messagesAPI.createOrGetConversation(messageTargetUserId);
                    setSelectedConversation(data.conversation);
                    if (onClearMessageTarget) {
                        onClearMessageTarget();
                    }
                    loadData();
                } catch (err) {
                    console.error('Failed to open conversation:', err);
                    setError('Failed to open conversation');
                    if (onClearMessageTarget) {
                        onClearMessageTarget();
                    }
                }
            }
        };
        openConversationWithUser();
    }, [messageTargetUserId, user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [convData, groupsData] = await Promise.all([
                messagesAPI.getConversations(),
                groupsAPI.getMyGroups()
            ]);
            setConversations(convData.conversations || []);
            setGroups(groupsData.groups || []);
        } catch (err) {
            setError('Failed to load messages');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Poll for new data without resetting loading state
    const pollData = async () => {
        try {
            const [convData, groupsData] = await Promise.all([
                messagesAPI.getConversations(),
                groupsAPI.getMyGroups()
            ]);
            setConversations(convData.conversations || []);
            setGroups(groupsData.groups || []);
        } catch (err) {
            // Silently fail on poll errors
            console.error('Error polling messages:', err);
        }
    };

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
    };

    const handleSelectGroup = (group) => {
        setSelectedGroup(group);
    };

    const handleBackToList = () => {
        setSelectedConversation(null);
        setSelectedGroup(null);
        setShowManageGroup(null);
        loadData();
    };

    const handleCreateGroup = () => {
        setShowCreateGroup(true);
    };

    const handleGroupCreated = (group) => {
        setShowCreateGroup(false);
        setSelectedGroup(group);
        loadData();
    };

    const handleBackFromCreateGroup = () => {
        setShowCreateGroup(false);
    };

    const handleManageGroup = (group) => {
        setShowManageGroup(group);
        setSelectedGroup(null);
    };

    const handleBackFromManageGroup = () => {
        setShowManageGroup(null);
        loadData();
    };

    const handleJoinGroupBack = () => {
        setShowJoinGroup(false);
        if (onClearInviteCode) onClearInviteCode();
        loadData();
    };

    const handleGroupJoined = () => {
        setShowJoinGroup(false);
        if (onClearInviteCode) onClearInviteCode();
        loadData();
    };

    // Show join group view
    if (showJoinGroup && inviteCode) {
        return (
            <div className="appShell">
                <div className="messages-page">
                    <JoinGroupView
                        inviteCode={inviteCode}
                        onBack={handleJoinGroupBack}
                        onJoined={handleGroupJoined}
                    />
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Show create group view
    if (showCreateGroup) {
        return (
            <div className="appShell">
                <div className="messages-page">
                    <CreateGroupView
                        onBack={handleBackFromCreateGroup}
                        onGroupCreated={handleGroupCreated}
                    />
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Show manage group view
    if (showManageGroup) {
        return (
            <div className="appShell">
                <div className="messages-page">
                    <GroupManageView
                        group={showManageGroup}
                        currentUser={user}
                        onBack={handleBackFromManageGroup}
                        onGroupUpdated={loadData}
                    />
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Show individual conversation view
    if (selectedConversation) {
        return (
            <div className="appShell">
                <div className="messages-page">
                    <ConversationView
                        conversation={selectedConversation}
                        currentUser={user}
                        onBack={handleBackToList}
                        onMessageSent={loadData}
                    />
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Show group chat view
    if (selectedGroup) {
        return (
            <div className="appShell">
                <div className="messages-page">
                    <GroupChatView
                        group={selectedGroup}
                        currentUser={user}
                        onBack={handleBackToList}
                        onManageGroup={handleManageGroup}
                    />
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Main messages list view
    return (
        <div className="appShell">
            <div className="messages-page">
                <div className="messages-top-bar">
                    <button className="back-to-feed-button" onClick={onNavigateToFeed}>
                        ← Back to Feed
                    </button>
                </div>
                <div className="messages-header">
                    <h1>Messages</h1>
                </div>
                {loading ? (
                    <div className="messages-loading">Loading conversations...</div>
                ) : error ? (
                    <div className="messages-error">{error}</div>
                ) : (
                    <div className="messages-content">
                        {/* Groups Section */}
                        <GroupList
                            groups={groups}
                            onSelectGroup={handleSelectGroup}
                            onCreateGroup={handleCreateGroup}
                        />
                        
                        {/* Direct Messages Section */}
                        <div className="dm-section">
                            <h3>Direct Messages</h3>
                            <ConversationList
                                conversations={conversations}
                                currentUser={user}
                                onSelectConversation={handleSelectConversation}
                            />
                        </div>
                    </div>
                )}
                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}
