import { useState } from "react";
import BottomNav from "../layout/BottomNav";
import { adminPostsAPI } from "../../services/api";
import "../../styles/AdminAnalytics.css";

const SUSPEND_REASON_OPTIONS = [
    { value: 'violation', label: 'Terms of Service Violation' },
    { value: 'inappropriate', label: 'Inappropriate Behavior' },
    { value: 'spam', label: 'Spam or Fraudulent Activity' },
    { value: 'harassment', label: 'Harassment or Bullying' },
];

export default function UserList({ users, userType, onBack, onRefresh }) {
    const [suspendModal, setSuspendModal] = useState({ show: false, user: null });
    const [suspendReason, setSuspendReason] = useState('');
    const [suspendingId, setSuspendingId] = useState(null);
    const [suspendedIds, setSuspendedIds] = useState(new Set());
    const [unsuspendedIds, setUnsuspendedIds] = useState(new Set());
    const [unsuspendingId, setUnsuspendingId] = useState(null);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const getTitle = () => {
        switch (userType) {
            case "user":
                return "Users";
            case "talent":
                return "Talents";
            case "agency":
                return "Agencies";
            default:
                return "Users";
        }
    };

    const getNoLabel = () => {
        switch (userType) {
            case "user":
                return "User No";
            case "talent":
                return "Talent No";
            case "agency":
                return "Agency No";
            default:
                return "No";
        }
    };

    const openSuspendModal = (user) => {
        setSuspendModal({ show: true, user });
        setSuspendReason('');
    };

    const closeSuspendModal = () => {
        setSuspendModal({ show: false, user: null });
        setSuspendReason('');
    };

    const handleSuspendAccount = async () => {
        if (!suspendModal.user || !suspendReason) return;

        const user = suspendModal.user;
        setSuspendingId(user.id);
        try {
            const reasonLabel = SUSPEND_REASON_OPTIONS.find(opt => opt.value === suspendReason)?.label || suspendReason;
            await adminPostsAPI.suspendAccount(user.id, reasonLabel);
            // Update local state immediately
            setSuspendedIds(prev => new Set([...prev, user.id]));
            closeSuspendModal();
            alert(`Account @${user.username} has been suspended.`);
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            alert('Failed to suspend account: ' + (err.message || 'Unknown error'));
        } finally {
            setSuspendingId(null);
        }
    };

    const handleUnsuspendAccount = async (user) => {
        if (!confirm(`Are you sure you want to unsuspend @${user.username}?`)) {
            return;
        }

        setUnsuspendingId(user.id);
        try {
            await adminPostsAPI.unsuspendAccount(user.id);
            // Update local state immediately
            setUnsuspendedIds(prev => new Set([...prev, user.id]));
            // Remove from suspendedIds if it was locally suspended
            setSuspendedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(user.id);
                return newSet;
            });
            alert(`Account @${user.username} has been unsuspended.`);
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            alert('Failed to unsuspend account: ' + (err.message || 'Unknown error'));
        } finally {
            setUnsuspendingId(null);
        }
    };

    const renderHeader = () => {
        if (userType === "user") {
            return (
                <div className="user-list-header user-list-header-users">
                    <div className="user-list-header-item">{getNoLabel()}</div>
                    <div className="user-list-header-item">Username</div>
                    <div className="user-list-header-item">Join Date</div>
                    <div className="user-list-header-item">MR</div>
                    <div className="user-list-header-item">Action</div>
                </div>
            );
        } else if (userType === "talent") {
            return (
                <div className="user-list-header user-list-header-talents">
                    <div className="user-list-header-item">{getNoLabel()}</div>
                    <div className="user-list-header-item">Username</div>
                    <div className="user-list-header-item">Talent Date</div>
                    <div className="user-list-header-item">MR</div>
                    <div className="user-list-header-item">PR</div>
                    <div className="user-list-header-item">PS</div>
                    <div className="user-list-header-item">Action</div>
                </div>
            );
        } else if (userType === "agency") {
            return (
                <div className="user-list-header user-list-header-agencies">
                    <div className="user-list-header-item">{getNoLabel()}</div>
                    <div className="user-list-header-item">Username</div>
                    <div className="user-list-header-item">Agency Date</div>
                    <div className="user-list-header-item">MR</div>
                    <div className="user-list-header-item">PR</div>
                    <div className="user-list-header-item">PS</div>
                    <div className="user-list-header-item">Action</div>
                </div>
            );
        }
    };

    const renderRow = (user, index) => {
        // Check if suspended: originally suspended and not locally unsuspended, OR locally suspended
        const isSuspended = (user.is_suspended && !unsuspendedIds.has(user.id)) || suspendedIds.has(user.id);
        const isProcessing = suspendingId === user.id || unsuspendingId === user.id;

        const actionButton = isSuspended ? (
            <button
                className="unsuspend-btn"
                onClick={() => handleUnsuspendAccount(user)}
                disabled={isProcessing}
            >
                {unsuspendingId === user.id ? 'Unsuspending...' : 'Unsuspend'}
            </button>
        ) : (
            <button
                className="suspend-account-btn"
                onClick={() => openSuspendModal(user)}
                disabled={isProcessing}
            >
                {suspendingId === user.id ? 'Suspending...' : 'Suspend'}
            </button>
        );

        if (userType === "user") {
            return (
                <div key={user.id} className="user-list-item user-list-item-users">
                    <div className="user-list-cell">{index + 1}</div>
                    <div className="user-list-cell user-list-username">{user.username}</div>
                    <div className="user-list-cell">{formatDate(user.join_date)}</div>
                    <div className="user-list-cell">{user.message_reports || 0}</div>
                    <div className="user-list-cell">{actionButton}</div>
                </div>
            );
        } else if (userType === "talent") {
            return (
                <div key={user.id} className="user-list-item user-list-item-talents">
                    <div className="user-list-cell">{index + 1}</div>
                    <div className="user-list-cell user-list-username">{user.username}</div>
                    <div className="user-list-cell">{user.talent_date ? formatDate(user.talent_date) : '-'}</div>
                    <div className="user-list-cell">{user.message_reports || 0}</div>
                    <div className="user-list-cell">{user.post_reports || 0}</div>
                    <div className="user-list-cell">{user.post_suspends || 0}</div>
                    <div className="user-list-cell">{actionButton}</div>
                </div>
            );
        } else if (userType === "agency") {
            return (
                <div key={user.id} className="user-list-item user-list-item-agencies">
                    <div className="user-list-cell">{index + 1}</div>
                    <div className="user-list-cell user-list-username">{user.username}</div>
                    <div className="user-list-cell">{user.agency_date ? formatDate(user.agency_date) : '-'}</div>
                    <div className="user-list-cell">{user.message_reports || 0}</div>
                    <div className="user-list-cell">{user.post_reports || 0}</div>
                    <div className="user-list-cell">{user.post_suspends || 0}</div>
                    <div className="user-list-cell">{actionButton}</div>
                </div>
            );
        }
    };

    return (
        <div className="appShell">
            <div className="admin-analytics-page">
                <div className="admin-top-bar">
                    <button className="back-to-feed-button" onClick={onBack}>
                        ← Back to Analytics
                    </button>
                </div>

                <main className="admin-analytics-content">
                    <div className="analytics-header">
                        <h1>{getTitle()}</h1>
                        <p className="analytics-subtitle">List of all {getTitle().toLowerCase()}</p>
                    </div>

                    <div className="user-list-container">
                        {renderHeader()}

                        <div className="user-list">
                            {users.length === 0 ? (
                                <div className="no-users">No {getTitle().toLowerCase()} found</div>
                            ) : (
                                users.map((user, index) => renderRow(user, index))
                            )}
                        </div>
                    </div>
                </main>
                <BottomNav />
            </div>

            {/* Suspend Account Modal */}
            {suspendModal.show && (
                <div className="suspend-modal-overlay" onClick={closeSuspendModal}>
                    <div className="suspend-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="suspend-modal-content">
                            <h3 className="suspend-modal-title">Suspend Account</h3>
                            <p className="suspend-modal-subtitle">
                                Suspending account: <strong>@{suspendModal.user?.username}</strong>
                            </p>
                            <label className="suspend-modal-label">
                                Suspension Reason
                            </label>
                            <div className="suspend-reason-options">
                                {SUSPEND_REASON_OPTIONS.map((option) => (
                                    <label key={option.value} className="suspend-reason-option">
                                        <input
                                            type="radio"
                                            name="accountSuspendReason"
                                            value={option.value}
                                            checked={suspendReason === option.value}
                                            onChange={(e) => setSuspendReason(e.target.value)}
                                        />
                                        <span>{option.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="suspend-modal-actions">
                                <button className="suspend-modal-cancel" onClick={closeSuspendModal}>
                                    Cancel
                                </button>
                                <button
                                    className="suspend-modal-confirm"
                                    onClick={handleSuspendAccount}
                                    disabled={!suspendReason || suspendingId === suspendModal.user?.id}
                                >
                                    {suspendingId === suspendModal.user?.id ? 'Suspending...' : 'Suspend Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
