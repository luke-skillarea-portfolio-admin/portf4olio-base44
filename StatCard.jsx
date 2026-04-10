import { useState, useEffect } from "react";
import { FiX, FiPlay, FiImage, FiLock, FiGlobe, FiPlus } from "react-icons/fi";
import "../styles/FolderPopup.css";

export default function FolderPopup({ 
    folder, 
    isSubfolder = false,
    onClose, 
    videos = [], 
    photos = []
}) {
    const [selectedPost, setSelectedPost] = useState(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Combine and sort all content by creation date
    const allContent = [
        ...videos.map(v => ({ ...v, type: 'video' })),
        ...photos.map(p => ({ ...p, type: 'photo', images: p.images || p.photos || [] }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

    // Handle escape key to close
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Determine folder type and icon
    const isPrivate = isSubfolder ? folder?.privacy_type === 'private' : folder?.type === 'private';
    const FolderIcon = isPrivate ? FiLock : FiGlobe;
    const folderColor = isPrivate ? '#3b82f6' : '#22c55e';

    return (
        <>
            <div className="folder-popup-overlay" onClick={onClose}>
                <div className="folder-popup" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="folder-popup-header">
                        <div className="folder-popup-title">
                            <FolderIcon 
                                size={20} 
                                color={folderColor} 
                                style={{ marginRight: '8px' }}
                            />
                            <span>{folder?.name || (isPrivate ? 'Private Folder' : 'Public Folder')}</span>
                            <span className="folder-popup-count">({allContent.length})</span>
                        </div>
                        <button className="folder-popup-close" onClick={onClose}>
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Description */}
                    {folder?.description && (
                        <div className="folder-popup-description">
                            <p>{folder.description}</p>
                        </div>
                    )}

                    {/* Content Grid */}
                    <div className="folder-popup-content">
                        {allContent.length > 0 ? (
                            <div className="content-grid">
                                {allContent.map((post) => (
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
                                                    loading="lazy"
                                                />
                                                {post.images?.length > 1 && (
                                                    <div className="photo-count-badge">
                                                        {post.images.length}
                                                    </div>
                                                )}
                                                <div className="content-overlay">
                                                    <FiImage size={24} />
                                                </div>
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-folder">
                                <p>This folder is empty</p>
                                <span>No content yet</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Post View Modal */}
            {selectedPost && (
                <div className="post-modal-overlay" onClick={closePostModal}>
                    <div className="post-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="post-modal-header">
                            <button
                                type="button"
                                className="post-modal-close"
                                onClick={closePostModal}
                                aria-label="Close"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {selectedPost.type === 'video' ? (
                            <video
                                className="post-modal-video"
                                src={selectedPost.stream_url || selectedPost.video_url}
                                controls
                                autoPlay
                                playsInline
                            />
                        ) : (
                            <div className="post-modal-photo-container">
                                <img
                                    className="post-modal-photo"
                                    src={selectedPost.images?.[currentPhotoIndex]?.image_url}
                                    alt={selectedPost.title || 'Photo'}
                                />
                                {selectedPost.images?.length > 1 && (
                                    <>
                                        <button
                                            className="photo-nav photo-nav-prev"
                                            onClick={prevPhoto}
                                            disabled={currentPhotoIndex === 0}
                                        >
                                            &#8249;
                                        </button>
                                        <button
                                            className="photo-nav photo-nav-next"
                                            onClick={nextPhoto}
                                            disabled={currentPhotoIndex === selectedPost.images.length - 1}
                                        >
                                            &#8250;
                                        </button>
                                        <div className="photo-indicators">
                                            {selectedPost.images.map((_, index) => (
                                                <button
                                                    key={index}
                                                    className={`photo-indicator ${index === currentPhotoIndex ? 'active' : ''}`}
                                                    onClick={() => setCurrentPhotoIndex(index)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Post Info */}
                        {selectedPost.description && (
                            <div className="post-modal-description">
                                <p>{selectedPost.description}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}