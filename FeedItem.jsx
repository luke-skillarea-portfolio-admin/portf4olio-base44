import { useState, useEffect } from 'react';
import { groupsAPI } from '../../services/api';
import { ArrowLeft, UserMinus, Shield, Link, Check, X, Clock } from 'lucide-react';
import '../../styles/Messages.css';

export default function GroupManageView({ group, currentUser, onBack, onGroupUpdated }) {
    const [groupData, setGroupData] = useState(group);
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        loadGroupData();
    }, [group.id]);

    const loadGroupData = async () => {
        setLoading(true);
        try {
            const [detailData, pendingData] = await Promise.all([
                groupsAPI.getGroupDetail(group.id),
                groupsAPI.getPendingMembers(group.id)
            ]);
            setGroupData(detailData.group);
            setPendingMembers(pendingData.pending_members || []);
        } catch (err) {
            console.error('Error loading group data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyInviteLink = async () => {
        try {
            const data = await groupsAPI.getInviteLink(group.id);
            const fullLink = `${window.location.origin}${data.invite_link}`;
            await navigator.clipboard.writeText(fullLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            alert(err.message || 'Failed to get invite link');
        }
    };

    const handleAdmitMember = async (userId) => {
        setActionLoading(`admit-${userId}`);
        try {
            await groupsAPI.admitMember(group.id, userId);
            await loadGroupData();
            if (onGroupUpdated) onGroupUpdated();
        } catch (err) {
            alert(err.message || 'Failed to admit member');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMember = async (userId, username) => {
        if (!confirm(`Remove ${username} from the group?`)) return;
        
        setActionLoading(`remove-${userId}`);
        try {
            await groupsAPI.removeMember(group.id, userId);
            await loadGroupData();
            if (onGroupUpdated) onGroupUpdated();
        } catch (err) {
            alert(err.message || 'Failed to remove member');
        } finally {
            setActionLoading(null);
        }
    };

    const handleMakeAdmin = async (userId, username) => {
        if (!confirm(`Make ${username} an admin?`)) return;
        
        setActionLoading(`admin-${userId}`);
        try {
            await groupsAPI.makeAdmin(group.id, userId);
            await loadGroupData();
            if (onGroupUpdated) onGroupUpdated();
        } catch (err) {
            alert(err.message || 'Failed to promote member');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectMember = async (userId) => {
        setActionLoading(`reject-${userId}`);
        try {
            await groupsAPI.removeMember(group.id, userId);
            await loadGroupData();
        } catch (err) {
            alert(err.message || 'Failed to reject member');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="group-manage-view">
                <div className="group-manage-header">
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2>Manage Group</h2>
                </div>
                <div className="group-manage-loading">Loading...</div>
            </div>
        );
    }

    const members = groupData.members_data || [];
    const admins = members.filter(m => m.role === 'admin');
    const regularMembers = members.filter(m => m.role === 'member');

    return (
        <div className="group-manage-view">
            <div className="group-manage-header">
                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h2>Manage Group</h2>
            </div>

            <div className="group-manage-content">
                {/* Invite Link Section */}
                <div className="manage-section">
                    <h3>Invite Link</h3>
                    <button className="invite-link-btn" onClick={handleCopyInviteLink}>
                        <Link size={18} />
                        <span>{copySuccess ? 'Link Copied!' : 'Copy Invite Link'}</span>
                    </button>
                    <p className="section-note">Share this link to invite new members. They'll need admin approval to join.</p>
                </div>

                {/* Pending Requests Section */}
                {pendingMembers.length > 0 && (
                    <div className="manage-section">
                        <h3>
                            <Clock size={18} />
                            Pending Requests ({pendingMembers.length})
                        </h3>
                        <div className="members-list">
                            {pendingMembers.map((member) => (
                                <div key={member.id} className="member-item pending-member">
                                    <div className="member-avatar">
                                        {member.user_data.profile_picture ? (
                                            <img src={member.user_data.profile_picture} alt={member.user_data.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        ) : (
                                            member.user_data.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{member.user_data.username}</span>
                                        <span className="member-email">{member.user_data.email}</span>
                                    </div>
                                    <div className="member-actions">
                                        <button
                                            className="action-btn admit-btn"
                                            onClick={() => handleAdmitMember(member.user_data.id)}
                                            disabled={actionLoading === `admit-${member.user_data.id}`}
                                            title="Admit"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            className="action-btn reject-btn"
                                            onClick={() => handleRejectMember(member.user_data.id)}
                                            disabled={actionLoading === `reject-${member.user_data.id}`}
                                            title="Reject"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Admins Section */}
                <div className="manage-section">
                    <h3>
                        <Shield size={18} />
                        Admins ({admins.length})
                    </h3>
                    <div className="members-list">
                        {admins.map((member) => (
                            <div key={member.id} className="member-item">
                                <div className="member-avatar admin-avatar">
                                    {member.user_data.profile_picture ? (
                                        <img src={member.user_data.profile_picture} alt={member.user_data.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (
                                        member.user_data.username.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="member-info">
                                    <span className="member-name">
                                        {member.user_data.username}
                                        {member.user_data.id === currentUser.id && ' (You)'}
                                    </span>
                                    <span className="member-role">Admin</span>
                                </div>
                                {member.user_data.id !== currentUser.id && admins.length > 1 && (
                                    <div className="member-actions">
                                        <button
                                            className="action-btn remove-btn"
                                            onClick={() => handleRemoveMember(member.user_data.id, member.user_data.username)}
                                            disabled={actionLoading === `remove-${member.user_data.id}`}
                                            title="Remove"
                                        >
                                            <UserMinus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Members Section */}
                <div className="manage-section">
                    <h3>Members ({regularMembers.length})</h3>
                    {regularMembers.length === 0 ? (
                        <p className="no-members">No regular members yet</p>
                    ) : (
                        <div className="members-list">
                            {regularMembers.map((member) => (
                                <div key={member.id} className="member-item">
                                    <div className="member-avatar">
                                        {member.user_data.profile_picture ? (
                                            <img src={member.user_data.profile_picture} alt={member.user_data.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        ) : (
                                            member.user_data.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{member.user_data.username}</span>
                                        <span className="member-email">{member.user_data.email}</span>
                                    </div>
                                    <div className="member-actions">
                                        <button
                                            className="action-btn promote-btn"
                                            onClick={() => handleMakeAdmin(member.user_data.id, member.user_data.username)}
                                            disabled={actionLoading === `admin-${member.user_data.id}`}
                                            title="Make Admin"
                                        >
                                            <Shield size={16} />
                                        </button>
                                        <button
                                            className="action-btn remove-btn"
                                            onClick={() => handleRemoveMember(member.user_data.id, member.user_data.username)}
                                            disabled={actionLoading === `remove-${member.user_data.id}`}
                                            title="Remove"
                                        >
                                            <UserMinus size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
