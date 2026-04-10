import { useState, useEffect } from 'react';
import { groupsAPI } from '../../services/api';
import { ArrowLeft, Users, CheckCircle, Clock } from 'lucide-react';
import '../../styles/Messages.css';

export default function JoinGroupView({ inviteCode, onBack, onJoined }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [groupName, setGroupName] = useState('');

    const handleJoin = async () => {
        setLoading(true);
        setError('');
        
        try {
            const data = await groupsAPI.joinByInvite(inviteCode);
            setGroupName(data.group_name);
            setSuccess(true);
            setTimeout(() => {
                onJoined();
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to join group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="join-group-view">
            <div className="join-group-header">
                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h2>Join Group</h2>
            </div>

            <div className="join-group-content">
                {success ? (
                    <div className="join-success">
                        <CheckCircle size={60} className="success-icon" />
                        <h3>Request Submitted!</h3>
                        <p>Your request to join <strong>{groupName}</strong> has been submitted.</p>
                        <div className="pending-notice">
                            <Clock size={20} />
                            <span>Waiting for admin approval</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="join-group-icon">
                            <Users size={60} />
                        </div>
                        <h3>You've been invited to join a group</h3>
                        <p className="invite-code-display">Invite Code: <code>{inviteCode}</code></p>
                        
                        {error && <div className="join-group-error">{error}</div>}
                        
                        <button
                            className="join-group-btn"
                            onClick={handleJoin}
                            disabled={loading}
                        >
                            {loading ? 'Joining...' : 'Request to Join'}
                        </button>
                        
                        <p className="join-note">
                            A group admin will need to approve your request before you can access the group.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
