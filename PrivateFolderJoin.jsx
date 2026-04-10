import { useState, useEffect, useRef } from "react";
import { agencyAPI, contentAPI, foldersAPI } from "../services/api";
import {
    FiArrowLeft, FiGlobe, FiLock, FiEyeOff, FiLoader, FiChevronRight,
    FiFolder, FiVideo, FiImage, FiCheck, FiGrid, FiPlus, FiX
} from "react-icons/fi";
import BottomNav from "../components/layout/BottomNav";
import FolderPopup from "../components/FolderPopup";
import FolderOptionsModal from "../components/FolderOptionsModal";
import "../styles/AgencyTalentManager.css";

export default function AgencyTalentManager({ talentId, talentUsername, onBack, onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // View mode state
    const [viewMode, setViewMode] = useState('posts');
    const [contentData, setContentData] = useState({ public: {}, private: {}, hidden: {} });
    const [myVideos, setMyVideos] = useState([]);
    const [myPhotos, setMyPhotos] = useState([]);
    
    // Folder management state
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedFolderContent, setSelectedFolderContent] = useState({ videos: [], photos: [] });
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderParent, setNewFolderParent] = useState('root');
    const [newFolderPrivacy, setNewFolderPrivacy] = useState('public');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [folderCreateError, setFolderCreateError] = useState('');
    
    // Folder options modal state
    const [folderOptionsModal, setFolderOptionsModal] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressThreshold = 500;

    const toggleViewMode = () => {
        setViewMode(viewMode === 'posts' ? 'folders' : 'posts');
    };

    const showSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 2000);
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
            await agencyAPI.updateTalentSubfolderPrivacy(talentId, folderId, privacy);
        } else {
            await foldersAPI.updateFolderPrivacy(folderId, privacy);
        }
        await fetchTalentContent();
        showSuccess(`Folder privacy updated to ${privacy}`);
    };

    const handleDeleteFolder = async (folderId, isSubfolder) => {
        if (isSubfolder) {
            await contentAPI.deleteSubfolder(folderId);
        } else {
            await foldersAPI.deleteFolder(folderId);
        }
        await fetchTalentContent();
        if (selectedFolder && selectedFolder.id === folderId) {
            setSelectedFolder(null);
        }
        showSuccess('Folder deleted successfully');
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
            
            if (newFolderParent !== 'root') {
                const allFolders = [
                    ...(contentData.public?.subfolders || []),
                    ...(contentData.private?.subfolders || []),
                    ...(contentData.hidden?.subfolders || [])
                ];
                const parentFolder = allFolders.find(f => f.id.toString() === newFolderParent);
                if (parentFolder) {
                    folderName = `${parentFolder.name} > ${folderName}`;
                }
            }
            
            // Use agency API to create folder for the talent
            await agencyAPI.createTalentSubfolder(talentId, folderName, newFolderPrivacy);
            await fetchTalentContent();
            
            setNewFolderName('');
            setNewFolderPrivacy('public');
            setNewFolderParent('root');
            setShowCreateFolder(false);
            showSuccess('Folder created successfully');
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

    const handleFolderClick = async (folder, isSubfolder = false) => {
        try {
            if (isSubfolder) {
                const data = await contentAPI.getSubfolderDetail(folder.id);
                setSelectedFolderContent({
                    videos: data.videos || [],
                    photos: data.photo_posts || []
                });
            } else {
                const publicSection = contentData.public || {};
                const privateSection = contentData.private || {};
                const hiddenSection = contentData.hidden || {};
                setSelectedFolderContent({
                    videos: [
                        ...(publicSection.videos || []),
                        ...(privateSection.videos || []),
                        ...(hiddenSection.videos || [])
                    ],
                    photos: [
                        ...(publicSection.photo_posts || []),
                        ...(privateSection.photo_posts || []),
                        ...(hiddenSection.photo_posts || [])
                    ]
                });
            }
            setSelectedFolder(folder);
        } catch (error) {
            console.error('Failed to load folder content:', error);
        }
    };

    const closeVideoModal = () => {
        setSelectedVideo(null);
    };

    const fetchTalentContent = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await agencyAPI.getTalentContent(talentId);
            setContent(data);
            setContentData(data || { public: {}, private: {}, hidden: {} });
            
            // Extract all videos and photos for posts view
            const allVideos = [
                ...(data.public?.videos || []),
                ...(data.private?.videos || []),
                ...(data.hidden?.videos || [])
            ];
            const allPhotos = [
                ...(data.public?.photo_posts || []),
                ...(data.private?.photo_posts || []),
                ...(data.hidden?.photo_posts || [])
            ];
            setMyVideos(allVideos);
            setMyPhotos(allPhotos);
        } catch (err) {
            setError('Failed to load talent content');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (talentId) {
            fetchTalentContent();
        }
    }, [talentId]);

    return (
        <div className="appShell">
            <div className="agency-talent-manager">
                {/* Header */}
                <div className="manager-header">
                    <button className="back-btn" onClick={onBack}>
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="header-info">
                        <h1>Manage Content</h1>
                        <span className="talent-username">@{talentUsername}</span>
                    </div>
                </div>

                {/* Success message */}
                {success && (
                    <div className="success-message">
                        <FiCheck size={16} />
                        <span>{success}</span>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="loading-state">
                        <FiLoader size={32} className="spin" />
                        <p>Loading content...</p>
                    </div>
                ) : (
                    <div className="content-section" style={{ padding: '0 16px 80px' }}>
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
                            >
                                <FiFolder size={16} />
                            </button>
                        </div>

                        {viewMode === 'posts' ? (
                            <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '16px' }}>
                                {myVideos.length === 0 && myPhotos.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'rgba(255, 255, 255, 0.5)' }}>
                                        No posts yet
                                    </div>
                                ) : (
                                    <>
                                        {myVideos.map((video) => (
                                            <button
                                                key={`video-${video.id}`}
                                                type="button"
                                                className="content-item"
                                                onClick={() => setSelectedVideo(video)}
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '1',
                                                    border: 'none',
                                                    padding: 0,
                                                    background: '#000',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <video
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    src={video.stream_url || video.video_url}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    color: 'white',
                                                    fontSize: '24px'
                                                }}>▶</div>
                                            </button>
                                        ))}
                                        {myPhotos.map((post) => (
                                            <div 
                                                key={`photo-${post.id}`} 
                                                className="content-item"
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '1',
                                                    background: '#000',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <img
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    src={(post.images && post.images[0] && (post.images[0].image_url || post.images[0].stream_url)) || ''}
                                                    alt="photo post"
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="folders-view">
                                {/* Default Folder */}
                                <div className="folder-main-section" style={{
                                    marginTop: '16px',
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
                                        const allFolders = [
                                            ...(contentData.public?.subfolders || []),
                                            ...(contentData.private?.subfolders || []),
                                            ...(contentData.hidden?.subfolders || [])
                                        ];
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
                                                        onMouseDown={() => handleFolderLongPressStart(folder, true)}
                                                        onMouseUp={handleFolderLongPressEnd}
                                                        onTouchStart={() => handleFolderLongPressStart(folder, true)}
                                                        onTouchEnd={handleFolderLongPressEnd}
                                                        onMouseLeave={handleFolderLongPressEnd}
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
                                                            onMouseDown={() => handleFolderLongPressStart(subfolder, true)}
                                                            onMouseUp={handleFolderLongPressEnd}
                                                            onTouchStart={() => handleFolderLongPressStart(subfolder, true)}
                                                            onTouchEnd={handleFolderLongPressEnd}
                                                            onMouseLeave={handleFolderLongPressEnd}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                width: '100%',
                                                                padding: '8px 16px 8px 32px',
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
                                        });
                                    })()}
                                    
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
                                            padding: '12px',
                                            border: '2px dashed rgba(255, 255, 255, 0.3)',
                                            borderRadius: '6px',
                                            backgroundColor: 'transparent',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <FiPlus size={16} />
                                        <span>New folder</span>
                                    </button>

                                    {showCreateFolder && (
                                        <div className="create-folder-form" style={{
                                            padding: '16px',
                                            marginTop: '16px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
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
                                                {[
                                                    ...(contentData.public?.subfolders || []),
                                                    ...(contentData.private?.subfolders || []),
                                                    ...(contentData.hidden?.subfolders || [])
                                                ]
                                                    .filter(folder => !folder.name.includes(' > '))
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
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Video Modal */}
                {selectedVideo && (
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                        onClick={closeVideoModal}
                    >
                        <div 
                            style={{ position: 'relative', width: '90%', maxWidth: '600px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={closeVideoModal}
                                style={{
                                    position: 'absolute',
                                    top: '-40px',
                                    right: 0,
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '24px'
                                }}
                            >
                                <FiX size={24} />
                            </button>
                            <video
                                src={selectedVideo.stream_url || selectedVideo.video_url}
                                controls
                                autoPlay
                                playsInline
                                style={{ width: '100%', borderRadius: '8px' }}
                            />
                        </div>
                    </div>
                )}

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

                {/* Folder Popup */}
                {selectedFolder && (
                    <FolderPopup
                        folder={selectedFolder}
                        isSubfolder={selectedFolder.privacy_type !== undefined}
                        videos={selectedFolderContent.videos}
                        photos={selectedFolderContent.photos}
                        onClose={() => setSelectedFolder(null)}
                    />
                )}

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}
