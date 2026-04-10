import { useState, useRef } from 'react';
import { ArrowUp, Image, X, Loader } from 'lucide-react';
import '../../styles/Messages.css';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ATTACHMENT_SIZE_MB = 300;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024; // 300MB

export default function MessageInput({ onSendMessage, onUploadAttachment, replyingTo, onCancelReply }) {
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const hasContent = content.trim().length > 0;
        const hasAttachment = attachment?.url;

        if ((!hasContent && !hasAttachment) || content.length > MAX_MESSAGE_LENGTH || sending) {
            return;
        }

        setSending(true);
        try {
            await onSendMessage(
                content.trim(),
                attachment?.type || 'none',
                attachment?.url || null,
                replyingTo?.id || null
            );
            setContent('');
            setAttachment(null);
            // Reply is cleared by parent after successful send
        } catch (err) {
            // Error handling is done in parent
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

        // Create preview
        const preview = URL.createObjectURL(file);
        const attachmentType = isImage ? 'photo' : 'video';

        setAttachment({
            type: attachmentType,
            file,
            preview,
            url: null,
        });

        // Upload file
        if (onUploadAttachment) {
            setUploading(true);
            try {
                const result = await onUploadAttachment(file);
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
        }

        // Reset file input
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

    const canSend = ((content.trim().length > 0 || attachment?.url) &&
                     content.length <= MAX_MESSAGE_LENGTH &&
                     !sending &&
                     !uploading);

    return (
        <form className="message-input-form" onSubmit={handleSubmit}>
            {/* Reply Preview */}
            {replyingTo && (
                <div className="reply-input-preview">
                    <div className="reply-input-bar"></div>
                    <div className="reply-input-content">
                        <span className="reply-input-label">Replying to @{replyingTo.sender_username}</span>
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
                        onClick={onCancelReply}
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
                    className="message-input"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <button
                    type="submit"
                    className="message-send-button"
                    disabled={!canSend}
                    title="Send message"
                >
                    <ArrowUp size={20} />
                </button>
            </div>
        </form>
    );
}
