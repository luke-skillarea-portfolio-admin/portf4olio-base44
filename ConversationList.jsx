import { useState } from "react";
import BottomNav from "../layout/BottomNav";
import { adminPostsAPI } from "../../services/api";
import "../../styles/AdminAnalytics.css";

export default function SuspendedAccountsList({ suspendedAccounts, onBack, onRefresh }) {
    const [filter, setFilter] = useState("all");
    const [expandedId, setExpandedId] = useState(null);
    const [unsuspendingId, setUnsuspendingId] = useState(null);

    const filteredAccounts = suspendedAccounts.filter(account => {
        if (filter === "all") return true;
        return account.account_type === filter;
    });

    const getAccountTypeLabel = (type) => {
        switch (type) {
            case "user": return "User";
            case "talent": return "Talent";
            case "agency": return "Agency";
            case "agency_talent": return "Agency Talent";
            default: return type;
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleUnsuspend = async (account) => {
        if (!confirm(`Are you sure you want to unsuspend @${account.username}?`)) {
            return;
        }

        setUnsuspendingId(account.id);
        try {
            await adminPostsAPI.unsuspendAccount(account.id);
            alert(`Account @${account.username} has been unsuspended.`);
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            alert('Failed to unsuspend account: ' + (err.message || 'Unknown error'));
        } finally {
            setUnsuspendingId(null);
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
                        <h1>Suspended Accounts</h1>
                        <p className="analytics-subtitle">List of all suspended accounts</p>
                    </div>

                    <div className="user-list-container">
                        <div className="suspended-filter-container">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="suspended-filter"
                            >
                                <option value="all">All Types</option>
                                <option value="user">Users</option>
                                <option value="talent">Talents</option>
                                <option value="agency">Agencies</option>
                                <option value="agency_talent">Agency Talents</option>
                            </select>
                        </div>

                        <div className="user-list-header user-list-header-suspended">
                            <div className="user-list-header-item">No</div>
                            <div className="user-list-header-item">Username</div>
                            <div className="user-list-header-item">Type</div>
                            <div className="user-list-header-item">Action</div>
                        </div>

                        <div className="user-list">
                            {filteredAccounts.length === 0 ? (
                                <div className="no-users">No suspended accounts found</div>
                            ) : (
                                filteredAccounts.map((account, index) => (
                                    <div key={account.id} className="suspended-account-wrapper">
                                        <div
                                            className={`user-list-item user-list-item-suspended ${account.suspension_note ? 'has-note' : ''}`}
                                            onClick={() => account.suspension_note && toggleExpand(account.id)}
                                        >
                                            <div className="user-list-cell">{index + 1}</div>
                                            <div className="user-list-cell user-list-username">
                                                {account.username}
                                                {account.suspension_note && (
                                                    <span className="note-indicator"> (note)</span>
                                                )}
                                            </div>
                                            <div className="user-list-cell">{getAccountTypeLabel(account.account_type)}</div>
                                            <div className="user-list-cell">
                                                <button
                                                    className="unsuspend-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUnsuspend(account);
                                                    }}
                                                    disabled={unsuspendingId === account.id}
                                                >
                                                    {unsuspendingId === account.id ? 'Unsuspending...' : 'Unsuspend'}
                                                </button>
                                            </div>
                                        </div>
                                        {expandedId === account.id && account.suspension_note && (
                                            <div className="suspension-note">
                                                <strong>Note:</strong> {account.suspension_note}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
