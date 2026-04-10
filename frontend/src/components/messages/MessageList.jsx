import { useState, useRef } from 'react';
import { messageReportsAPI } from '../../services/api';
import { X, Reply, Flag } from 'lucide-react';
import '../../styles/Messages.css';

const REPORT_REASONS = [
    { value: 'inappropriate', label: 'Inappropriate Message' },
    { value: 'bullying', label: 'Bullying and Harassment' },
    { value: 'fraudulent', label: 'Fraudulent Activity' },
    { value: 'impersonation', label: 'Impersonation' },
];

const LONG_PRESS_DURATION = 500;

export default function MessageList({ messages, currentUser, onReply, messageRefs }) {
    const [expandedMedia, setExpandedMedia] = useState(null);
    const [optionsModal, setOptionsModal] = useState(null); // New: options modal (Reply/Report)
    const [reportModal, setReportModal] = useState(null);
    const [selectedReason, setSelectedReason] = useState('');
    const [reportNote, setReportNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const longPressTimer = useRef(null);
    const longPressTriggered = useRef(false);

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const handleLongPressStart = (message) => {
        longPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            // Show options modal instead of report modal directly
            setOptionsModal({
                message: message,
                canReport: message.sender_id !== currentUser.id, // Can't report your own messages
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
            if (onReply) {
                onReply(message);
            }
        } else if (option === 'report' && message) {
            setReportModal({
                messageId: message.id,
                senderUsername: message.sender_username,
            });
            setSelectedReason('');
            setReportNote('');
        }
    };

    const handleSubmitReport = async () => {
        if (!selectedReason || !reportModal) return;

        setSubmitting(true);
        try {
            await messageReportsAPI.submitReport(
                reportModal.messageId,
                selectedReason,
                reportNote || null
            );
            alert('Report submitted successfully');
            setReportModal(null);
        } catch (err) {
            alert(err.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    const scrollToMessage = (messageId) => {
        if (messageRefs?.current?.[messageId]) {
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

    if (messages.length === 0) {
        return (
            <div className="messages-empty">
                <p>No messages yet. Start the conversation!</p>
            </div>
        );
    }

    return (
        <>
            <div className="message-list">
                {messages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUser.id;
                    const hasAttachment = message.attachment_type && message.attachment_type !== 'none';
                    const replyData = message.reply_to_data;

                    return (
                        <div
                            key={message.id}
                            ref={(el) => {
                                if (messageRefs?.current) {
                                    messageRefs.current[message.id] = el;
                                }
                            }}
                            className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
                            onTouchStart={() => handleLongPressStart(message)}
                            onTouchEnd={handleLongPressEnd}
                            onTouchCancel={handleLongPressEnd}
                            onMouseDown={() => handleLongPressStart(message)}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onContextMenu={handleContextMenu}
                        >
                            <div className="message-content">
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
                                {/* Attachment */}
                                {hasAttachment && message.attachment_url && (
                                    <div
                                        className="message-attachment"
                                        onClick={() => setExpandedMedia({
                                            type: message.attachment_type,
                                            url: message.attachment_url
                                        })}
                                    >
                                        {message.attachment_type === 'photo' ? (
                                            <img
                                                src={message.attachment_url}
                                                alt="Photo attachment"
                                                className="message-attachment-image"
                                            />
                                        ) : (
                                            <video
                                                src={message.attachment_url}
                                                className="message-attachment-video"
                                                preload="metadata"
                                            />
                                        )}
                                        {message.attachment_type === 'video' && (
                                            <div className="message-attachment-play">▶</div>
                                        )}
                                    </div>
                                )}
                                {/* Text content */}
                                {message.content && (
                                    <p className="message-text">{message.content}</p>
                                )}
                                <span className="message-time">{formatTime(message.created_at)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

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
            {reportModal && (
                <div className="report-modal-overlay" onClick={() => setReportModal(null)}>
                    <div className="report-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="report-modal-header">
                            <h3>Report Message</h3>
                            <button
                                className="report-modal-close"
                                onClick={() => setReportModal(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="report-modal-subtitle">
                            Report message from @{reportModal.senderUsername}
                        </p>

                        <div className="report-reasons">
                            {REPORT_REASONS.map((reason) => (
                                <label key={reason.value} className="report-reason-option">
                                    <input
                                        type="radio"
                                        name="reportReason"
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
                            disabled={!selectedReason || submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
