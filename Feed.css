import { useState, useEffect } from "react";
import BottomNav from "../components/layout/BottomNav";
import { contentAPI, videosAPI } from "../services/api";
import {
    FiArrowLeft, FiGlobe, FiLock, FiLoader, FiCheck,
    FiPlay, FiFolder, FiImage, FiArrowUp
} from "react-icons/fi";
import "../styles/Settings.css";
import "../styles/FolderPage.css";

export default function SubfolderPage({ subfolder, folderType, onNavigate, onBack }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [videos, setVideos] = useState([]);
    const [photoPosts, setPhotoPosts] = useState([]);

    const isPublic = folderType === 'public';
    const color = isPublic ? '#22c55e' : '#3b82f6';

    useEffect(() => {
        fetchContent();
    }, [subfolder?.id]);

    const fetchContent = async () => {
        if (!subfolder?.id) return;

        setLoading(true);
        try {
            const data = await contentAPI.getSubfolderDetail(subfolder.id);
            setVideos(data.videos || []);
            setPhotoPosts(data.photo_posts || []);
        } catch (err) {
            setError('Failed to load content');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMoveToRoot = async (item, type) => {
        try {
            if (type === 'video') {
                await videosAPI.moveVideo(item.id, folderType, null);
            } else {
                await contentAPI.movePhotoPost(item.id, folderType, null);
            }
            await fetchContent();
            showSuccessMessage('Moved to root folder');
        } catch (err) {
            setError('Failed to move content');
        }
    };

    const handleMoveToOtherFolder = async (item, type) => {
        const targetFolder = isPublic ? 'private' : 'public';
        try {
            if (type === 'video') {
                await videosAPI.moveVideo(item.id, targetFolder, null);
            } else {
                await contentAPI.movePhotoPost(item.id, targetFolder, null);
            }
            await fetchContent();
            showSuccessMessage(`Moved to ${targetFolder}`);
        } catch (err) {
            setError('Failed to move content');
        }
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 2000);
    };

    return (
        <div className="appShell">
            <div className="folder-page">
                <div className="folder-top-bar">
                    <button className="back-button" onClick={onBack}>
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="folder-title-section">
                        <div className="folder-title-icon subfolder-icon" style={{ backgroundColor: `${color}20`, color }}>
                            <FiFolder size={20} />
                        </div>
                        <div className="folder-title-text">
                            <h1>{subfolder?.name || 'Subfolder'}</h1>
                            <span className="folder-subtitle">
                                {isPublic ? 'Public' : 'Private'} subfolder
                            </span>
                        </div>
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

                            {/* Content Section */}
                            <div className="folder-section">
                                <h2>Content ({videos.length + photoPosts.length} items)</h2>

                                {videos.length === 0 && photoPosts.length === 0 ? (
                                    <div className="empty-subfolder">
                                        <FiFolder size={48} />
                                        <p>This subfolder is empty</p>
                                        <span>Drag content here from the parent folder</span>
                                    </div>
                                ) : (
                                    <div className="content-grid">
                                        {videos.map((video) => (
                                            <div key={`video-${video.id}`} className="content-card">
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
                                                        onClick={() => handleMoveToRoot(video, 'video')}
                                                        title="Move to root folder"
                                                    >
                                                        <FiArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        className="move-btn"
                                                        onClick={() => handleMoveToOtherFolder(video, 'video')}
                                                        title={`Move to ${isPublic ? 'Private' : 'Public'}`}
                                                    >
                                                        {isPublic ? <FiLock size={14} /> : <FiGlobe size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {photoPosts.map((post) => (
                                            <div key={`photo-${post.id}`} className="content-card">
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
                                                        onClick={() => handleMoveToRoot(post, 'photo')}
                                                        title="Move to root folder"
                                                    >
                                                        <FiArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        className="move-btn"
                                                        onClick={() => handleMoveToOtherFolder(post, 'photo')}
                                                        title={`Move to ${isPublic ? 'Private' : 'Public'}`}
                                                    >
                                                        {isPublic ? <FiLock size={14} /> : <FiGlobe size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}
