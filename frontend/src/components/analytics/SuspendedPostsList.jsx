import { useState } from "react";
import BottomNav from "../layout/BottomNav";
import { adminPostsAPI } from "../../services/api";
import "../../styles/AdminAnalytics.css";

export default function SuspendedPostsList({ suspendedPosts, onBack, onRefresh }) {
    const [filter, setFilter] = useState("all");
    const [expandedId, setExpandedId] = useState(null);
    const [unsuspendingId, setUnsuspendingId] = useState(null);

    const filteredPosts = suspendedPosts.filter(post => {
        if (filter === "all") return true;
        return post.post_type === filter;
    });

    const getPostTypeLabel = (type) => {
        switch (type) {
            case "video": return "Video";
            case "photo": return "Photo";
            default: return type;
        }
    };

    const toggleExpand = (id, type) => {
        const key = `${type}-${id}`;
        setExpandedId(expandedId === key ? null : key);
    };

    const handleUnsuspend = async (post) => {
        if (!confirm(`Are you sure you want to unsuspend this ${post.post_type} by @${post.owner_username}?`)) {
            return;
        }

        const key = `${post.post_type}-${post.id}`;
        setUnsuspendingId(key);
        try {
            await adminPostsAPI.unsuspendPost(post.post_type, post.id);
            alert(`${getPostTypeLabel(post.post_type)} has been unsuspended.`);
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            alert('Failed to unsuspend post: ' + (err.message || 'Unknown error'));
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
                        <h1>Suspended Posts</h1>
                        <p className="analytics-subtitle">List of all suspended videos and photos</p>
                    </div>

                    <div className="user-list-container">
                        <div className="suspended-filter-container">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="suspended-filter"
                            >
                                <option value="all">All Types</option>
                                <option value="video">Videos</option>
                                <option value="photo">Photos</option>
                            </select>
                        </div>

                        <div className="user-list-header user-list-header-suspended-posts">
                            <div className="user-list-header-item">No</div>
                            <div className="user-list-header-item">Owner</div>
                            <div className="user-list-header-item">Type</div>
                            <div className="user-list-header-item">Action</div>
                        </div>

                        <div className="user-list">
                            {filteredPosts.length === 0 ? (
                                <div className="no-users">No suspended posts found</div>
                            ) : (
                                filteredPosts.map((post, index) => {
                                    const key = `${post.post_type}-${post.id}`;
                                    return (
                                        <div key={key} className="suspended-account-wrapper">
                                            <div
                                                className={`user-list-item user-list-item-suspended-posts ${post.suspension_reason ? 'has-note' : ''}`}
                                                onClick={() => post.suspension_reason && toggleExpand(post.id, post.post_type)}
                                            >
                                                <div className="user-list-cell">{index + 1}</div>
                                                <div className="user-list-cell user-list-username">
                                                    @{post.owner_username}
                                                    {post.suspension_reason && (
                                                        <span className="note-indicator"> (reason)</span>
                                                    )}
                                                </div>
                                                <div className="user-list-cell">{getPostTypeLabel(post.post_type)}</div>
                                                <div className="user-list-cell">
                                                    <button
                                                        className="unsuspend-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnsuspend(post);
                                                        }}
                                                        disabled={unsuspendingId === key}
                                                    >
                                                        {unsuspendingId === key ? 'Unsuspending...' : 'Unsuspend'}
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedId === key && post.suspension_reason && (
                                                <div className="suspension-note">
                                                    <strong>Reason:</strong> {post.suspension_reason}
                                                    {post.description && (
                                                        <>
                                                            <br />
                                                            <strong>Description:</strong> {post.description}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
