import { useState, useEffect } from "react";
import { privateFolderAPI } from "../services/api";
import { FiLock, FiLoader, FiCheck, FiX, FiSend } from "react-icons/fi";
import "../styles/Settings.css";

export default function PrivateFolderJoin({ inviteCode, onBack, onClearInviteCode }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [alreadyRequested, setAlreadyRequested] = useState(false);
    const [alreadyHasAccess, setAlreadyHasAccess] = useState(false);

    const handleRequestAccess = async () => {
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            await privateFolderAPI.requestAccess(inviteCode, message.trim());
            setSuccess(true);
            // Clear invite code after successful request
            if (onClearInviteCode) {
                setTimeout(() => {
                    onClearInviteCode();
                }, 3000);
            }
        } catch (err) {
            const errorMsg = err.message || 'Failed to request access';
            if (errorMsg.includes('already requested') || errorMsg.includes('pending')) {
                setAlreadyRequested(true);
            } else if (errorMsg.includes('already have access')) {
                setAlreadyHasAccess(true);
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="appShell">
                <div className="settings-page">
                    <main className="settings-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24
                        }}>
                            <FiCheck size={40} color="#22c55e" />
                        </div>
                        <h2 style={{ color: 'white', marginBottom: 8 }}>Request Sent!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280 }}>
                            Your access request has been sent. You'll be able to view their private content once they approve.
                        </p>
                        <button
                            onClick={onBack}
                            style={{
                                marginTop: 24,
                                padding: '12px 24px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: 8,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            Go Back
                        </button>
                    </main>
                </div>
            </div>
        );
    }

    if (alreadyRequested) {
        return (
            <div className="appShell">
                <div className="settings-page">
                    <main className="settings-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(251, 191, 36, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24
                        }}>
                            <FiLock size={40} color="#fbbf24" />
                        </div>
                        <h2 style={{ color: 'white', marginBottom: 8 }}>Already Requested</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280 }}>
                            You already have a pending access request. Please wait for the owner to respond.
                        </p>
                        <button
                            onClick={onBack}
                            style={{
                                marginTop: 24,
                                padding: '12px 24px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: 8,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            Go Back
                        </button>
                    </main>
                </div>
            </div>
        );
    }

    if (alreadyHasAccess) {
        return (
            <div className="appShell">
                <div className="settings-page">
                    <main className="settings-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24
                        }}>
                            <FiCheck size={40} color="#22c55e" />
                        </div>
                        <h2 style={{ color: 'white', marginBottom: 8 }}>You Have Access</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280 }}>
                            You already have access to this private folder.
                        </p>
                        <button
                            onClick={onBack}
                            style={{
                                marginTop: 24,
                                padding: '12px 24px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: 8,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            Go Back
                        </button>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="appShell">
            <div className="settings-page">
                <main className="settings-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24
                    }}>
                        <FiLock size={40} color="#3b82f6" />
                    </div>

                    <h2 style={{ color: 'white', marginBottom: 8 }}>Private Folder Access</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280, marginBottom: 24 }}>
                        Request access to view this user's private content
                    </p>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '12px 16px',
                            borderRadius: 10,
                            fontSize: 14,
                            marginBottom: 20,
                            width: '100%',
                            maxWidth: 300,
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ width: '100%', maxWidth: 300 }}>
                        <label style={{
                            display: 'block',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 13,
                            marginBottom: 8
                        }}>
                            Add a message (optional)
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tell them why you'd like access..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 8,
                                color: 'white',
                                fontSize: 14,
                                resize: 'none',
                                minHeight: 80
                            }}
                        />
                    </div>

                    <button
                        onClick={handleRequestAccess}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginTop: 20,
                            padding: '14px 28px',
                            background: loading ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6',
                            border: 'none',
                            borderRadius: 10,
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: 15,
                            fontWeight: 600,
                            width: '100%',
                            maxWidth: 300
                        }}
                    >
                        {loading ? (
                            <>
                                <FiLoader className="spin" size={18} />
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <FiSend size={18} />
                                <span>Request Access</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onBack}
                        style={{
                            marginTop: 12,
                            padding: '12px 24px',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: 14
                        }}
                    >
                        Cancel
                    </button>
                </main>
            </div>
        </div>
    );
}
