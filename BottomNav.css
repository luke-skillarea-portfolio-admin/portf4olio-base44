import { useState, useEffect, useRef } from "react";
import { FiSearch, FiX, FiUser, FiImage, FiPlay, FiLock } from "react-icons/fi";
import BottomNav from "../components/layout/BottomNav";
import { searchAPI } from "../services/api";
import "../styles/Search.css";

export default function Search({ onNavigate, onProfileClick, currentUser }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("accounts"); // 'accounts' or 'posts'
    const [accountResults, setAccountResults] = useState([]);
    const [postResults, setPostResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const searchTimeout = useRef(null);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

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
            // Search both accounts and posts in parallel
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

    const handleClearSearch = () => {
        setSearchQuery("");
        setAccountResults([]);
        setPostResults([]);
        setHasSearched(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleAccountClick = (username) => {
        if (onProfileClick) {
            onProfileClick(username);
        }
    };

    const handlePostClick = (post) => {
        // Navigate to the user's profile when clicking a post
        if (onProfileClick && post.user?.username) {
            onProfileClick(post.user.username);
        }
    };

    const getSearchHint = () => {
        if (searchQuery.startsWith('@')) {
            return 'Searching usernames...';
        }
        if (searchQuery.startsWith('#')) {
            return 'Searching hashtags...';
        }
        return null;
    };

    const renderAccountItem = (account) => (
        <button
            key={account.id}
            className="search-result-item account-item"
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
                <div className="result-username">
                    @{account.username}
                    {account.is_private && <FiLock size={12} className="private-icon" />}
                </div>
                <div className="result-meta">
                    <span className="account-type">{account.account_type_display}</span>
                    {account.genre && <span className="account-genre">{account.genre}</span>}
                </div>
                {account.bio && (
                    <div className="result-bio">{account.bio}</div>
                )}
            </div>
        </button>
    );

    const renderPostItem = (post) => (
        <button
            key={`${post.type}-${post.id}`}
            className="search-result-item post-item"
            onClick={() => handlePostClick(post)}
        >
            <div className="post-thumbnail">
                {post.type === 'video' ? (
                    post.thumbnail_url ? (
                        <img src={post.thumbnail_url} alt="Video thumbnail" />
                    ) : (
                        <div className="thumbnail-placeholder video">
                            <FiPlay size={24} />
                        </div>
                    )
                ) : (
                    post.thumbnail_url ? (
                        <img src={post.thumbnail_url} alt="Photo thumbnail" />
                    ) : (
                        <div className="thumbnail-placeholder photo">
                            <FiImage size={24} />
                        </div>
                    )
                )}
                <div className="post-type-badge">
                    {post.type === 'video' ? <FiPlay size={12} /> : <FiImage size={12} />}
                </div>
            </div>
            <div className="result-info">
                <div className="post-description">
                    {post.description || 'No description'}
                </div>
                <div className="post-author">
                    <span className="author-name">@{post.user?.username}</span>
                </div>
            </div>
        </button>
    );

    return (
        <div className="appShell">
            <div className="search-page">
                {/* Search Header */}
                <div className="search-header">
                    <div className="search-input-container">
                        <FiSearch size={20} className="search-icon" />
                        <input
                            ref={inputRef}
                            type="text"
                            className="search-input"
                            placeholder="Search accounts or posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-search-btn" onClick={handleClearSearch}>
                                <FiX size={18} />
                            </button>
                        )}
                    </div>
                    {getSearchHint() && (
                        <div className="search-hint">{getSearchHint()}</div>
                    )}
                </div>

                {/* Category Tabs */}
                <div className="search-tabs">
                    <button
                        className={`search-tab ${activeTab === 'accounts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('accounts')}
                    >
                        <FiUser size={16} />
                        <span>Accounts ({accountResults.length})</span>
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <FiImage size={16} />
                        <span>Posts ({postResults.length})</span>
                    </button>
                </div>

                {/* Search Results */}
                <div className="search-results">
                    {error ? (
                        <div className="search-error">
                            <p>{error}</p>
                        </div>
                    ) : !hasSearched ? (
                        <div className="search-empty-state">
                            <div className="empty-icon">
                                <FiSearch size={48} />
                            </div>
                            <h3>Search for accounts or posts</h3>
                            <div className="search-tips">
                                <p><strong>@username</strong> - Find specific accounts</p>
                                <p><strong>#hashtag</strong> - Search posts by hashtag</p>
                                <p><strong>keyword</strong> - Search descriptions</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="search-loading">
                            <div className="loading-spinner"></div>
                            <span>Searching...</span>
                        </div>
                    ) : activeTab === 'accounts' ? (
                        accountResults.length > 0 ? (
                            <div className="results-list">
                                {accountResults.map(renderAccountItem)}
                            </div>
                        ) : (
                            <div className="no-results">
                                <FiUser size={32} />
                                <p>No accounts found for "{searchQuery}"</p>
                            </div>
                        )
                    ) : (
                        postResults.length > 0 ? (
                            <div className="results-list posts-grid">
                                {postResults.map(renderPostItem)}
                            </div>
                        ) : (
                            <div className="no-results">
                                <FiImage size={32} />
                                <p>No posts found for "{searchQuery}"</p>
                            </div>
                        )
                    )}
                </div>

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}
