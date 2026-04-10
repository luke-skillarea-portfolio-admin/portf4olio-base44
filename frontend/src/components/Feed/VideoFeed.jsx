import React, { useEffect, useMemo, useRef, useState } from 'react';
import { postsAPI, postReportsAPI, favoritesAPI, photosAPI, videosAPI, adminPostsAPI } from '../../services/api';
import { Volume2, VolumeX, Flag, X, Share, Star, Download, MoreHorizontal, Link, Trash2, AlertOctagon, Folder } from 'lucide-react';
import '../../styles/Feed.css';
import PhotoSlideshow from './PhotoSlideshow';
import { useAuth } from '../../hooks/useAuth';

const REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "copyright", label: "Copyright violation" },
  { id: "other", label: "Other" },
];

const VideoFeed = ({ refreshKey = 0, scrollToVideoId, onScrollToVideoComplete, onProfileClick, onFolderClick }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [tapIndicator, setTapIndicator] = useState(null);
  
  // Tracks expanded description state
  const [expandedPosts, setExpandedPosts] = useState([]);

  const togglePost = (id) => {
    if (expandedPosts.includes(id)) {
      setExpandedPosts(expandedPosts.filter(postId => postId !== id));
    } else {
      setExpandedPosts([...expandedPosts, id]);
    }
  };

  // Modal & Action states
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const pageRefs = useRef([]);
  const videoRefs = useRef([]);
  const activeIndexRef = useRef(0);
  const indicatorTimerRef = useRef(null);
  const pausedStateRef = useRef(false);
  const { user } = useAuth();

  const hasPosts = useMemo(() => Array.isArray(posts) && posts.length > 0, [posts]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const data = await postsAPI.getFeed();
        setPosts(data.posts || []);
        setError('');
        setActiveIndex(0);
        activeIndexRef.current = 0;
        pausedStateRef.current = false;
        setPausedByUser(false);
      } catch (e) {
        setError(e?.message || 'Failed to load feed');
      }
      setLoading(false);
    };
    fetchPosts();
  }, [refreshKey]);

  useEffect(() => {
    if (!scrollToVideoId || !hasPosts || loading) return;
    const videoIndex = posts.findIndex(v => v.id === scrollToVideoId);
    if (videoIndex !== -1 && pageRefs.current[videoIndex]) {
      pageRefs.current[videoIndex].scrollIntoView({ behavior: 'instant' });
      setActiveIndex(videoIndex);
      activeIndexRef.current = videoIndex;
      if (onScrollToVideoComplete) onScrollToVideoComplete();
    }
  }, [scrollToVideoId, hasPosts, loading, posts, onScrollToVideoComplete]);

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, posts.length);
    videoRefs.current = videoRefs.current.slice(0, posts.length);
  }, [posts.length]);

  useEffect(() => {
    if (!hasPosts) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));
        if (!visible.length) return;

        const idx = Number(visible[0].target.getAttribute('data-index'));
        if (!Number.isNaN(idx) && idx !== activeIndexRef.current) {
          activeIndexRef.current = idx;
          pausedStateRef.current = false;
          setPausedByUser(false);
          setActiveIndex(idx);
        }
      },
      { threshold: [0.55, 0.65, 0.75] }
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [hasPosts, posts]);

  useEffect(() => {
    if (!hasPosts) return;
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx !== activeIndex) try { vid.pause(); } catch {}
    });
    const active = videoRefs.current[activeIndex];
    if (!active) return;
    if (pausedByUser) return;
    const playPromise = active.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }, [activeIndex, hasPosts, pausedByUser]);

  useEffect(() => {
    videoRefs.current.forEach((vid) => { if (vid) vid.muted = muted; });
  }, [muted]);

  const handleOpenOptions = (post, e) => {
    e.stopPropagation();
    setSelectedPost(post);
    setShowOptionsModal(true);
    const active = videoRefs.current[activeIndex];
    if (active) try { active.pause(); } catch {}
  };

  const handleClick = (e) => {
    if (e.target.closest('.readMoreBtn') || e.target.closest('.feedHeaderOptions')) return;
    togglePause();
  };

  const togglePause = () => {
    const active = videoRefs.current[activeIndex];
    if (!active) return;
    if (indicatorTimerRef.current) {
      window.clearTimeout(indicatorTimerRef.current);
      indicatorTimerRef.current = null;
    }
    const currentlyPaused = pausedStateRef.current;
    if (currentlyPaused) {
      setPausedByUser(false);
      setTapIndicator('play');
      pausedStateRef.current = false;
      const p = active.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      setPausedByUser(true);
      setTapIndicator('pause');
      pausedStateRef.current = true;
      try { active.pause(); } catch {}
    }
    indicatorTimerRef.current = window.setTimeout(() => {
      setTapIndicator(null);
      indicatorTimerRef.current = null;
    }, 900);
  };

  // Modal Handlers
  const closeOptionsModal = () => {
    setShowOptionsModal(false);
    setSelectedPost(null);
    const active = videoRefs.current[activeIndex];
    if (active && !pausedByUser) active.play().catch(() => {});
  };

  const openReportModal = () => {
    setShowOptionsModal(false);
    setShowReportModal(true);
    setSelectedReason('');
    setReportNote('');
    setReportSubmitted(false);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedPost(null);
    setSelectedReason('');
    setReportNote('');
    setReportSubmitted(false);
    const active = videoRefs.current[activeIndex];
    if (active && !pausedByUser) active.play().catch(() => {});
  };

  const handleSubmitReport = async () => {
    if (!selectedReason || !selectedPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const postType = selectedPost.type === 'video' ? 'video' : 'photo';
      await postReportsAPI.submitReport(selectedPost.id, postType, selectedReason, reportNote || null);
      setReportSubmitted(true);
      setTimeout(() => closeReportModal(), 2000);
    } catch (error) {
      alert('Failed to submit report. Please try again.');
    }
    setIsSubmitting(false);
  };

  // Action Handlers
  const showFeedback = (type, message) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 2000);
  };

  const handleFavorite = async () => {
    if (!selectedPost) return;
    closeOptionsModal();
    try {
      const result = await favoritesAPI.toggleFavorite(selectedPost.id);
      showFeedback('favorite', result.favorited ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      showFeedback('favorite', 'Failed to update favorites');
    }
  };

  const handleShare = () => {
    if (!selectedPost) return;
    closeOptionsModal();
    const shareUrl = `${window.location.origin}/video/${selectedPost.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => showFeedback('share', 'Link copied to clipboard!'))
      .catch(() => showFeedback('share', 'Failed to copy link'));
  };

  const handleDownload = async () => {
    if (!selectedPost) return;
    closeOptionsModal();
    showFeedback('download', 'Preparing download...');
    try {
      const downloadUrl = videosAPI.getDownloadUrl(selectedPost.id);
      const response = await fetch(downloadUrl, { method: 'GET', credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skillarea_${selectedPost.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('download', 'Download complete!');
    } catch (error) {
      showFeedback('download', 'Failed to download video');
    }
  };

  const canDeleteSelectedPost = () => {
    if (!selectedPost || !user) return false;
    if (selectedPost.user && user.id) return selectedPost.user === user.id;
    if (selectedPost.user_username && user.username) return selectedPost.user_username === user.username;
    return false;
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    if (!window.confirm('Delete this post?')) return;
    try {
      if (selectedPost.type === 'video') {
        await videosAPI.deleteVideo(selectedPost.id);
        setPosts((prev) => prev.filter((p) => !(p.type === 'video' && p.id === selectedPost.id)));
      } else if (selectedPost.type === 'photo') {
        await photosAPI.deletePost(selectedPost.id);
        setPosts((prev) => prev.filter((p) => !(p.type === 'photo' && p.id === selectedPost.id)));
      }
      closeOptionsModal();
      showFeedback('favorite', 'Post deleted');
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const openSuspendModal = () => { setShowSuspendModal(true); setSuspendReason(''); setShowOptionsModal(false); };
  const closeSuspendModal = () => { setShowSuspendModal(false); setSuspendReason(''); };
  const handleSuspendPost = async () => {
    if (!selectedPost) return;
    setIsSuspending(true);
    try {
      const postType = selectedPost.type === 'video' ? 'video' : 'photo';
      await adminPostsAPI.suspendPost(postType, selectedPost.id, suspendReason);
      closeSuspendModal();
      showFeedback('favorite', 'Post suspended.');
      setPosts((prev) => prev.filter((p) => !(p.type === selectedPost.type && p.id === selectedPost.id)));
    } catch (err) {
      alert(err.message || 'Failed to suspend post');
    } finally {
      setIsSuspending(false);
    }
  };
  const isAdmin = user?.account_type === 'admin' || user?.is_staff || user?.is_superuser;

  if (loading) return <div style={{ color: 'white', padding: 16 }}>Loading feed...</div>;
  if (error) return <div style={{ color: 'red', padding: 16 }}>{error}</div>;
  if (!posts.length) return <div style={{ color: 'white', padding: 16 }}>No posts found.</div>;

  return (
    <>
      <div className="feedScroll">
        {posts.map((post, idx) => {
          const renderMetaContent = (isInsideSlideshow = false) => {
            const fullText = post.description || "";

            // LOGIC: Check for length OR newlines
            const LIMIT = 60;
            const newLinesCount = (fullText.match(/\n/g) || []).length;
            // If text is long OR has 2+ new lines, it needs truncation
            const needsTruncation = fullText.length > LIMIT || newLinesCount >= 3;

            const isExpanded = expandedPosts.includes(post.id);
            let textDisplay = fullText;
  
            if (!isExpanded && needsTruncation) {
              // If it has multiple lines, just take the first line (or first 60 chars)
              if (newLinesCount >= 2) {
                const splitLines = fullText.split('\n');
                // Take the first TWO lines
                let previewLines = splitLines.slice(0, 2);
                let previewText = previewLines.join('\n');

                // Sanity check: If these 2 lines are massively long combined, clip them slightly
                // (e.g. limit to 100 chars so 2 lines don't take up half the screen)
                if (previewText.length > 100) {
                    previewText = previewText.substring(0, 100);
                }

                textDisplay = previewText + "...";
              } else {
                // Standard character truncation (no newlines involved)
                textDisplay = fullText.substring(0, LIMIT) + "...";
              }
            }

            const containerStyle = isInsideSlideshow ? { 
            position: 'relative', 
            bottom: 'auto', 
            left: 'auto', 
            right: 'auto',
            width: 'auto',
            margin: '0 12px',
            marginBottom: 'calc(88px + env(safe-area-inset-bottom, 20px))',
            pointerEvents: 'auto'
          } : {};
          
          return (
            <div className="feedMeta" style={containerStyle}>
              <div 
                className="feedSub feedSubClickable"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onProfileClick) onProfileClick(post.user_username || post.username || post.user);
                }}
              >
                @{post.user_username || post.username || post.user}
              </div>

              {(post.subfolder_name || post.folder_path) && (
                <div 
                  className="feedFolder feedFolderClickable"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFolderClick) onFolderClick({
                      id: post.subfolder || post.folder,
                      name: post.subfolder_name || post.folder_name,
                      type: post.subfolder ? 'subfolder' : 'folder',
                      user: post.user_username || post.username || post.user,
                      path: post.folder_path
                    });
                  }}
                >
                  {(() => {
                    const name = post.subfolder_name || post.folder_path;
                    const parts = name.split(' > ');
                    return parts.map((part, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {i > 0 && <span style={{ margin: '0 3px', opacity: 0.5 }}>&gt;</span>}
                        <Folder size={11} style={{ marginRight: 3, flexShrink: 0 }} />
                        {part}
                      </span>
                    ));
                  })()}
                </div>
              )}

              <div className={`feedDesc ${isExpanded ? "expanded" : ""}`}>
                {textDisplay}
                {needsTruncation && (
                  <button
                    className="readMoreBtn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePost(post.id);
                    }}
                  >
                    {isExpanded ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            </div>
          );
        };

          return (
            <div
              key={`${post.type}-${post.id}`}
              className="feedPage"
              ref={(el) => (pageRefs.current[idx] = el)}
              data-index={idx}
              onClick={handleClick}
              role="button"
              tabIndex={0}
            >
              {post.type === 'video' ? (
                <>
                  <video
                    className="feedVideo"
                    src={post.stream_url || post.video_url}
                    ref={(el) => (videoRefs.current[idx] = el)}
                    autoPlay={idx === 0}
                    muted={muted}
                    playsInline
                    loop
                    preload="metadata"
                    onPlay={() => { if (idx === activeIndexRef.current) pausedStateRef.current = false; }}
                    onPause={() => { if (idx === activeIndexRef.current) pausedStateRef.current = true; }}
                  />
                  {/* Standard Video Meta Rendering */}
                  {renderMetaContent(false)}
                </>
              ) : (
                /* Photo: Pass Meta as Children for correct layering */
                <PhotoSlideshow images={post.images || []} isActive={idx === activeIndex}>
                  {renderMetaContent(true)}
                </PhotoSlideshow>
              )}

              {post.type === 'video' && idx === activeIndex && tapIndicator ? (
                <div className="feedTapIndicator" aria-hidden="true">
                  <div className="feedTapIndicatorInner">
                    {tapIndicator === 'pause' ? <span className="feedTapIcon">❚❚</span> : <span className="feedTapIcon">▶</span>}
                  </div>
                </div>
              ) : null}

              <div className="feedHeaderOptions">
                <button 
                  className="feedIconButton"
                  onClick={(e) => handleOpenOptions(post, e)}
                  aria-label="More options"
                >
                  <MoreHorizontal size={22} />
                </button>
              </div>

              {post.type === 'video' && idx === activeIndex ? (
                <div className="feedControls" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="feedIconButton"
                    aria-label={muted ? 'Unmute' : 'Mute'}
                    onClick={() => setMuted((m) => !m)}
                  >
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Modals and Feedback */}
      {actionFeedback && (
        <div className="action-feedback-toast">
          {actionFeedback.type === 'favorite' && <Star size={18} />}
          {actionFeedback.type === 'share' && <Link size={18} />}
          {actionFeedback.type === 'download' && <Download size={18} />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {showOptionsModal && selectedPost && (
        <div className="video-modal-overlay" onClick={closeOptionsModal}>
          <div className="video-options-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-options-header">
              <span>@{selectedPost.user_username || selectedPost.username}</span>
              <button className="modal-close-x" onClick={closeOptionsModal}><X size={20} /></button>
            </div>
            <div className="video-options-list">
              <button className="video-option-btn" onClick={() => {
                if (selectedPost?.type !== 'video') return showFeedback('favorite', 'Favorites available for videos');
                handleFavorite();
              }}>
                <Star size={20} /><span>Favorite</span>
              </button>
              <button className="video-option-btn" onClick={handleShare}>
                <Share size={20} /><span>Share</span>
              </button>
              <button className="video-option-btn" onClick={() => {
                if (selectedPost?.type !== 'video') return showFeedback('download', 'Download available for videos');
                handleDownload();
              }}>
                <Download size={20} /><span>Download</span>
              </button>
              <button className="video-option-btn report-option" onClick={openReportModal}>
                <Flag size={20} /><span>Report Post</span>
              </button>
              {canDeleteSelectedPost() && (
                <button className="video-option-btn report-option" onClick={handleDeletePost}>
                  <Trash2 size={20} /><span>Delete Post</span>
                </button>
              )}
              {isAdmin && (
                <button className="video-option-btn report-option" onClick={openSuspendModal}>
                  <AlertOctagon size={20} /><span>Suspend Post</span>
                </button>
              )}
            </div>
            <button className="video-options-cancel" onClick={closeOptionsModal}>Cancel</button>
          </div>
        </div>
      )}

      {showReportModal && selectedPost && (
          <div className="video-modal-overlay" onClick={closeReportModal}>
            <div className="video-report-modal" onClick={(e) => e.stopPropagation()}>
              {reportSubmitted ? (
                 <div className="report-success">
                   <div className="success-icon">✓</div>
                   <h3>Report Submitted</h3>
                 </div>
              ) : (
                <>
                  <div className="report-modal-header"><h2>Report Post</h2><button className="modal-close-x" onClick={closeReportModal}><X size={20} /></button></div>
                  <div className="report-modal-body">
                    <div className="report-reasons">
                      {REPORT_REASONS.map((r) => (
                        <label key={r.id} className="report-reason-item">
                          <input type="radio" name="r" value={r.id} checked={selectedReason === r.id} onChange={(e) => setSelectedReason(e.target.value)} />
                          <span className="reason-label">{r.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="report-note-section">
                       <textarea value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder="Details..." rows={3} />
                    </div>
                  </div>
                  <div className="report-modal-footer">
                    <button className="report-submit-btn" onClick={handleSubmitReport} disabled={!selectedReason || isSubmitting}>Submit</button>
                  </div>
                </>
              )}
            </div>
          </div>
      )}

      {showSuspendModal && selectedPost && (
         <div className="video-modal-overlay" onClick={closeSuspendModal}>
            <div className="video-report-modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px' }}>
               <div className="report-modal-header">
                  <h2>Suspend Post</h2>
                  <button className="modal-close-x" onClick={closeSuspendModal}><X size={20} /></button>
               </div>
               <div className="report-modal-body" style={{ padding: '16px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontSize: '14px' }}>
                     This will suspend the post and notify the user.
                  </p>
                  <textarea
                     value={suspendReason}
                     onChange={e => setSuspendReason(e.target.value)}
                     placeholder="Enter suspension reason (e.g., Inappropriate content, Bullying, etc.)"
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
                        boxSizing: 'border-box',
                        minHeight: '100px'
                     }}
                  />
               </div>
               <div className="report-modal-footer" style={{ padding: '0 16px 16px' }}>
                 <button
                    className="report-submit-btn"
                    onClick={handleSuspendPost}
                    disabled={!suspendReason.trim() || isSuspending}
                    style={{
                       background: (!suspendReason.trim() || isSuspending) ? '#666' : '#dc2626',
                       width: '100%',
                       padding: '12px',
                       borderRadius: '8px',
                       fontSize: '16px',
                       fontWeight: '600'
                    }}
                 >
                    {isSuspending ? 'Suspending...' : 'Suspend Post'}
                 </button>
               </div>
            </div>
         </div>
      )}
    </>
  );
};

export default VideoFeed;