import { useState, useEffect, useRef } from "react";
import { FiSearch, FiX, FiUser, FiImage, FiPlay, FiLock, FiArrowLeft } from "react-icons/fi";
import { searchAPI } from "../services/api";
import "../styles/SearchOverlay.css";

export default function SearchOverlay({ isOpen, onClose, onProfileClick }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("accounts");
    const [accountResults, setAccountResults] = useState([]);
    const [postResults, setPostResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const searchTimeout = useRef(null);

    // Focus input when overlay opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        // Reset when closed
        if (!isOpen) {
            setSearchQuery("");
            setAccountResults([]);
            setPostResults([]);
            setHasSearched(false);
            setError(null);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (!searchQuery.trim()) {
            setAccountResults([]);
            setPostResults([]);
            setHasSearched(false);
            return;
        }

        searchTimeout.current = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery]);

    const performSearch = async (query) => {
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        setError(null);

        try {
            const [accountsRes, postsRes] = await Promise.all([
                searchAPI.searchAccounts(query, 30),
                searchAPI.searchPosts(query, 'all', 30)
            ]);

            setAccountResults(accountsRes.accounts || []);
            setPostResults(postsRes.posts || []);
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message || 'Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAccountClick = (username) => {
        if (onProfileClick) {
            onProfileClick(username);
        }
        onClose();
    };

    const handlePostClick = (post) => {
        if (onProfileClick && post.user?.username) {
            onProfileClick(post.user.username);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="search-overlay">
            <div className="search-overlay-header">
                <button className="search-back-btn" onClick={onClose}>
                    <FiArrowLeft size={22} />
                </button>
                <div className="search-input-wrapper">
                    <FiSearch size={18} className="search-input-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search accounts & posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-overlay-input"
                    />
                    {searchQuery && (
                        <button
                            className="search-clear-btn"
                            onClick={() => setSearchQuery("")}
                        >
                            <FiX size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="search-overlay-tabs">
                <button
                    className={`search-overlay-tab ${activeTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accounts')}
                >
                    <FiUser size={16} />
                    <span>Accounts</span>
                    {hasSearched && <span className="tab-count">{accountResults.length}</span>}
                </button>
                <button
                    className={`search-overlay-tab ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                >
                    <FiImage size={16} />
                    <span>Posts</span>
                    {hasSearched && <span className="tab-count">{postResults.length}</span>}
                </button>
            </div>

            {/* Results */}
            <div className="search-overlay-results">
                {error ? (
                    <div className="search-error-state">
                        <p>{error}</p>
                    </div>
                ) : !hasSearched ? (
                    <div className="search-empty-state">
                        <FiSearch size={40} />
                        <h3>Search for accounts or posts</h3>
                        <div className="search-tips">
                            <p><strong>@username</strong> - Find accounts</p>
                            <p><strong>#hashtag</strong> - Search hashtags</p>
                            <p><strong>keyword</strong> - Search descriptions</p>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="search-loading-state">
                        <div className="search-spinner"></div>
                        <span>Searching...</span>
                    </div>
                ) : activeTab === 'accounts' ? (
                    accountResults.length > 0 ? (
                        <div className="search-results-list">
                            {accountResults.map((account) => (
                                <button
                                    key={account.id}
                                    className="search-result-item"
                                    onClick={() => handleAccountClick(account.username)}
                                >
                                    <div className="result-avatar">
                                        <div className="avatar-placeholder">
                                            {account.profile_picture ? (
                                                <img src={account.profile_picture} alt={account.username} />
                                            ) : (
                                                account.username.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                    <div className="result-info">
                                        <span className="result-username">
                                            @{account.username}
                                            {account.is_private && <FiLock size={12} />}
                                        </span>
                                        <span className="result-type">{account.account_type_display}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="search-no-results">
                            <FiUser size={32} />
                            <p>No accounts found for "{searchQuery}"</p>
                        </div>
                    )
                ) : (
                    postResults.length > 0 ? (
                        <div className="search-results-list">
                            {postResults.map((post) => (
                                <button
                                    key={`${post.type}-${post.id}`}
                                    className="search-result-item post-result"
                                    onClick={() => handlePostClick(post)}
                                >
                                    <div className="post-thumb">
                                        {post.thumbnail_url ? (
                                            <img src={post.thumbnail_url} alt="" />
                                        ) : (
                                            post.type === 'video' ? <FiPlay size={20} /> : <FiImage size={20} />
                                        )}
                                    </div>
                                    <div className="result-info">
                                        <span className="post-desc">{post.description || 'No description'}</span>
                                        <span className="result-type">@{post.user?.username}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="search-no-results">
                            <FiImage size={32} />
                            <p>No posts found for "{searchQuery}"</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
