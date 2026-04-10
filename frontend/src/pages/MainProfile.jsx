import { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/layout/BottomNav";
import { FiArrowLeft, FiGrid, FiMenu, FiX, FiSettings, FiSliders, FiEye, FiCreditCard, FiUsers, FiGift, FiHelpCircle, FiStar, FiEdit, FiGlobe, FiLock, FiCheck, FiLoader, FiFolder, FiPlus, FiChevronRight, FiCamera, FiEyeOff } from "react-icons/fi";
import { videosAPI, postsAPI, foldersAPI, contentAPI, agencyAPI, authAPI, privacyAPI } from "../services/api";
import { MdHandshake } from "react-icons/md";
import FolderOptionsModal from "../components/FolderOptionsModal";
import "../styles/UserProfile.css";
import "../styles/Sidebar.css";

export default function MainProfile({ onMenuNavigate, onBack, onNavigate, onNavigateToSettings, onProfileClick, onAgencyTalentClick }) {
    //main profile shows the logged in user's profile
    const { user, checkAuth } = useAuth();

    const [myVideos, setMyVideos] = useState([]);
    const [myPhotos, setMyPhotos] = useState([]);
    const [videosLoading, setVideosLoading] = useState(true);
    const [videosError, setVideosError] = useState("");
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
    const fileInputRef = useRef(null);

    // Remove post-level privacy editing - now folder-level only
    // Legacy folder edit states removed (unused)

    // New folder structure state
    const [viewMode, setViewMode] = useState('posts'); // 'posts' or 'folders'
    const [contentData, setContentData] = useState({ public: {}, private: {} });
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedFolderContent, setSelectedFolderContent] = useState({ videos: [], photos: [] });
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderParent, setNewFolderParent] = useState('root');
    const [newFolderPrivacy, setNewFolderPrivacy] = useState('public');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [folderCreateError, setFolderCreateError] = useState('');
    
    // Expandable folder tree state
    const [loadingFolderContent, setLoadingFolderContent] = useState(false);
    const [expandedRootId, setExpandedRootId] = useState(null);

    // Folder options modal state
    const [folderOptionsModal, setFolderOptionsModal] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressThreshold = 500; // 500ms for long press

    // Agency talents state (for agency accounts)
    const [agencyTalents, setAgencyTalents] = useState([]);
    const [agencyTalentsLoading, setAgencyTalentsLoading] = useState(false);

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Profile visibility modal state
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    // Only allow talent, agency_talent, and agency to change visibility
    const allowedVisibilityTypes = ['talent', 'agency_talent', 'agency'];
    const canChangeVisibility = user && allowedVisibilityTypes.includes(user.account_type);
    // Agency Talents can only use Public and Hidden (not Private)
    const isAgencyTalent = user?.account_type === 'agency_talent';

    const visibilityOptions = [
        {
            value: 'public',
            label: 'Public Profile',
            description: 'Visible to everyone. Your profile appears in search results.',
            icon: FiGlobe
        },
        ...(isAgencyTalent ? [] : [{
            value: 'private',
            label: 'Private Profile',
            description: 'Users must request access to view your profile and content.',
            icon: FiLock
        }]),
        {
            value: 'hidden',
            label: 'Hidden Profile',
            description: 'Not discoverable in search, but accessible via direct link.',
            icon: FiEyeOff
        }
    ];
        const handleMenuItemClick = (page) => {
            setSidebarOpen(false);
            if (onMenuNavigate) {
                onMenuNavigate(page);
            }
        };
        const handleSettingsClick = () => {
            setSidebarOpen(false);
            if (onNavigateToSettings) {
                onNavigateToSettings();
            }
        };
        
    const formatNumber = (num) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K";
        }
        return num;
    };

    // Long-press handlers for folders
    const handleFolderLongPressStart = (folder, isSubfolder) => {
        longPressTimerRef.current = setTimeout(() => {
            setFolderOptionsModal({ folder, isSubfolder });
        }, longPressThreshold);
    };

    const handleFolderLongPressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleUpdateFolderPrivacy = async (folderId, privacy, isSubfolder) => {
        if (isSubfolder) {
            await foldersAPI.updateSubfolderPrivacy(folderId, privacy);
        } else {
            await foldersAPI.updateFolderPrivacy(folderId, privacy);
        }
        // Reload content to reflect changes
        await loadContent();
    };

    const handleDeleteFolder = async (folderId, isSubfolder) => {
        // Delete via the existing API
        if (isSubfolder) {
            await contentAPI.deleteSubfolder(folderId);
        } else {
            await foldersAPI.deleteFolder(folderId);
        }
        // Reload content to reflect changes
        await loadContent();
        // Close folder view if it's open
        if (selectedFolder && selectedFolder.id === folderId) {
            setSelectedFolder(null);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            setFolderCreateError('Please enter a folder name');
            return;
        }

        setCreatingFolder(true);
        setFolderCreateError('');

        try {
            let folderName = newFolderName.trim();
            
            // If creating a subfolder, prefix with parent name
            if (newFolderParent !== 'root') {
                const allFolders = [...(contentData.public?.subfolders || []), ...(contentData.private?.subfolders || [])];
                const parentFolder = allFolders.find(f => f.id.toString() === newFolderParent);
                if (parentFolder) {
                    folderName = `${parentFolder.name} > ${folderName}`;
                }
            }
            
            await contentAPI.createSubfolder(folderName, newFolderPrivacy);
            
            // Reload content
            await loadContent();
            
            // Reset form
            setNewFolderName('');
            setNewFolderPrivacy('public');
            setNewFolderParent('root');
            setShowCreateFolder(false);
        } catch (error) {
            setFolderCreateError(error.message || 'Failed to create folder');
        } finally {
            setCreatingFolder(false);
        }
    };

    const cancelCreateFolder = () => {
        setShowCreateFolder(false);
        setNewFolderName('');
        setNewFolderPrivacy('public');
        setNewFolderParent('root');
        setFolderCreateError('');
    };

    const handleProfilePictureClick = () => {
        fileInputRef.current?.click();
    };

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 10485760) {
            alert('Image must be less than 10MB');
            return;
        }

        setUploadingProfilePic(true);
        try {
            await authAPI.uploadProfilePicture(file);
            await checkAuth();
        } catch (error) {
            alert(error.message || 'Failed to upload profile picture');
        } finally {
            setUploadingProfilePic(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const toggleViewMode = () => {
        setViewMode(viewMode === 'posts' ? 'folders' : 'posts');
    };

    const handleVisibilityChange = async (newSetting) => {
        if (newSetting === user.privacy_setting || savingVisibility) return;

        setSavingVisibility(true);
        try {
            await privacyAPI.updatePrivacySettings(newSetting);
            await checkAuth(); // Refresh user data to get updated privacy_setting
            setShowVisibilityModal(false);
        } catch (err) {
            alert('Failed to update profile visibility: ' + (err.message || 'Unknown error'));
        } finally {
            setSavingVisibility(false);
        }
    };

    // Load content from API
    const loadContent = async () => {
        try {
            const data = await contentAPI.getMyContent();
            setContentData(data || { public: {}, private: {} });
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    };

    // No global tree expansion now; using expandedRootId per root tile

    // Handle folder click - load and display content below
    const handleFolderClick = async (folder, isSubfolder = false) => {
        setLoadingFolderContent(true);
        try {
            if (isSubfolder) {
                // Load subfolder content
                const data = await contentAPI.getSubfolderDetail(folder.id);
                setSelectedFolderContent({
                    videos: data.videos || [],
                    photos: data.photo_posts || []
                });
            } else {
                // Default folder - combine content from both public and private that's not in subfolders
                const publicSection = contentData.public || {};
                const privateSection = contentData.private || {};
                setSelectedFolderContent({
                    videos: [...(publicSection.videos || []), ...(privateSection.videos || [])],
                    photos: [...(publicSection.photo_posts || []), ...(privateSection.photo_posts || [])]
                });
            }
            setSelectedFolder({ ...folder, isSubfolder });
        } catch (error) {
            console.error('Failed to load folder content:', error);
        } finally {
            setLoadingFolderContent(false);
        }
    };

    const closeVideoModal = () => {
        setSelectedVideo(null);
    };

    useEffect(() => {
        const loadMyContent = async () => {
            setVideosLoading(true);
            setVideosError("");
            try {
                // Load videos and photos for posts view
                const vids = await videosAPI.getMyVideos();
                setMyVideos(vids?.videos || []);
                // Also fetch unified posts and filter photos by current user
                const posts = await postsAPI.getFeed();
                const photos = (posts?.posts || []).filter(p => p.type === 'photo' && (p.user === user.id || p.user_username === user.username));
                setMyPhotos(photos);

                // Load folders for editing (legacy - no longer needed)
                // const folderData = await foldersAPI.getFolders();
                // setFolders(folderData || []);

                // Load content organized by public/private
                await loadContent();

                // If user is an agency, load their agency talents
                if (user?.account_type === 'agency') {
                    setAgencyTalentsLoading(true);
                    try {
                        const talentsData = await agencyAPI.getAgencyTalents();
                        setAgencyTalents(talentsData.agency_talents || []);
                    } catch (err) {
                        console.error('Failed to load agency talents:', err);
                    } finally {
                        setAgencyTalentsLoading(false);
                    }
                }
            } catch (e) {
                setVideosError(e?.message || "Failed to load posts");
            } finally {
                setVideosLoading(false);
            }
        };

        if (user?.id) {
            loadMyContent();
        }
    }, [user?.id, user?.username, user?.account_type]);

    return (
        <div className="appShell">
            <div className="user-profile-page">
                {/* Top Bar */}
                <div className="profile-top-bar">
                    <button className="back-button" onClick={onBack}>
                        <FiArrowLeft size={20} />
                    </button>
                    <span className="profile-title">@{user.username}</span>
                    <button 
                    className="menuButton" 
                    onClick={() => setSidebarOpen(true)} 
                    title="Menu"
                >
                    <FiMenu size={20} />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="profile-content">
                    {/* Privacy Indicator - Only shown for talent/agency accounts */}
                    {canChangeVisibility && (
                        <button
                            className="privacy-container"
                            onClick={() => setShowVisibilityModal(true)}
                            title="Change Profile Visibility"
                        >
                            {user.privacy_setting === 'private' ? (
                                <FiLock size={20} style={{ color: '#74a0ff' }} />
                            ) : user.privacy_setting === 'hidden' ? (
                                <FiEyeOff size={20} style={{ color: '#74a0ff' }} />
                            ) : (
                                <FiGlobe size={20} style={{ color: '#74a0ff' }} />
                            )}
                        </button>
                    )}
                    {/* Collaboration Logo */}
                    <div className="collab-container">
                        <MdHandshake size={22}/>
                        <div className="num-collabs">
                            {formatNumber(user.collaboration_count || 0)}
                        </div>
                    </div>
                    {/* Avatar & Info */}
                    <div className="profile-header">
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                            <div className="profile-avatar" onClick={handleProfilePictureClick} style={{ cursor: 'pointer', marginBottom: 0 }}>
                                {user.profile_picture ? (
                                    <img src={user.profile_picture} alt={user.username} />
                                ) : (
                                    user.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div onClick={handleProfilePictureClick} style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                background: 'rgba(74, 158, 255, 0.9)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #0a0a0a',
                                cursor: 'pointer'
                            }}>
                                {uploadingProfilePic ? (
                                    <FiLoader size={16} className="spin" />
                                ) : (
                                    <FiCamera size={16} />
                                )}
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            style={{ display: 'none' }}
                        />
                        <h1 
                            className="profile-display-name" 
                            onClick={() => onProfileClick && onProfileClick(user)}
                            style={{ cursor: onProfileClick ? 'pointer' : undefined }}
                        >
                            {user.username}
                        </h1>
                        {user.genre ? <span className="profile-genre">{user.genre}</span> : null}
                        {user.bio ? <p className="profile-bio">{user.bio}</p> : null}
                    </div>

                    {/* Stats */}
                    <div className="profile-stats">
                        <div className="stat-item">
                            <span className="stat-value">{formatNumber(myVideos.length + myPhotos.length)}</span>
                            <span className="stat-label">Posts</span>
                        </div>
                        {user?.account_type === 'agency' && (
                            <div className="stat-item">
                                <span className="stat-value">{agencyTalents.length}</span>
                                <span className="stat-label">Talents</span>
                            </div>
                        )}
                    </div>

                    {/* Agency Talents Section (only for agency accounts) */}
                    {user?.account_type === 'agency' && (
                        <div className="agency-talents-section" style={{ marginTop: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '16px' }}>
                                <FiUsers size={18} color="#74a0ff" />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    My Agency Talents
                                </h3>
                            </div>
                            {agencyTalentsLoading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                                    <FiLoader size={20} className="spin" style={{ marginBottom: '8px' }} />
                                    <p style={{ margin: 0 }}>Loading talents...</p>
                                </div>
                            ) : agencyTalents.length === 0 ? (
                                <div style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <FiUsers size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                    <p style={{ margin: 0 }}>No agency talents yet</p>
                                    <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Invite talents to join your agency</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {agencyTalents.map((talent) => (
                                        <button
                                            key={talent.id}
                                            onClick={() => onAgencyTalentClick && onAgencyTalentClick(talent.id, talent.username)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 14px',
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                width: '100%',
                                                textAlign: 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            }}
                                        >
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: 'white',
                                                flexShrink: 0
                                            }}>
                                                {talent.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '15px', fontWeight: '500', color: 'white' }}>
                                                    @{talent.username}
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                    {talent.total_posts} posts • {talent.privacy_setting}
                                                </div>
                                            </div>
                                            <FiChevronRight size={18} color="rgba(255, 255, 255, 0.4)" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content Grid - Hidden for agency accounts since they can't post */}
                    {user?.account_type !== 'agency' && (
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
                            <div className="content-grid">
                                {videosLoading ? (
                                    <div className="profileGridStatus">Loading posts...</div>
                                ) : videosError ? (
                                    <div className="profileGridStatus profileGridStatus--error">{videosError}</div>
                                ) : myVideos.length === 0 && myPhotos.length === 0 ? (
                                    <div className="profileGridStatus">No posts yet</div>
                                ) : (
                                    <>
                                        {myVideos.map((video) => (
                                            <button
                                                key={`video-${video.id}`}
                                                type="button"
                                                className="content-item content-item--button"
                                                onClick={() => setSelectedVideo(video)}
                                                aria-label="Open post"
                                            >
                                                <video
                                                    className="content-thumbnail"
                                                    src={video.stream_url || video.video_url}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                />
                                                <div className="content-overlay">▶</div>
                                            </button>
                                        ))}
                                        {myPhotos.map((post) => (
                                            <div key={`photo-${post.id}`} className="content-item">
                                                <img
                                                    className="content-thumbnail"
                                                    src={(post.images && post.images[0] && (post.images[0].image_url || post.images[0].stream_url)) || ''}
                                                    alt="photo post"
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="folders-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {videosLoading ? (
                                    <div className="profileGridStatus">Loading folders...</div>
                                ) : (
                                    <>
                                        {/* Folder Explorer Tree */}
                                        <div className="folder-explorer" style={{
                                            border: '1px solid rgba(116, 160, 255, 0.2)',
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(10, 10, 10, 0.6)',
                                            padding: '14px',
                                            backdropFilter: 'blur(10px)'
                                        }}>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                marginBottom: '12px',
                                                paddingLeft: '8px',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase'
                                            }}>
                                                Folders
                                            </div>

                                            {/* Root Folders Grid (Finder-like) */}
                                            {(() => {
                                                const allFolders = [...(contentData.public?.subfolders || []), ...(contentData.private?.subfolders || [])];
                                                const rootFolders = allFolders.filter(f => !f.name.includes(' > '));
                                                const gridItems = [
                                                    { key: 'default', name: 'Default', isDefault: true, count: (contentData.public?.videos?.length || 0) + (contentData.public?.photo_posts?.length || 0) },
                                                    ...rootFolders.map(f => ({ key: `root-${f.id}`, ...f, isDefault: false }))
                                                ];

                                                const BlueFolderIcon = ({ size = 64 }) => (
                                                    <svg width={size} height={Math.round(size*0.78)} viewBox="0 0 64 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 12C4 9.79086 5.79086 8 8 8H26L30 14H56C58.2091 14 60 15.7909 60 18V42C60 44.2091 58.2091 46 56 46H8C5.79086 46 4 44.2091 4 42V12Z" fill="url(#blue-fold)" stroke="#5aa7ff" strokeWidth="1.2"/>
                                                        <defs>
                                                            <linearGradient id="blue-fold" x1="32" y1="8" x2="32" y2="46" gradientUnits="userSpaceOnUse">
                                                                <stop stopColor="#6ec4ff"/>
                                                                <stop offset="1" stopColor="#2f86ff"/>
                                                            </linearGradient>
                                                        </defs>
                                                    </svg>
                                                );

                                                const getFolderPreviewImages = (item) => {
                                                    if (item.isDefault) {
                                                        const posts = [
                                                            ...(contentData.public?.photo_posts || []),
                                                            ...(contentData.private?.photo_posts || [])
                                                        ];
                                                        const urls = [];
                                                        for (const post of posts) {
                                                            if (post.images && post.images.length > 0) {
                                                                urls.push(post.images[0].image_url);
                                                                if (urls.length >= 3) break;
                                                            }
                                                        }
                                                        return urls;
                                                    }
                                                    return item.preview_images || [];
                                                };

                                                return (
                                                    <>
                                                        <div className="folder-grid">
                                                            {gridItems.map((item) => {
                                                                const isSelected = item.isDefault
                                                                    ? (selectedFolder?.name === 'Default' && !selectedFolder?.isSubfolder)
                                                                    : (selectedFolder?.id === item.id && selectedFolder?.isSubfolder);
                                                                const isExpanded = !item.isDefault && expandedRootId === item.id;
                                                                const count = item.isDefault ? item.count : ((item.video_count || 0) + (item.photo_post_count || 0));

                                                                const onClick = () => {
                                                                    if (item.isDefault) {
                                                                        handleFolderClick({ name: 'Default', type: 'public' }, false);
                                                                        setExpandedRootId(null);
                                                                    } else {
                                                                        handleFolderClick(item, true);
                                                                        setExpandedRootId(prev => prev === item.id ? null : item.id);
                                                                    }
                                                                };

                                                                return (
                                                                    <button
                                                                        key={item.key}
                                                                        className={`folder-tile ${isSelected ? 'folder-tile--selected' : ''}`}
                                                                        onClick={onClick}
                                                                        onContextMenu={(e) => {
                                                                            if (!item.isDefault) {
                                                                                e.preventDefault();
                                                                                setFolderOptionsModal({ folder: item, isSubfolder: true });
                                                                            }
                                                                        }}
                                                                        onMouseDown={() => { if (!item.isDefault) handleFolderLongPressStart(item, true); }}
                                                                        onMouseUp={handleFolderLongPressEnd}
                                                                        onTouchStart={() => { if (!item.isDefault) handleFolderLongPressStart(item, true); }}
                                                                        onTouchEnd={handleFolderLongPressEnd}
                                                                    >
                                                                        <div className="folder-tile__preview">
                                                                            {(() => {
                                                                                const previewUrls = getFolderPreviewImages(item);
                                                                                if (previewUrls.length === 0) {
                                                                                    return (
                                                                                        <div className="folder-tile__icon">
                                                                                            <BlueFolderIcon size={64} />
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    <div className="folder-tile__thumbs">
                                                                                        {previewUrls.slice(0, 3).map((url, i) => (
                                                                                            <div key={i} className="folder-tile__thumb">
                                                                                                <img src={url} alt="" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="folder-tile__label">{item.name}</div>
                                                                        <div className="folder-tile__count">{count}</div>
                                                                        {!item.isDefault && (
                                                                            <div className={`folder-tile__chev ${isExpanded ? 'open' : ''}`}>
                                                                                <FiChevronRight size={16} />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Expanded Root Subfolders Panel */}
                                                        {rootFolders.map((root) => {
                                                            if (expandedRootId !== root.id) return null;
                                                            const subfolders = allFolders.filter(sf => sf.name.startsWith(root.name + ' > '));
                                                            // if (!subfolders.length) return (
                                                            //     <div key={`panel-${root.id}`} className="subfolder-panel empty">
                                                            //         <div className="subfolder-panel__root">
                                                            //             <BlueFolderIcon size={40} />
                                                            //             <span>{root.name}</span>
                                                            //         </div>
                                                            //         <div className="subfolder-panel__empty">No subfolders yet</div>
                                                            //     </div>
                                                            // );

                                                            return (
                                                                // <div key={`panel-${root.id}`} className="subfolder-panel">
                                                                //     <div className="subfolder-panel__root">
                                                                //         <BlueFolderIcon size={40} />
                                                                //         <span>{root.name}</span>
                                                                //     </div>
                                                                //     <div className="subfolder-panel__tree">
                                                                //         <div className="subfolder-panel__line-vert" />
                                                                //         <div className="subfolder-list">
                                                                //             {subfolders.map((sf) => {
                                                                //                 const isSubSelected = selectedFolder?.id === sf.id && selectedFolder?.isSubfolder;
                                                                //                 return (
                                                                //                     <div key={`sf-${sf.id}`} className="subfolder-list__item">
                                                                //                         <div className="subfolder-panel__line-horz" />
                                                                //                         <button
                                                                //                             className={`subfolder-chip ${isSubSelected ? 'selected' : ''}`}
                                                                //                             onClick={() => handleFolderClick(sf, true)}
                                                                //                             onContextMenu={(e) => { e.preventDefault(); setFolderOptionsModal({ folder: sf, isSubfolder: true }); }}
                                                                //                             onMouseDown={() => handleFolderLongPressStart(sf, true)}
                                                                //                             onMouseUp={handleFolderLongPressEnd}
                                                                //                             onTouchStart={() => handleFolderLongPressStart(sf, true)}
                                                                //                             onTouchEnd={handleFolderLongPressEnd}
                                                                //                         >
                                                                //                             <span className="subfolder-chip__icon"/>
                                                                //                             <span className="subfolder-chip__label">{sf.name.split(' > ').pop()}</span>
                                                                //                             <span className="subfolder-chip__count">{(sf.video_count || 0) + (sf.photo_post_count || 0)}</span>
                                                                //                         </button>
                                                                //                     </div>
                                                                //                 );
                                                                //             })}
                                                                //         </div>
                                                                //     </div>
                                                                // </div>
                                                                <div key={`panel-${root.id}`} className="subfolder-grid-panel">
                                                                <div className="subfolder-grid-panel__header">
                                                                    <span className="subfolder-grid-panel__title">{root.name}</span>
                                                                    <span className="subfolder-grid-panel__badge">{subfolders.length} subfolder{subfolders.length !== 1 ? 's' : ''}</span>
                                                                </div>
                                                                {subfolders.length === 0 ? (
                                                                    <div className="subfolder-grid-panel__empty">No subfolders yet</div>
                                                                ) : (
                                                                    <div className="subfolder-mini-grid">
                                                                        {subfolders.map((sf) => {
                                                                            const isSubSelected = selectedFolder?.id === sf.id && selectedFolder?.isSubfolder;
                                                                            const count = (sf.video_count || 0) + (sf.photo_post_count || 0);
                                                                            return (
                                                                                <button
                                                                                    key={`sf-${sf.id}`}
                                                                                    className={`subfolder-mini-card ${isSubSelected ? 'subfolder-mini-card--selected' : ''}`}
                                                                                    onClick={() => handleFolderClick(sf, true)}
                                                                                    onContextMenu={(e) => { e.preventDefault(); setFolderOptionsModal({ folder: sf, isSubfolder: true }); }}
                                                                                    onMouseDown={() => handleFolderLongPressStart(sf, true)}
                                                                                    onMouseUp={handleFolderLongPressEnd}
                                                                                    onTouchStart={() => handleFolderLongPressStart(sf, true)}
                                                                                    onTouchEnd={handleFolderLongPressEnd}
                                                                                >
                                                                                    <div className="subfolder-mini-card__preview">
                                                                                        {(() => {
                                                                                            const previewUrls = sf.preview_images || [];
                                                                                            if (previewUrls.length === 0) {
                                                                                                return (
                                                                                                    <div className="subfolder-mini-card__icon">
                                                                                                        <FiFolder size={22} />
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <div className="subfolder-mini-card__thumbs">
                                                                                                    {previewUrls.slice(0, 3).map((url, i) => (
                                                                                                        <div key={i} className="subfolder-mini-card__thumb">
                                                                                                            <img src={url} alt="" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                    <span className="subfolder-mini-card__name">{sf.name.split(' > ').pop()}</span>
                                                                                    <span className="subfolder-mini-card__count">{count} item{count !== 1 ? 's' : ''}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            );
                                                        })}
                                                    </>
                                                );
                                            })()}
                                            
                                            {(!contentData.public?.subfolders?.length && !contentData.private?.subfolders?.length) && (
                                                <div style={{ 
                                                    fontSize: '13px', 
                                                    color: 'rgba(255, 255, 255, 0.4)', 
                                                    textAlign: 'center', 
                                                    padding: '16px 0',
                                                    fontStyle: 'italic'
                                                }}>
                                                    No folders created yet
                                                </div>
                                            )}

                                            {/* New Folder Button */}
                                            <button
                                                className="new-folder-btn"
                                                onClick={() => setShowCreateFolder(true)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: '10px',
                                                    marginTop: '8px',
                                                    border: '1.5px dashed rgba(116, 160, 255, 0.3)',
                                                    borderRadius: '8px',
                                                    backgroundColor: 'transparent',
                                                    color: 'rgba(116, 160, 255, 0.8)',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = 'rgba(116, 160, 255, 0.6)';
                                                    e.currentTarget.style.color = 'rgba(116, 160, 255, 1)';
                                                    e.currentTarget.style.backgroundColor = 'rgba(116, 160, 255, 0.08)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = 'rgba(116, 160, 255, 0.3)';
                                                    e.currentTarget.style.color = 'rgba(116, 160, 255, 0.8)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <FiPlus size={14} />
                                                <span>New Folder</span>
                                            </button>
                                        </div>

                                        {showCreateFolder && (
                                            <div className="create-folder-form" style={{
                                                padding: '16px',
                                                marginTop: '12px',
                                                border: '1px solid rgba(116, 160, 255, 0.2)',
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(10, 10, 10, 0.8)'
                                            }}>
                                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                                        Create New Folder
                                                    </h4>
                                                    <select
                                                        value={newFolderParent}
                                                        onChange={(e) => setNewFolderParent(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            marginBottom: '12px',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <option value="root" style={{ backgroundColor: '#2a2a2a', color: 'rgba(255, 255, 255, 0.9)' }}>Root (New Folder)</option>
                                                        {[...(contentData.public?.subfolders || []), ...(contentData.private?.subfolders || [])]
                                                            .filter(folder => !folder.name.includes(' > ')) // Only show root folders
                                                            .map((folder) => (
                                                                <option key={folder.id} value={folder.id.toString()} style={{ backgroundColor: '#2a2a2a', color: 'rgba(255, 255, 255, 0.9)' }}>
                                                                    {folder.name} (Create Subfolder)
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder={newFolderParent === 'root' ? 'Folder name' : 'Subfolder name'}
                                                        value={newFolderName}
                                                        onChange={(e) => setNewFolderName(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            marginBottom: '12px',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                    <select
                                                        value={newFolderPrivacy}
                                                        onChange={(e) => setNewFolderPrivacy(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            marginBottom: '12px',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <option value="public" style={{ backgroundColor: '#2a2a2a', color: 'rgba(255, 255, 255, 0.9)' }}>Public</option>
                                                        <option value="private" style={{ backgroundColor: '#2a2a2a', color: 'rgba(255, 255, 255, 0.9)' }}>Private</option>
                                                        <option value="hidden" style={{ backgroundColor: '#2a2a2a', color: 'rgba(255, 255, 255, 0.9)' }}>Hidden (Unlisted)</option>
                                                    </select>
                                                    {folderCreateError && (
                                                        <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>
                                                            {folderCreateError}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={handleCreateFolder}
                                                            disabled={creatingFolder}
                                                            style={{
                                                                padding: '8px 16px',
                                                                backgroundColor: '#4a9eff',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                cursor: creatingFolder ? 'not-allowed' : 'pointer',
                                                                opacity: creatingFolder ? 0.6 : 1
                                                            }}
                                                        >
                                                            {creatingFolder ? 'Creating...' : (newFolderParent === 'root' ? 'Create Folder' : 'Create Subfolder')}
                                                        </button>
                                                        <button
                                                            onClick={cancelCreateFolder}
                                                            style={{
                                                                padding: '8px 16px',
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                color: 'rgba(255, 255, 255, 0.8)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                        )}

                                        {/* Selected Folder Content Display */}
                                        {selectedFolder && (
                                            <div className="folder-content-display" style={{
                                                border: '1px solid rgba(116, 160, 255, 0.2)',
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(10, 10, 10, 0.6)',
                                                padding: '16px 16px 24px',
                                                marginBottom: '10px',
                                                backdropFilter: 'blur(10px)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '16px',
                                                    paddingBottom: '12px',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <FiFolder size={20} color="#74a0ff" />
                                                        <div>
                                                            <h3 style={{ 
                                                                margin: 0, 
                                                                fontSize: '16px', 
                                                                fontWeight: '600',
                                                                color: 'rgba(255, 255, 255, 0.95)'
                                                            }}>
                                                                {selectedFolder.isSubfolder && selectedFolder.name.includes(' > ') 
                                                                    ? selectedFolder.name.split(' > ').pop() 
                                                                    : selectedFolder.name}
                                                            </h3>
                                                            <p style={{
                                                                margin: '4px 0 0 0',
                                                                fontSize: '12px',
                                                                color: 'rgba(255, 255, 255, 0.5)'
                                                            }}>
                                                                {(selectedFolderContent.videos.length + selectedFolderContent.photos.length)} items
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedFolder(null)}
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.08)',
                                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                                            borderRadius: '9999px',
                                                            width: '30px',
                                                            height: '30px',
                                                            lineHeight: '30px',
                                                            cursor: 'pointer',
                                                            color: 'rgba(255, 255, 255, 0.85)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                                                        }}
                                                    >
                                                        <FiX size={16} style={{ display: 'block', transform: 'translateY(0.5px)' }} />
                                                    </button>
                                                </div>

                                                {loadingFolderContent ? (
                                                    <div style={{ 
                                                        padding: '40px', 
                                                        textAlign: 'center', 
                                                        color: 'rgba(255, 255, 255, 0.5)' 
                                                    }}>
                                                        <FiLoader size={24} className="spin" style={{ marginBottom: '12px' }} />
                                                        <p style={{ margin: 0, fontSize: '14px' }}>Loading content...</p>
                                                    </div>
                                                ) : (selectedFolderContent.videos.length === 0 && selectedFolderContent.photos.length === 0) ? (
                                                    <div style={{ 
                                                        padding: '40px', 
                                                        textAlign: 'center', 
                                                        color: 'rgba(255, 255, 255, 0.4)',
                                                        fontStyle: 'italic',
                                                        fontSize: '14px'
                                                    }}>
                                                        This folder is empty
                                                    </div>
                                                ) : (
                                                    <div className="content-grid" style={{ gap: '12px' }}>
                                                        {selectedFolderContent.videos.map((video) => (
                                                            <button
                                                                key={`video-${video.id}`}
                                                                type="button"
                                                                className="content-item content-item--button"
                                                                onClick={() => setSelectedVideo(video)}
                                                                aria-label="Open post"
                                                            >
                                                                <video
                                                                    className="content-thumbnail"
                                                                    src={video.stream_url || video.video_url}
                                                                    muted
                                                                    playsInline
                                                                    preload="metadata"
                                                                />
                                                                <div className="content-overlay">▶</div>
                                                            </button>
                                                        ))}
                                                        {selectedFolderContent.photos.map((post) => (
                                                            <div key={`photo-${post.id}`} className="content-item">
                                                                <img
                                                                    className="content-thumbnail"
                                                                    src={(post.images && post.images[0] && (post.images[0].image_url || post.images[0].stream_url)) || ''}
                                                                    alt="photo post"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {selectedVideo ? (
                    <div className="profileModalOverlay" onClick={closeVideoModal}>
                        <div className="profileModal" onClick={(e) => e.stopPropagation()}>
                            <div className="profileModalHeader">
                                <button
                                    type="button"
                                    className="profileModalClose"
                                    onClick={closeVideoModal}
                                    aria-label="Close"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <video
                                className="profileModalVideo"
                                src={selectedVideo.stream_url || selectedVideo.video_url}
                                controls
                                autoPlay
                                playsInline
                            />

                            <div className="videoInfoPanel">
                                <h3 className="videoInfoTitle">{selectedVideo.folder_path || "No folder"}</h3>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Folder Options Modal */}
                {folderOptionsModal && (
                    <FolderOptionsModal
                        folder={folderOptionsModal.folder}
                        isSubfolder={folderOptionsModal.isSubfolder}
                        onClose={() => setFolderOptionsModal(null)}
                        onUpdate={handleUpdateFolderPrivacy}
                        onDelete={handleDeleteFolder}
                    />
                )}

                {/* Sidebar Overlay */}
                {sidebarOpen && (
                    <div 
                        className="sidebarOverlay" 
                        onClick={() => setSidebarOpen(false)} 
                    />
                )}

                {/* Sidebar */}
                <div className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
                    <div className="sidebarHeader">
                        <span className="sidebarTitle">Menu</span>
                        <button 
                            className="sidebarClose" 
                            onClick={() => setSidebarOpen(false)}
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                    <div className="sidebarContent">
                        <button className="sidebarItem" onClick={handleSettingsClick}>
                            <FiSettings size={18} />
                            <span>Settings</span>
                        </button>
                        <button className="sidebarItem" onClick={() => handleMenuItemClick("favorites")}>
                            <FiStar size={18} />
                            <span>Favorites</span>
                        </button>
                        <button className="sidebarItem" onClick={() => handleMenuItemClick("profileVisibility")}>
                            <FiEye size={18} />
                            <span>Profile Visibility</span>
                        </button>
                        <button className="sidebarItem" onClick={() => handleMenuItemClick("feedPreferences")}>
                            <FiSliders size={18} />
                            <span>Feed Preferences</span>
                        </button>
                        <button className="sidebarItem" onClick={() => handleMenuItemClick("subscription")}>
                            <FiCreditCard size={18} />
                            <span>Subscription</span>
                        </button>
                        {(user?.account_type === 'talent' || user?.account_type === 'agency_talent') && (
                            <button className="sidebarItem" onClick={() => handleMenuItemClick("switchAccount")}>
                                <FiUsers size={18} />
                                <span>Switch Account</span>
                            </button>
                        )}
                        {user?.account_type === 'agency' && (
                            <button className="sidebarItem" onClick={() => handleMenuItemClick("inviteTalent")}>
                                <FiUsers size={18} style={{ color: '#10b981' }} />
                                <span>Invite Talent</span>
                            </button>
                        )}
                        {user?.account_type === 'talent' && !user?.can_switch_account && (
                            <button className="sidebarItem" onClick={() => handleMenuItemClick("joinAgencyTalent")}>
                                <FiUsers size={18} style={{ color: '#f59e0b' }} />
                                <span>Join Agency Talent</span>
                            </button>
                        )}
                        <button className="sidebarItem" onClick={() => handleMenuItemClick("referralEarnings")}>
                            <FiGift size={18} />
                            <span>Referral Earnings</span>
                        </button>
                        <button className="sidebarItem" onClick={() => handleMenuItemClick("support")}>
                            <FiHelpCircle size={18} />
                            <span>Support</span>
                        </button>
                    </div>
                </div>

                {/* Folder Popup - Removed, now using inline display */}

                {/* Profile Visibility Modal */}
                {showVisibilityModal && (
                    <div className="profileModalOverlay" onClick={() => setShowVisibilityModal(false)}>
                        <div className="profileModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="profileModalHeader">
                                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '600' }}>Profile Visibility</h3>
                                <button
                                    type="button"
                                    className="profileModalClose"
                                    onClick={() => setShowVisibilityModal(false)}
                                    aria-label="Close"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px', fontSize: '14px' }}>
                                    Choose who can see your profile and content
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {visibilityOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = user.privacy_setting === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => handleVisibilityChange(option.value)}
                                                disabled={savingVisibility}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '14px',
                                                    padding: '14px 16px',
                                                    background: isSelected ? 'rgba(116, 160, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                                                    border: isSelected ? '1px solid #74a0ff' : '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    cursor: savingVisibility ? 'wait' : 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    textAlign: 'left',
                                                    width: '100%'
                                                }}
                                            >
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    background: isSelected ? 'rgba(116, 160, 255, 0.2)' : 'rgba(255,255,255,0.08)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <Icon size={20} style={{ color: isSelected ? '#74a0ff' : 'rgba(255,255,255,0.6)' }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: '15px',
                                                        fontWeight: '500',
                                                        color: isSelected ? '#74a0ff' : 'white',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {option.label}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '13px',
                                                        color: 'rgba(255,255,255,0.5)',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {option.description}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: '#74a0ff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        alignSelf: 'center'
                                                    }}>
                                                        <FiCheck size={14} style={{ color: 'white' }} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {savingVisibility && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        marginTop: '16px',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '14px'
                                    }}>
                                        <FiLoader size={16} className="spin" />
                                        <span>Updating...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}