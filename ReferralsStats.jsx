import { useState } from 'react';
import { FiX, FiGlobe, FiLock, FiEyeOff, FiTrash2, FiLoader } from 'react-icons/fi';
import '../styles/FolderOptionsModal.css';

export default function FolderOptionsModal({ folder, isSubfolder, onClose, onUpdate, onDelete }) {
    const [selectedPrivacy, setSelectedPrivacy] = useState(folder.privacy || folder.privacy_type || 'public');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSavePrivacy = async () => {
        if (selectedPrivacy === (folder.privacy || folder.privacy_type)) {
            onClose();
            return;
        }

        setSaving(true);
        setError('');

        try {
            await onUpdate(folder.id, selectedPrivacy, isSubfolder);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to update privacy');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${folder.name}"? This action cannot be undone.`)) {
            return;
        }

        setSaving(true);
        setError('');

        try {
            await onDelete(folder.id, isSubfolder);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to delete folder');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="folder-options-overlay" onClick={onClose}>
            <div className="folder-options-modal" onClick={(e) => e.stopPropagation()}>
                <div className="folder-options-header">
                    <h3>Folder Options</h3>
                    <button className="folder-options-close" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>

                <div className="folder-options-content">
                    <div className="folder-options-section">
                        <label className="folder-options-label">Folder Name</label>
                        <div className="folder-options-name">{folder.name}</div>
                    </div>

                    <div className="folder-options-section">
                        <label className="folder-options-label">Privacy</label>
                        <div className="folder-privacy-options">
                            <button
                                type="button"
                                className={`folder-privacy-option ${selectedPrivacy === 'public' ? 'active' : ''}`}
                                onClick={() => setSelectedPrivacy('public')}
                                disabled={saving}
                            >
                                <FiGlobe size={18} />
                                <div className="folder-privacy-text">
                                    <span className="folder-privacy-title">Public</span>
                                    <span className="folder-privacy-desc">Visible to everyone</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                className={`folder-privacy-option ${selectedPrivacy === 'private' ? 'active' : ''}`}
                                onClick={() => setSelectedPrivacy('private')}
                                disabled={saving}
                            >
                                <FiLock size={18} />
                                <div className="folder-privacy-text">
                                    <span className="folder-privacy-title">Private</span>
                                    <span className="folder-privacy-desc">Only visible with permission</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                className={`folder-privacy-option ${selectedPrivacy === 'hidden' ? 'active' : ''}`}
                                onClick={() => setSelectedPrivacy('hidden')}
                                disabled={saving}
                            >
                                <FiEyeOff size={18} />
                                <div className="folder-privacy-text">
                                    <span className="folder-privacy-title">Hidden</span>
                                    <span className="folder-privacy-desc">Unlisted, accessible via link</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {error && <div className="folder-options-error">{error}</div>}

                    <div className="folder-options-actions">
                        <button
                            type="button"
                            className="folder-options-delete"
                            onClick={handleDelete}
                            disabled={saving}
                        >
                            <FiTrash2 size={16} />
                            <span>Delete Folder</span>
                        </button>

                        <div className="folder-options-main-actions">
                            <button
                                type="button"
                                className="folder-options-cancel"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="folder-options-save"
                                onClick={handleSavePrivacy}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <FiLoader className="spin" size={16} />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Changes</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
