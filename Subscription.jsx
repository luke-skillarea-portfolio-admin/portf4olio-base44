import { useState, useEffect } from "react";
import BottomNav from "../components/layout/BottomNav";
import { contentAPI, videosAPI, privateFolderAPI } from "../services/api";
import {
    FiArrowLeft, FiGlobe, FiLock, FiLoader, FiCheck,
    FiPlay, FiPlus, FiFolder, FiTrash2, FiImage, FiMove,
    FiShare2, FiUserPlus, FiUserX, FiCopy, FiUsers
} from "react-icons/fi";
import "../styles/Settings.css";
import "../styles/FolderPage.css";

export default function FolderPage({ folderType, onNavigate, onBack, onNavigateToSubfolder }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [subfolders, setSubfolders] = useState([]);
    const [videos, setVideos] = useState([]);
    const [photoPosts, setPhotoPosts] = useState([]);

    // Subfolder creation
    const [showCreateSubfolder, setShowCreateSubfolder] = useState(false);
    const [newSubfolderName, setNewSubfolderName] = useState('');
    const [creatingSubfolder, setCreatingSubfolder] = useState(false);

    // Drag and drop
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverSubfolder, setDragOverSubfolder] = useState(null);

    // Private folder access management (only for private folder)
    const [showAccessManagement, setShowAccessManagement] = useState(false);
    const [inviteLink, setInviteLink] = useState(null);
    const [accessRequests, setAccessRequests] = useState([]);
    const [accessList, setAccessList] = useState([]);
    const [loadingAccess, setLoadingAccess] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const isPublic = folderType === 'public';
    const Icon = isPublic ? FiGlobe : FiLock;
    const color = isPublic ? '#22c55e' : '#3b82f6';

    useEffect(() => {
        fetchContent();
        if (!isPublic) {
            fetchAccessData();
        }
    }, [folderType]);

    const fetchAccessData = async () => {
        if (isPublic) return;
        setLoadingAccess(true);
        try {
            const [linkData, requestsData, listData] = await Promise.all([
                privateFolderAPI.getInviteLink(),
                privateFolderAPI.getAccessRequests(),
                privateFolderAPI.getAccessList()
            ]);
            setInviteLink(linkData.invite_code);
            setAccessRequests(requestsData.requests || []);
            setAccessList(listData.access_list || []);
        } catch (err) {
            console.error('Failed to load access data:', err);
        } finally {
            setLoadingAccess(false);
        }
    };

    const fetchContent = async () => {
        setLoading(true);
        try {
            const data = await contentAPI.getMyContent();
            const section = data[folderType] || { subfolders: [], videos: [], photo_posts: [] };
            setSubfolders(section.subfolders || []);
            setVideos(section.videos || []);
            setPhotoPosts(section.photo_posts || []);
        } catch (err) {
            setError('Failed to load content');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubfolder = async () => {
        if (!newSubfolderName.trim() || creatingSubfolder) return;

        setCreatingSubfolder(true);
        try {
            await contentAPI.createSubfolder(newSubfolderName.trim(), folderType);
            await fetchContent();
            setNewSubfolderName('');
            setShowCreateSubfolder(false);
            showSuccessMessage('Subfolder created');
        } catch (err) {
            setError(err.message || 'Failed to create subfolder');
        } finally {
            setCreatingSubfolder(false);
        }
    };

    const handleDeleteSubfolder = async (subfolderId) => {
        if (!window.confirm('Delete this subfolder? Content will be moved out.')) return;

        try {
            await contentAPI.deleteSubfolder(subfolderId, false);
            await fetchContent();
            showSuccessMessage('Subfolder deleted');
        } catch (err) {
            setError('Failed to delete subfolder');
        }
    };

    const handleMoveToOtherFolder = async (item, type) => {
        const targetFolder = isPublic ? 'private' : 'public';
        try {
            if (type === 'video') {
                await videosAPI.moveVideo(item.id, targetFolder);
            } else {
                await contentAPI.movePhotoPost(item.id, targetFolder);
            }
            await fetchContent();
            showSuccessMessage(`Moved to ${targetFolder}`);
        } catch (err) {
            setError('Failed to move content');
        }
    };

    const handleMoveToSubfolder = async (item, type, subfolderId) => {
        try {
            if (type === 'video') {
                await videosAPI.moveVideo(item.id, folderType, subfolderId);
            } else {
                await contentAPI.movePhotoPost(item.id, folderType, subfolderId);
            }
            await fetchContent();
            showSuccessMessage('Moved to subfolder');
        } catch (err) {
            setError('Failed to move to subfolder');
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e, item, type) => {
        setDraggedItem({ item, type });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverSubfolder(null);
    };

    const handleDragOver = (e, subfolderId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverSubfolder(subfolderId);
    };

    const handleDragLeave = () => {
        setDragOverSubfolder(null);
    };

    const handleDrop = async (e, subfolderId) => {
        e.preventDefault();
        setDragOverSubfolder(null);

        if (draggedItem) {
            await handleMoveToSubfolder(draggedItem.item, draggedItem.type, subfolderId);
        }
        setDraggedItem(null);
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 2000);
    };

    // Access management functions (for private folder)
    const handleCopyInviteLink = async () => {
        if (!inviteLink) {
            // Generate new link if none exists
            try {
                const data = await privateFolderAPI.generateInviteLink();
                setInviteLink(data.invite_code);
            } catch (err) {
                setError('Failed to generate invite link');
                return;
            }
        }
        const fullUrl = `${window.location.origin}/private-folder/join/${inviteLink}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleRespondToRequest = async (requestId, action) => {
        try {
            await privateFolderAPI.respondToRequest(requestId, action);
            await fetchAccessData();
            showSuccessMessage(action === 'approve' ? 'Access granted' : 'Request denied');
        } catch (err) {
            setError('Failed to respond to request');
        }
    };

    const handleRevokeAccess = async (userId, username) => {
        if (!window.confirm(`Revoke ${username}'s access to your private folder?`)) return;
        try {
            await privateFolderAPI.revokeAccess(userId);
            await fetchAccessData();
            showSuccessMessage('Access revoked');
        } catch (err) {
            setError('Failed to revoke access');
        }
    };

    const navigateToSubfolder = (subfolder) => {
        if (onNavigateToSubfolder) {
            onNavigateToSubfolder(subfolder);
        }
    };

    return (
        <div className="appShell">
            <div className="folder-page">
                <div className="folder-top-bar">
                    <button className="back-button" onClick={onBack}>
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="folder-title-section">
                        <div className="folder-title-icon" style={{ backgroundColor: `${color}20`, color }}>
                            <Icon size={20} />
                        </div>
                        <h1>{isPublic ? 'Public' : 'Private'} Folder</h1>
                    </div>
                </div>

                <main className="folder-content">
                    {loading ? (
                        <div className="folder-loading">
                            <FiLoader size={32} className="spin" />
                            <p>Loading content...</p>
                        </div>
                    ) : (
                        <>
                            {error && <div className="folder-error">{error}</div>}
                            {success && (
                                <div className="folder-success">
                                    <FiCheck size={16} />
                                    <span>{success}</span>
                                </div>
                            )}

                            {/* Access Management Section (Private folder only) */}
                            {!isPublic && (
                                <div className="folder-section access-section">
                                    <div className="section-header-row">
                                        <h2><FiUsers size={18} /> Access Management</h2>
                                        <button
                                            className="share-link-btn"
                                            onClick={handleCopyInviteLink}
                                        >
                                            {copiedLink ? <FiCheck size={16} /> : <FiCopy size={16} />}
                                            <span>{copiedLink ? 'Copied!' : 'Copy Invite Link'}</span>
                                        </button>
                                    </div>

                                    {loadingAccess ? (
                                        <div className="access-loading">
                                            <FiLoader size={20} className="spin" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Pending Access Requests */}
                                            {accessRequests.length > 0 && (
                                                <div className="access-requests">
                                                    <h3>Pending Requests ({accessRequests.length})</h3>
                                                    <div className="requests-list">
                                                        {accessRequests.map((req) => (
                                                            <div key={req.id} className="request-item">
                                                                <div className="request-info">
                                                                    <span className="request-username">{req.requester_username}</span>
                                                                    {req.message && (
                                                                        <span className="request-message">"{req.message}"</span>
                                                                    )}
                                                                </div>
                                                                <div className="request-actions">
                                                                    <button
                                                                        className="approve-btn"
                                                                        onClick={() => handleRespondToRequest(req.id, 'approve')}
                                                                    >
                                                                        <FiUserPlus size={14} />
                                                                    </button>
                                                                    <button
                                                                        className="deny-btn"
                                                                        onClick={() => handleRespondToRequest(req.id, 'deny')}
                                                                    >
                                                                        <FiUserX size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Users with Access */}
                                            <div className="access-list">
                                                <h3>Users with Access ({accessList.length})</h3>
                                                {accessList.length === 0 ? (
                                                    <p className="empty-text">No one has access yet. Share your invite link!</p>
                                                ) : (
                                                    <div className="access-users">
                                                        {accessList.map((user) => (
                                                            <div key={user.user_id} className="access-user-item">
                                                                <span className="access-username">{user.username}</span>
                                                                <button
                                                                    className="revoke-btn"
                                                                    onClick={() => handleRevokeAccess(user.user_id, user.username)}
                                                                >
                                                                    <FiUserX size={14} />
                                                                    <span>Revoke</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Subfolders Section */}
                            <div className="folder-section">
                                <div className="section-header-row">
                                    <h2>Subfolders</h2>
                                    <button
                                        className="create-subfolder-btn"
                                        onClick={() => setShowCreateSubfolder(true)}
                                    >
                                        <FiPlus size={16} />
                                        <span>New</span>
                                    </button>
                                </div>

                                {showCreateSubfolder && (
                                    <div className="create-subfolder-inline">
                                        <input
                                            type="text"
                                            placeholder="Subfolder name..."
                                            value={newSubfolderName}
                                            onChange={(e) => setNewSubfolderName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleCreateSubfolder()}
                                            autoFocus
                                        />
                                        <button
                                            className="confirm-btn"
                                            onClick={handleCreateSubfolder}
                                            disabled={creatingSubfolder || !newSubfolderName.trim()}
                                        >
                                            {creatingSubfolder ? <FiLoader className="spin" size={14} /> : <FiCheck size={14} />}
                                        </button>
                                        <button
                                            className="cancel-btn"
                                            onClick={() => {
                                                setShowCreateSubfolder(false);
                                                setNewSubfolderName('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                <div className="subfolders-grid">
                                    {subfolders.length === 0 ? (
                                        <p className="empty-text">No subfolders yet</p>
                                    ) : (
                                        subfolders.map((subfolder) => (
                                            <div
                                                key={subfolder.id}
                                                className={`subfolder-card ${dragOverSubfolder === subfolder.id ? 'drag-over' : ''}`}
                                                onClick={() => navigateToSubfolder(subfolder)}
                                                onDragOver={(e) => handleDragOver(e, subfolder.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, subfolder.id)}
                                            >
                                                <div className="subfolder-card-icon">
                                                    <FiFolder size={24} />
                                                </div>
                                                <div className="subfolder-card-info">
                                                    <span className="subfolder-card-name">{subfolder.name}</span>
                                                    <span className="subfolder-card-count">
                                                        {(subfolder.video_count || 0) + (subfolder.photo_post_count || 0)} items
                                                    </span>
                                                </div>
                                                <button
                                                    className="subfolder-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSubfolder(subfolder.id);
                                                    }}
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                                {dragOverSubfolder === subfolder.id && (
                                                    <div className="drop-indicator">Drop here</div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="folder-section">
                                <h2>Content ({videos.length + photoPosts.length} items)</h2>

                                {videos.length === 0 && photoPosts.length === 0 ? (
                                    <p className="empty-text">No content in this folder</p>
                                ) : (
                                    <div className="content-grid">
                                        {videos.map((video) => (
                                            <div
                                                key={`video-${video.id}`}
                                                className="content-card"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, video, 'video')}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <div className="content-card-thumb">
                                                    <video src={video.stream_url} muted />
                                                    <div className="content-type-badge video">
                                                        <FiPlay size={12} />
                                                    </div>
                                                </div>
                                                <div className="content-card-info">
                                                    <span className="content-card-title">{video.title || 'Untitled'}</span>
                                                </div>
                                                <div className="content-card-actions">
                                                    <button
                                                        className="move-btn"
                                                        onClick={() => handleMoveToOtherFolder(video, 'video')}
                                                        title={`Move to ${isPublic ? 'Private' : 'Public'}`}
                                                    >
                                                        {isPublic ? <FiLock size={14} /> : <FiGlobe size={14} />}
                                                    </button>
                                                </div>
                                                <div className="drag-handle">
                                                    <FiMove size={14} />
                                                </div>
                                            </div>
                                        ))}
                                        {photoPosts.map((post) => (
                                            <div
                                                key={`photo-${post.id}`}
                                                className="content-card"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, post, 'photo')}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <div className="content-card-thumb">
                                                    <img src={post.images?.[0]?.image_url || ''} alt="" />
                                                    <div className="content-type-badge photo">
                                                        <FiImage size={12} />
                                                    </div>
                                                </div>
                                                <div className="content-card-info">
                                                    <span className="content-card-title">{post.title || 'Untitled'}</span>
                                                </div>
                                                <div className="content-card-actions">
                                                    <button
                                                        className="move-btn"
                                                        onClick={() => handleMoveToOtherFolder(post, 'photo')}
                                                        title={`Move to ${isPublic ? 'Private' : 'Public'}`}
                                                    >
                                                        {isPublic ? <FiLock size={14} /> : <FiGlobe size={14} />}
                                                    </button>
                                                </div>
                                                <div className="drag-handle">
                                                    <FiMove size={14} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {draggedItem && (
                                <div className="drag-hint">
                                    Drag to a subfolder above to move
                                </div>
                            )}
                        </>
                    )}
                </main>

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}
