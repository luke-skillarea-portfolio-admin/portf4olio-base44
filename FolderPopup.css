import { useState, useEffect } from "react";
import BottomNav from "../components/layout/BottomNav";
import { FiArrowLeft, FiGrid, FiPlay, FiStar, FiX, FiImage, FiFolder, FiLock, FiClock, FiXCircle, FiGlobe, FiAlertOctagon, FiUserX } from "react-icons/fi";
import { MdHandshake } from "react-icons/md";
import { usersAPI, talentFavoritesAPI, profileAccessAPI, adminPostsAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import "../styles/UserProfile.css";

const SUSPEND_ACCOUNT_REASON_OPTIONS = [
    { value: 'violation', label: 'Terms of Service Violation' },
    { value: 'inappropriate', label: 'Inappropriate Behavior' },
    { value: 'spam', label: 'Spam or Fraudulent Activity' },
    { value: 'harassment', label: 'Harassment or Bullying' },
];

export default function UserProfile({ username, onBack, onNavigate, onMessage, currentUser, initialSubfolder }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Private profile access state
    const [accessRequestLoading, setAccessRequestLoading] = useState(false);
    const [accessStatus, setAccessStatus] = useState(null); // 'pending', 'denied', null

    // Folder functionality
    const [viewMode, setViewMode] = useState('posts'); // 'posts' or 'folders'
    const [contentData, setContentData] = useState({ public: {}, private: {} });
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedFolderContent, setSelectedFolderContent] = useState({ videos: [], photos: [] });

    // Admin suspend post functionality
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [suspendReason, setSuspendReason] = useState('');
    const [isSuspending, setIsSuspending] = useState(false);

    // Admin suspend account functionality
    const [showSuspendAccountModal, setShowSuspendAccountModal] = useState(false);
    const [suspendAccountReason, setSuspendAccountReason] = useState('');
    const [isSuspendingAccount, setIsSuspendingAccount] = useState(false);

    const isAdmin = user?.account_type === 'admin' || user?.is_staff || user?.is_superuser;

    useEffect(() => {
        const fetchProfile = async () => {
            if (!username) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await usersAPI.getUserProfile(username);
                setProfile(data.profile);

                // Check if this is a private profile and set access status
                if (data.profile?.is_private && data.profile?.access_status) {
                    setAccessStatus(data.profile.access_status);
                }

                // Check if this talent is favorited
                if (data.profile?.id && currentUser && data.profile.id !== currentUser.id) {
                    try {
                        const favData = await talentFavoritesAPI.checkFavorite(data.profile.id);
                        setIsFavorited(favData.is_favorited);
                    } catch {
                        // Ignore favorite check errors
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username, currentUser]);

    // Handle initial subfolder selection from feed
    useEffect(() => {
        if (initialSubfolder?.fromFeed && profile) {
            // Auto-switch to folder view when coming from a feed folder click
            setViewMode('folders');
            
            // Wait for contentData to load, then handle the folder click
            if (contentData.public?.subfolders) {
                if (initialSubfolder.type === 'subfolder') {
                    const subfolder = contentData.public.subfolders.find(f => f.id === initialSubfolder.id);
                    if (subfolder) {
                        handleFolderClick(subfolder, true);
                    }
                } else {
                    // For regular folders, we might need to handle them differently
                    // For now, just switch to folder view which shows all folders
                }
            }
        }
    }, [initialSubfolder, profile, contentData.public?.subfolders]);

    const handleToggleFavorite = async () => {
        if (!profile?.id || favoriteLoading) return;

        setFavoriteLoading(true);
        try {
            const result = await talentFavoritesAPI.toggleFavorite(profile.id);
            setIsFavorited(result.favorited);
        } catch (err) {
            console.error('Failed to toggle favorite:', err.message);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const handleRequestAccess = async () => {
        if (!profile?.username || accessRequestLoading) return;

        setAccessRequestLoading(true);
        try {
            await profileAccessAPI.requestAccess(profile.username);
            setAccessStatus('pending');
        } catch (err) {
            console.error('Failed to request access:', err.message);
            alert(err.message || 'Failed to send access request');
        } finally {
            setAccessRequestLoading(false);
        }
    };

    const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

    const formatNumber = (num) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K";
        }
        return num;
    };

    const openPost = (post, type) => {
        setSelectedPost({ ...post, type });
        setCurrentPhotoIndex(0);
    };

    const closePostModal = () => {
        setSelectedPost(null);
        setCurrentPhotoIndex(0);
    };

    const nextPhoto = () => {
        if (selectedPost?.images && currentPhotoIndex < selectedPost.images.length - 1) {
            setCurrentPhotoIndex(prev => prev + 1);
        }
    };

    const prevPhoto = () => {
        if (currentPhotoIndex > 0) {
            setCurrentPhotoIndex(prev => prev - 1);
        }
    };

    const toggleViewMode = () => {
        setViewMode(viewMode === 'posts' ? 'folders' : 'posts');
    };

    // Admin suspend handlers
    const openSuspendModal = () => {
        setShowSuspendModal(true);
        setSuspendReason('');
    };

    const closeSuspendModal = () => {
        setShowSuspendModal(false);
        setSuspendReason('');
    };

    const handleSuspendPost = async () => {
        if (!selectedPost || !suspendReason.trim()) return;
        setIsSuspending(true);
        try {
            const postType = selectedPost.type === 'video' ? 'video' : 'photo';
            await adminPostsAPI.suspendPost(postType, selectedPost.id, suspendReason);
            closeSuspendModal();
            closePostModal();
            alert('Post suspended successfully. User has been notified.');
            // Refresh profile to remove suspended post
            const data = await usersAPI.getUserProfile(username);
            setProfile(data.profile);
        } catch (err) {
            alert(err.message || 'Failed to suspend post');
        } finally {
            setIsSuspending(false);
        }
    };

    // Admin suspend account handlers
    const openSuspendAccountModal = () => {
        setShowSuspendAccountModal(true);
        setSuspendAccountReason('');
    };

    const closeSuspendAccountModal = () => {
        setShowSuspendAccountModal(false);
        setSuspendAccountReason('');
    };

    const handleSuspendAccount = async () => {
        if (!profile?.id || !suspendAccountReason) return;
        setIsSuspendingAccount(true);
        try {
            const reasonLabel = SUSPEND_ACCOUNT_REASON_OPTIONS.find(opt => opt.value === suspendAccountReason)?.label || suspendAccountReason;
            await adminPostsAPI.suspendAccount(profile.id, reasonLabel);
            closeSuspendAccountModal();
            alert(`Account @${profile.username} has been suspended.`);
            // Refresh profile to show suspended status
            const data = await usersAPI.getUserProfile(username);
            setProfile(data.profile);
        } catch (err) {
            alert('Failed to suspend account: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSuspendingAccount(false);
        }
    };

    // Load content from API
    const loadContent = async () => {
        if (!username) return;
        try {
            const data = await usersAPI.getUserContent(username);
            setContentData(data.content || { public: {} });
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    };

    // Handle folder click
    const handleFolderClick = async (folder, isSubfolder = false) => {
        try {
            if (isSubfolder) {
                // For subfolders, filter posts by subfolder ID
                const allPublicVideos = profile?.videos?.filter(v => v.privacy === 'public') || [];
                const allPublicPhotos = profile?.photo_posts?.filter(p => p.privacy === 'public') || [];
                
                const folderVideos = allPublicVideos.filter(v => v.subfolder === folder.id);
                const folderPhotos = allPublicPhotos.filter(p => p.subfolder === folder.id);
                
                setSelectedFolderContent({
                    videos: folderVideos,
                    photos: folderPhotos
                });
            } else {
                // Default folder - combine all public content that's NOT in subfolders
                const publicSection = contentData.public || {};
                const folderContent = {
                    videos: publicSection.videos || [],
                    photos: publicSection.photo_posts || []
                };
                setSelectedFolderContent(folderContent);
            }
            setSelectedFolder(folder);
        } catch (error) {
            console.error('Failed to load folder content:', error);
        }
    };

    // Load content when view mode changes to folders
    useEffect(() => {
        if (viewMode === 'folders' && username) {
            loadContent();
        }
    }, [viewMode, username]);

    const allPosts = [
        ...(profile?.videos || []).map(v => ({ ...v, type: 'video' })),
        ...(profile?.photo_posts || []).map(p => ({ ...p, type: 'photo' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (loading) {
        return (
            <div className="appShell">
                <div className="user-profile-page">
                    <div className="profile-top-bar">
                        <button className="back-button" onClick={onBack}>
                            <FiArrowLeft size={20} />
                        </button>
                        <span className="profile-title">Profile</span>
                        <div style={{ width: 40 }} />
                    </div>
                    <div className="profile-loading">
                        <p>Loading...</p>
                    </div>
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="appShell">
                <div className="user-profile-page">
                    <div className="profile-top-bar">
                        <button className="back-button" onClick={onBack}>
                            <FiArrowLeft size={20} />
                        </button>
                        <span className="profile-title">Profile</span>
                        <div style={{ width: 40 }} />
                    </div>
                    <div className="profile-not-found">
                        <p>{error || 'User not found'}</p>
                    </div>
                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Private profile view - user doesn't have access
    if (profile.is_private && !profile.has_access) {
        return (
            <div className="appShell">
                <div className="user-profile-page">
                    <div className="profile-top-bar">
                        <button className="back-button" onClick={onBack}>
                            <FiArrowLeft size={20} />
                        </button>
                        <span className="profile-title">@{profile.username}</span>
                        <div style={{ width: 40 }} />
                    </div>

                    <div className="profile-content">
                        <div className="private-profile-view">
                            <div className="private-profile-icon">
                                <FiLock size={48} />
                            </div>
                            <h2 className="private-profile-title">This Account is Private</h2>
                            <p className="private-profile-message">
                                Request access to see their posts and content.
                            </p>

                            {accessStatus === 'pending' ? (
                                <div className="access-status pending">
                                    <FiClock size={20} />
                                    <span>Access Request Pending</span>
                                </div>
                            ) : accessStatus === 'denied' ? (
                                <div className="access-status denied">
                                    <FiXCircle size={20} />
                                    <span>Access Request Denied</span>
                                    <button
                                        className="request-access-btn retry"
                                        onClick={handleRequestAccess}
                                        disabled={accessRequestLoading}
                                    >
                                        {accessRequestLoading ? 'Sending...' : 'Request Again'}
                                    </button>
                                </div>
                            ) : currentUser ? (
                                <button
                                    className="request-access-btn"
                                    onClick={handleRequestAccess}
                                    disabled={accessRequestLoading}
                                >
                                    {accessRequestLoading ? 'Sending...' : 'Request Access'}
                                </button>
                            ) : (
                                <p className="login-prompt">Log in to request access</p>
                            )}
                        </div>
                    </div>

                    <BottomNav onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    return (
        <div className="appShell">
            <div className="user-profile-page">
                {/* Top Bar */}
                <div className="profile-top-bar">
                    <button className="back-button" onClick={onBack}>
                        <FiArrowLeft size={20} />
                    </button>
                    <span className="profile-title">@{profile.username}</span>
                    {!isOwnProfile && currentUser ? (
                        <button
                            className={`favorite-talent-btn ${isFavorited ? 'favorited' : ''}`}
                            onClick={handleToggleFavorite}
                            disabled={favoriteLoading}
                        >
                            <FiStar
                                size={20}
                                fill={isFavorited ? '#facc15' : 'none'}
                                color={isFavorited ? '#facc15' : 'currentColor'}
                            />
                        </button>
                    ) : (
                        <div style={{ width: 40 }} />
                    )}
                </div>

                {/* Profile Content */}
                <div className="profile-content">
                    {/* Privacy Indicator */}
                    <div className="privacy-container">
                        {profile.is_private ? (
                            <FiLock size={20} style={{ color: '#74a0ff' }} title="Private Profile" />
                        ) : (
                            <FiGlobe size={20} style={{ color: '#74a0ff' }} title="Public Profile" />
                        )}
                    </div>
                    {/* Collaboration Logo */}
                    <div className="collab-container">
                        <MdHandshake size={22}/>
                        <div className="num-collabs">
                            {formatNumber(profile.collaboration_count || 0)}
                        </div>
                    </div>
                    {/* Avatar & Info */}
                    <div className="profile-header">
                        <div className="profile-avatar">
                            {profile.profile_picture ? (
                                <img src={profile.profile_picture} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                                profile.username?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <h1 className="profile-display-name">{profile.username}</h1>
                        {profile.genre && <span className="profile-genre">{profile.genre}</span>}
                        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                    </div>

                    {/* Stats */}
                    <div className="profile-stats">
                        <div className="stat-item">
                            <span className="stat-value">{formatNumber(profile.post_count || 0)}</span>
                            <span className="stat-label">Posts</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="profile-actions">
                        <button
                            className="message-btn"
                            onClick={() => {
                                if (onMessage) {
                                    onMessage(profile.id, profile.username);
                                }
                            }}
                        >
                            Message
                        </button>
                        {isAdmin && !isOwnProfile && (
                            <button
                                className="suspend-account-btn"
                                onClick={openSuspendAccountModal}
                                style={{
                                    padding: '10px 20px',
                                    background: profile.is_suspended ? '#666' : '#dc2626',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: profile.is_suspended ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                disabled={profile.is_suspended}
                            >
                                <FiUserX size={16} />
                                {profile.is_suspended ? 'Account Suspended' : 'Suspend Account'}
                            </button>
                        )}
                    </div>

                    {/* Content Grid */}
                    <div className="content-section">
                        <div className="content-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                            <div className="content-tab active">
                                <FiGrid size={18} />
                                <span>{viewMode === 'posts' ? 'Posts' : 'Folders'}</span>
                            </div>
                            <button 
                                className="toggle-view-btn" 
                                onClick={toggleViewMode}
                                style={{
                                    background: 'rgba(74, 158, 255, 0.2)',
                                    border: '1px solid rgba(74, 158, 255, 0.4)',
                                    borderRadius: '12px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: '#74a0ff',
                                    transition: 'all 0.2s ease',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = 'rgba(74, 158, 255, 0.3)';
                                    e.target.style.borderColor = 'rgba(74, 158, 255, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'rgba(74, 158, 255, 0.2)';
                                    e.target.style.borderColor = 'rgba(74, 158, 255, 0.4)';
                                }}
                            >
                                <FiFolder size={16} />
                            </button>
                        </div>

                        {viewMode === 'posts' ? (
                            // Posts view
                            allPosts.length > 0 ? (
                                <div className="content-grid">
                                    {allPosts.map((post) => (
                                        <button
                                            key={`${post.type}-${post.id}`}
                                            type="button"
                                            className="content-item content-item--button"
                                            onClick={() => openPost(post, post.type)}
                                            aria-label="View post"
                                        >
                                            {post.type === 'video' ? (
                                                <>
                                                    <video
                                                        src={post.stream_url || post.video_url}
                                                        muted
                                                        loop
                                                        className="content-thumbnail"
                                                    />
                                                    <div className="content-overlay">
                                                        <FiPlay size={24} />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <img
                                                        src={post.images?.[0]?.image_url}
                                                        alt={post.title || 'Photo post'}
                                                        className="content-thumbnail"
                                                    />
                                                    <div className="content-overlay">
                                                        <FiImage size={24} />
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-posts">
                                    <p>No posts yet</p>
                                </div>
                            )
                        ) : (
                            // Folders view like MainProfile
                            selectedFolder ? (
                                <div className="folder-content-view">
                                    <div className="folder-header">
                                        <button 
                                            className="back-to-folders"
                                            onClick={() => setSelectedFolder(null)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                color: '#ffffff',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            ← Back to Folders
                                        </button>
                                        <h3 className="folder-title" style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            color: '#ffffff',
                                            margin: '0',
                                            textAlign: 'center',
                                            flex: '1'
                                        }}>{selectedFolder.name}</h3>
                                        <div className="folder-item-count" style={{
                                            fontSize: '12px',
                                            color: 'rgba(255, 255, 255, 0.6)'
                                        }}>
                                            {(selectedFolderContent.videos?.length || 0) + (selectedFolderContent.photos?.length || 0)} items
                                        </div>
                                    </div>
                                    
                                    {(selectedFolderContent.videos?.length || 0) + (selectedFolderContent.photos?.length || 0) > 0 ? (
                                        <div className="content-grid">
                                            {[
                                                ...(selectedFolderContent.videos || []).map(v => ({ ...v, type: 'video' })),
                                                ...(selectedFolderContent.photos || []).map(p => ({ ...p, type: 'photo' }))
                                            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((post) => (
                                                <button
                                                    key={`${post.type}-${post.id}`}
                                                    type="button"
                                                    className="content-item content-item--button"
                                                    onClick={() => openPost(post, post.type)}
                                                    aria-label="View post"
                                                >
                                                    {post.type === 'video' ? (
                                                        <>
                                                            <video
                                                                src={post.stream_url || post.video_url}
                                                                muted
                                                                loop
                                                                className="content-thumbnail"
                                                            />
                                                            <div className="content-overlay">
                                                                <FiPlay size={24} />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <img
                                                                src={post.images?.[0]?.image_url}
                                                                alt={post.title || 'Photo post'}
                                                                className="content-thumbnail"
                                                            />
                                                            <div className="content-overlay">
                                                                <FiImage size={24} />
                                                            </div>
                                                        </>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="no-posts">
                                            <p>This folder is empty</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="folders-view">
                                    {/* Default Folder */}
                                    <div className="folder-main-section" style={{
                                        marginBottom: '20px',
                                        padding: '16px',
                                        border: '1px solid rgba(116, 116, 116, 0.2)',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(116, 116, 116, 0.05)'
                                    }}>
                                        <button
                                            className="folder-main-button"
                                            onClick={() => handleFolderClick({ name: 'Default', type: 'public' }, false)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                background: 'none',
                                                border: 'none',
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                cursor: 'pointer',
                                                padding: '8px 0'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FiFolder size={18} color="#747474" />
                                                <span style={{ fontSize: '16px', fontWeight: '600' }}>Default</span>
                                                <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                    ({(contentData.public?.videos?.length || 0) + (contentData.public?.photo_posts?.length || 0)} items)
                                                </span>
                                            </div>
                                            <FiFolder size={16} />
                                        </button>
                                    </div>

                                    {/* All Folders with their Subfolders */}
                                    <div className="all-folders" style={{ marginBottom: '20px' }}>
                                        {(() => {
                                            const allFolders = [...(contentData.public?.subfolders || [])];
                                            const rootFolders = allFolders.filter(folder => !folder.name.includes(' > '));
                                            
                                            return rootFolders.map((folder) => {
                                                const subfolders = allFolders.filter(subfolder => 
                                                    subfolder.name.startsWith(folder.name + ' > ')
                                                );
                                                
                                                return (
                                                    <div key={`folder-group-${folder.id}`} className="folder-group" style={{ marginBottom: '16px' }}>
                                                        {/* Root Folder */}
                                                        <button
                                                            className="main-folder-button"
                                                            onClick={() => handleFolderClick(folder, true)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                width: '100%',
                                                                padding: '12px 16px',
                                                                border: '1px solid rgba(116, 116, 116, 0.2)',
                                                                borderRadius: '8px',
                                                                backgroundColor: 'rgba(116, 116, 116, 0.05)',
                                                                cursor: 'pointer',
                                                                color: 'rgba(255, 255, 255, 0.9)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <FiFolder size={16} color="#747474" />
                                                                <span style={{ fontSize: '16px', fontWeight: '500' }}>{folder.name}</span>
                                                                <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                    ({(folder.video_count || 0) + (folder.photo_post_count || 0)} items)
                                                                </span>
                                                            </div>
                                                            <FiFolder size={14} color="#747474" />
                                                        </button>
                                                        
                                                        {/* Subfolders */}
                                                        {subfolders.map((subfolder) => (
                                                            <button
                                                                key={`subfolder-${subfolder.id}`}
                                                                className="subfolder-button"
                                                                onClick={() => handleFolderClick(subfolder, true)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    width: '100%',
                                                                    padding: '8px 16px 8px 32px', // Indent for subfolder
                                                                    marginTop: '4px',
                                                                    border: '1px solid rgba(116, 116, 116, 0.1)',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: 'rgba(116, 116, 116, 0.02)',
                                                                    cursor: 'pointer',
                                                                    color: 'rgba(255, 255, 255, 0.8)',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <FiFolder size={14} color="#999" />
                                                                    <span style={{ fontSize: '14px', fontWeight: '400' }}>
                                                                        {subfolder.name.split(' > ').pop()}
                                                                    </span>
                                                                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                        ({(subfolder.video_count || 0) + (subfolder.photo_post_count || 0)} items)
                                                                    </span>
                                                                </div>
                                                                <FiFolder size={12} color="#999" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })
                                        })()}

                                        {(contentData.public?.videos?.length || contentData.public?.photo_posts?.length || contentData.public?.subfolders?.length) === 0 && (
                                            <div className="no-posts">
                                                <p>No public content available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Post View Modal */}
                {selectedPost && (
                    <div className="profileModalOverlay" onClick={closePostModal}>
                        <div className="profileModal" onClick={(e) => e.stopPropagation()}>
                            <div className="profileModalHeader">
                                <button
                                    type="button"
                                    className="profileModalClose"
                                    onClick={closePostModal}
                                    aria-label="Close"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {selectedPost.type === 'video' ? (
                                <video
                                    className="profileModalVideo"
                                    src={selectedPost.stream_url || selectedPost.video_url}
                                    controls
                                    autoPlay
                                    playsInline
                                />
                            ) : (
                                <div className="profileModalPhotoContainer">
                                    <img
                                        className="profileModalPhoto"
                                        src={selectedPost.images?.[currentPhotoIndex]?.image_url}
                                        alt={selectedPost.title || 'Photo'}
                                    />
                                    {selectedPost.images?.length > 1 && (
                                        <>
                                            <div className="photoNavigation">
                                                <button
                                                    className="photoNavBtn"
                                                    onClick={prevPhoto}
                                                    disabled={currentPhotoIndex === 0}
                                                >
                                                    ‹
                                                </button>
                                                <span className="photoCounter">
                                                    {currentPhotoIndex + 1} / {selectedPost.images.length}
                                                </span>
                                                <button
                                                    className="photoNavBtn"
                                                    onClick={nextPhoto}
                                                    disabled={currentPhotoIndex === selectedPost.images.length - 1}
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="videoInfoPanel">
                                <h3 className="videoInfoTitle">{selectedPost.title || "Untitled"}</h3>
                                <p className="postOwner">@{profile.username}</p>
                                {isAdmin && (
                                    <button
                                        className="admin-suspend-btn"
                                        onClick={openSuspendModal}
                                        style={{
                                            marginTop: '12px',
                                            padding: '8px 16px',
                                            background: '#dc2626',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FiAlertOctagon size={16} />
                                        Suspend Post
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Suspend Post Modal */}
                {showSuspendModal && selectedPost && (
                    <div className="profileModalOverlay" onClick={closeSuspendModal}>
                        <div className="profileModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="profileModalHeader">
                                <h3 style={{ margin: 0, color: 'white' }}>Suspend Post</h3>
                                <button
                                    type="button"
                                    className="profileModalClose"
                                    onClick={closeSuspendModal}
                                    aria-label="Close"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                                    This will suspend the post and notify the user.
                                </p>
                                <textarea
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                    placeholder="Enter suspension reason..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px',
                                        resize: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    <button
                                        onClick={closeSuspendModal}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: '#444',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSuspendPost}
                                        disabled={!suspendReason.trim() || isSuspending}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: isSuspending ? '#666' : '#dc2626',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            cursor: isSuspending ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FiAlertOctagon size={16} />
                                        {isSuspending ? 'Suspending...' : 'Suspend'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Suspend Account Modal */}
                {showSuspendAccountModal && (
                    <div className="profileModalOverlay" onClick={closeSuspendAccountModal}>
                        <div className="profileModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="profileModalHeader">
                                <h3 style={{ margin: 0, color: 'white' }}>Suspend Account</h3>
                                <button
                                    type="button"
                                    className="profileModalClose"
                                    onClick={closeSuspendAccountModal}
                                    aria-label="Close"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                                    Suspending account: <strong style={{ color: 'white' }}>@{profile.username}</strong>
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px', fontSize: '13px' }}>
                                    This will prevent the user from logging in and hide all their content.
                                </p>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                                    Suspension Reason
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {SUSPEND_ACCOUNT_REASON_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                background: suspendAccountReason === option.value ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255,255,255,0.05)',
                                                border: suspendAccountReason === option.value ? '1px solid #dc2626' : '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="suspendAccountReason"
                                                value={option.value}
                                                checked={suspendAccountReason === option.value}
                                                onChange={(e) => setSuspendAccountReason(e.target.value)}
                                                style={{ accentColor: '#dc2626' }}
                                            />
                                            <span style={{ color: 'white', fontSize: '14px' }}>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                    <button
                                        onClick={closeSuspendAccountModal}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#444',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSuspendAccount}
                                        disabled={!suspendAccountReason || isSuspendingAccount}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: (!suspendAccountReason || isSuspendingAccount) ? '#666' : '#dc2626',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: (!suspendAccountReason || isSuspendingAccount) ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            fontSize: '14px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        <FiUserX size={16} />
                                        {isSuspendingAccount ? 'Suspending...' : 'Suspend Account'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}
