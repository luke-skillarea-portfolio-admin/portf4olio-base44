import { useState, useEffect, useRef } from 'react';
import { groupsAPI, messagesAPI, messageReportsAPI } from '../../services/api';
import { ArrowLeft, Send, Settings, Users, Link, UserPlus, LogOut, Image, X, Loader, Reply, Flag } from 'lucide-react';
import '../../styles/Messages.css';

const REPORT_REASONS = [
    { value: 'inappropriate', label: 'Inappropriate Message' },
    { value: 'bullying', label: 'Bullying and Harassment' },
    { value: 'fraudulent', label: 'Fraudulent Activity' },
    { value: 'impersonation', label: 'Impersonation' },
];

const LONG_PRESS_DURATION = 500;
const MAX_ATTACHMENT_SIZE_MB = 300;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024; // 300MB

export default function GroupChatView({ group, currentUser, onBack, onManageGroup }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [expandedMedia, setExpandedMedia] = useState(null);
    const [optionsModal, setOptionsModal] = useState(null); // New: options modal (Reply/Report)
    const [reportModal, setReportModal] = useState({ show: false, message: null });
    const [selectedReason, setSelectedReason] = useState('');
    const [reportNote, setReportNote] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const messagesEndRef = useRef(null);
    const messageRefs = useRef({});
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const longPressTimer = useRef(null);
    const longPressTriggered = useRef(false);

    const isAdmin = group.my_role === 'admin';

    useEffect(() => {
        messageRefs.current = {};
        loadMessages();
        const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [group.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const data = await groupsAPI.getGroupMessages(group.id);
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Error loading group messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToMessage = (messageId) => {
        if (messageRefs.current[messageId]) {
            messageRefs.current[messageId].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            // Flash the message briefly
            messageRefs.current[messageId].classList.add('message-highlight');
            setTimeout(() => {
                messageRefs.current[messageId]?.classList.remove('message-highlight');
            }, 1500);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const hasContent = newMessage.trim().length > 0;
        const hasAttachment = attachment?.url;

        if ((!hasContent && !hasAttachment) || sending) return;

        setSending(true);
        try {
            await groupsAPI.sendGroupMessage(
                group.id,
                newMessage.trim(),
                attachment?.type || 'none',
                attachment?.url || null,
                replyingTo?.id || null
            );
            setNewMessage('');
            setAttachment(null);
            setReplyingTo(null);
            await loadMessages();
            inputRef.current?.focus();
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            alert('Only images and videos are allowed');
            return;
        }

        // Check file size (300MB max)
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            alert(`File too large. Maximum size is ${MAX_ATTACHMENT_SIZE_MB}MB. Your file is ${fileSizeMB}MB.`);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        const preview = URL.createObjectURL(file);
        const attachmentType = isImage ? 'photo' : 'video';

        setAttachment({
            type: attachmentType,
            file,
            preview,
            url: null,
        });

        setUploading(true);
        try {
            const result = await messagesAPI.uploadAttachment(file);
            setAttachment((prev) => ({
                ...prev,
                url: result.attachment_url,
            }));
        } catch (err) {
            console.error('Failed to upload attachment:', err);
            alert('Failed to upload file. Please try again.');
            setAttachment(null);
        } finally {
            setUploading(false);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = () => {
        if (attachment?.preview) {
            URL.revokeObjectURL(attachment.preview);
        }
        setAttachment(null);
    };

    const handleCopyInviteLink = async () => {
        try {
            const data = await groupsAPI.getInviteLink(group.id);
            const fullLink = `${window.location.origin}${data.invite_link}`;
            await navigator.clipboard.writeText(fullLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Error getting invite link:', err);
            alert(err.message || 'Failed to get invite link');
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            await groupsAPI.leaveGroup(group.id);
            onBack();
        } catch (err) {
            alert(err.message || 'Failed to leave group');
        }
    };

    const handleLongPressStart = (msg) => {
        longPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            // Show options modal instead of report modal directly
            setOptionsModal({
                message: msg,
                canReport: msg.sender !== currentUser.id,
            });
        }, LONG_PRESS_DURATION);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    const handleOptionSelect = (option) => {
        const message = optionsModal?.message;
        setOptionsModal(null);

        if (option === 'reply' && message) {
            setReplyingTo(message);
            inputRef.current?.focus();
        } else if (option === 'report' && message) {
            setReportModal({ show: true, message });
            setSelectedReason('');
            setReportNote('');
        }
    };

    const handleSubmitReport = async () => {
        if (!selectedReason || !reportModal.message) return;

        setSubmittingReport(true);
        try {
            await messageReportsAPI.submitGroupReport(
                reportModal.message.id,
                selectedReason,
                reportNote || null
            );
            alert('Report submitted successfully. Our team will review it.');
            setReportModal({ show: false, message: null });
            setSelectedReason('');
            setReportNote('');
        } catch (err) {
            alert(err.message || 'Failed to submit report');
        } finally {
            setSubmittingReport(false);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    };

    // Group messages by date
    const groupedMessages = messages.reduce((acc, msg) => {
        const dateKey = formatDate(msg.created_at);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(msg);
        return acc;
    }, {});

    return (
        <div className="conversation-view">
            <div className="conversation-header">
                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="conversation-header-info">
                    <div className="conversation-header-avatar group-avatar">
                        <Users size={18} />
                    </div>
                    <div className="conversation-header-details">
                        <span className="conversation-header-name">{group.name}</span>
                        <span className="conversation-header-status">{group.member_count} members</span>
                    </div>
                </div>
                <button
                    className="conversation-options-btn"
                    onClick={() => setShowOptions(!showOptions)}
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Options dropdown */}
            {showOptions && (
                <div className="group-options-dropdown">
                    {isAdmin && (
                        <>
                            <button onClick={handleCopyInviteLink}>
                                <Link size={16} />
                                <span>{copySuccess ? 'Link Copied!' : 'Copy Invite Link'}</span>
                            </button>
                            <button onClick={() => { setShowOptions(false); onManageGroup(group); }}>
                                <UserPlus size={16} />
                                <span>Manage Members</span>
                            </button>
                        </>
                    )}
                    <button className="leave-group-btn" onClick={handleLeaveGroup}>
                        <LogOut size={16} />
                        <span>Leave Group</span>
                    </button>
                </div>
            )}

            <div className="messages-container">
                {loading ? (
                    <div className="messages-loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="messages-empty">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    Object.entries(groupedMessages).map(([date, dateMessages]) => (
                        <div key={date}>
                            <div className="message-date-divider">
                                <span>{date}</span>
                            </div>
                            {dateMessages.map((msg, index) => {
                                const isOwnMessage = msg.sender === currentUser.id;
                                const showAvatar = !isOwnMessage &&
                                    (index === 0 || dateMessages[index - 1]?.sender !== msg.sender);
                                const showName = !isOwnMessage &&
                                    (index === 0 || dateMessages[index - 1]?.sender !== msg.sender);
                                const hasAttachment = msg.attachment_type && msg.attachment_type !== 'none';
                                const replyData = msg.reply_to_data;

                                return (
                                    <div
                                        key={msg.id}
                                        ref={(el) => { messageRefs.current[msg.id] = el; }}
                                        className={`message ${isOwnMessage ? 'message-sent' : 'message-received'} ${!isOwnMessage ? 'message-with-avatar' : ''}`}
                                        onTouchStart={() => handleLongPressStart(msg)}
                                        onTouchEnd={handleLongPressEnd}
                                        onTouchCancel={handleLongPressEnd}
                                        onMouseDown={() => handleLongPressStart(msg)}
                                        onMouseUp={handleLongPressEnd}
                                        onMouseLeave={handleLongPressEnd}
                                        onContextMenu={handleContextMenu}
                                    >
                                        {!isOwnMessage && (
                                            <div className={`message-avatar-container ${!showAvatar ? 'avatar-placeholder' : ''}`}>
                                                {showAvatar && (
                                                    <div className="message-avatar">
                                                        {msg.sender_data?.profile_picture ? (
                                                            <img src={msg.sender_data.profile_picture} alt={msg.sender_data.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                                        ) : (
                                                            msg.sender_data?.username?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="message-content-wrapper">
                                            {showName && (
                                                <span className="message-sender-name">{msg.sender_data?.username}</span>
                                            )}
                                            <div className="message-bubble">
                                                {/* Reply Preview */}
                                                {replyData && (
                                                    <div
                                                        className="message-reply-preview"
                                                        onClick={() => scrollToMessage(replyData.id)}
                                                    >
                                                        <div className="reply-preview-bar"></div>
                                                        <div className="reply-preview-content">
                                                            <span className="reply-preview-sender">
                                                                {replyData.sender_id === currentUser.id ? 'You' : `@${replyData.sender_username}`}
                                                            </span>
                                                            <span className="reply-preview-text">
                                                                {replyData.attachment_type && replyData.attachment_type !== 'none'
                                                                    ? `[${replyData.attachment_type === 'photo' ? 'Photo' : 'Video'}]`
                                                                    : ''}
                                                                {replyData.content ? ` ${replyData.content}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {hasAttachment && msg.attachment_url && (
                                                    <div
                                                        className="message-attachment"
                                                        onClick={() => setExpandedMedia({
                                                            type: msg.attachment_type,
                                                            url: msg.attachment_url
                                                        })}
                                                    >
                                                        {msg.attachment_type === 'photo' ? (
                                                            <img
                                                                src={msg.attachment_url}
                                                                alt="Photo"
                                                                className="message-attachment-image"
                                                            />
                                                        ) : (
                                                            <video
                                                                src={msg.attachment_url}
                                                                className="message-attachment-video"
                                                                preload="metadata"
                                                            />
                                                        )}
                                                        {msg.attachment_type === 'video' && (
                                                            <div className="message-attachment-play">▶</div>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.content && (
                                                    <p className="message-content">{msg.content}</p>
                                                )}
                                                <span className="message-time">{formatTime(msg.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={handleSend}>
                {/* Reply Preview */}
                {replyingTo && (
                    <div className="reply-input-preview">
                        <div className="reply-input-bar"></div>
                        <div className="reply-input-content">
                            <span className="reply-input-label">Replying to @{replyingTo.sender_data?.username}</span>
                            <span className="reply-input-text">
                                {replyingTo.attachment_type && replyingTo.attachment_type !== 'none'
                                    ? `[${replyingTo.attachment_type === 'photo' ? 'Photo' : 'Video'}]`
                                    : ''}
                                {replyingTo.content ? ` ${replyingTo.content.substring(0, 50)}${replyingTo.content.length > 50 ? '...' : ''}` : ''}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="reply-input-cancel"
                            onClick={() => setReplyingTo(null)}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Attachment Preview */}
                {attachment && (
                    <div className="attachment-preview">
                        <div className="attachment-preview-content">
                            {attachment.type === 'photo' ? (
                                <img src={attachment.preview} alt="Attachment" />
                            ) : (
                                <video src={attachment.preview} />
                            )}
                            {uploading && (
                                <div className="attachment-uploading">
                                    <Loader className="spin" size={24} />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="attachment-remove"
                            onClick={handleRemoveAttachment}
                            disabled={sending}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="message-input-container">
                    <button
                        type="button"
                        className="message-attach-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || uploading}
                        title="Attach photo or video"
                    >
                        <Image size={20} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <textarea
                        ref={inputRef}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                        className="message-input"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !attachment?.url) || sending || uploading}
                        className="message-send-button"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>

            {/* Expanded Media Modal */}
            {expandedMedia && (
                <div className="media-modal-overlay" onClick={() => setExpandedMedia(null)}>
                    <div className="media-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="media-modal-close"
                            onClick={() => setExpandedMedia(null)}
                        >
                            ×
                        </button>
                        {expandedMedia.type === 'photo' ? (
                            <img src={expandedMedia.url} alt="Expanded" />
                        ) : (
                            <video src={expandedMedia.url} controls autoPlay />
                        )}
                    </div>
                </div>
            )}

            {/* Options Modal (Reply/Report) */}
            {optionsModal && (
                <div className="message-options-overlay" onClick={() => setOptionsModal(null)}>
                    <div className="message-options-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="message-option-btn"
                            onClick={() => handleOptionSelect('reply')}
                        >
                            <Reply size={20} />
                            <span>Reply</span>
                        </button>
                        {optionsModal.canReport && (
                            <button
                                className="message-option-btn message-option-report"
                                onClick={() => handleOptionSelect('report')}
                            >
                                <Flag size={20} />
                                <span>Report</span>
                            </button>
                        )}
                        <button
                            className="message-option-btn message-option-cancel"
                            onClick={() => setOptionsModal(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportModal.show && (
                <div className="report-modal-overlay" onClick={() => setReportModal({ show: false, message: null })}>
                    <div className="report-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="report-modal-header">
                            <h3>Report Message</h3>
                            <button
                                className="report-modal-close"
                                onClick={() => setReportModal({ show: false, message: null })}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="report-modal-body">
                            <p className="report-modal-subtitle">Why are you reporting this message?</p>
                            <div className="report-reasons">
                                {REPORT_REASONS.map((reason) => (
                                    <label key={reason.value} className="report-reason-option">
                                        <input
                                            type="radio"
                                            name="report-reason"
                                            value={reason.value}
                                            checked={selectedReason === reason.value}
                                            onChange={(e) => setSelectedReason(e.target.value)}
                                        />
                                        <span>{reason.label}</span>
                                    </label>
                                ))}
                            </div>
                            <textarea
                                className="report-note-input"
                                placeholder="Additional details (optional)"
                                value={reportNote}
                                onChange={(e) => setReportNote(e.target.value)}
                                rows={3}
                            />
                            <button
                                className="report-submit-btn"
                                onClick={handleSubmitReport}
                                disabled={!selectedReason || submittingReport}
                            >
                                {submittingReport ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
