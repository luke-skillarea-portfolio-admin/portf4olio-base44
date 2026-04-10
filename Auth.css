import { useState, useEffect } from "react";
import BottomNav from "../components/layout/BottomNav";
import { privacyAPI, contentAPI, profileAccessAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
    FiGlobe, FiLock, FiLoader, FiCheck,
    FiChevronRight, FiUserCheck, FiUserX, FiUsers, FiTrash2, FiEyeOff
} from "react-icons/fi";
import "../styles/Settings.css";
import "../styles/ProfileVisibility.css";
import { SettingsLayout } from "../components/layout/SettingsLayout";

export default function ProfileVisibility({ onNavigateToMainProfile, onNavigate, onNavigateToFolder }) {
    const { user } = useAuth();
    const [privacySetting, setPrivacySetting] = useState('public');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [publicCount, setPublicCount] = useState(0);
    const [privateCount, setPrivateCount] = useState(0);
    const [hiddenCount, setHiddenCount] = useState(0);

    // Profile access management state
    const [accessRequests, setAccessRequests] = useState([]);
    const [accessList, setAccessList] = useState([]);
    const [accessLoading, setAccessLoading] = useState(false);
    const [respondingTo, setRespondingTo] = useState(null);
    const [revokingUser, setRevokingUser] = useState(null);

    // Only allow talent, agency_talent, and agency account types
    const allowedAccountTypes = ['talent', 'agency_talent', 'agency'];
    const isAllowedAccountType = user && allowedAccountTypes.includes(user.account_type);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [privacyData, contentData] = await Promise.all([
                privacyAPI.getPrivacySettings(),
                contentAPI.getMyContent()
            ]);
            setPrivacySetting(privacyData.privacy_setting);

            const pub = contentData.public || { subfolders: [], videos: [], photo_posts: [] };
            const priv = contentData.private || { subfolders: [], videos: [], photo_posts: [] };
            const hid = contentData.hidden || { subfolders: [], videos: [], photo_posts: [] };

            const pubSubfolderCount = pub.subfolders.reduce(
                (acc, sf) => acc + (sf.video_count || 0) + (sf.photo_post_count || 0), 0
            );
            const privSubfolderCount = priv.subfolders.reduce(
                (acc, sf) => acc + (sf.video_count || 0) + (sf.photo_post_count || 0), 0
            );
            const hidSubfolderCount = hid.subfolders.reduce(
                (acc, sf) => acc + (sf.video_count || 0) + (sf.photo_post_count || 0), 0
            );

            setPublicCount(pub.videos.length + pub.photo_posts.length + pubSubfolderCount);
            setPrivateCount(priv.videos.length + priv.photo_posts.length + privSubfolderCount);
            setHiddenCount(hid.videos.length + hid.photo_posts.length + hidSubfolderCount);
        } catch (err) {
            setError('Failed to load settings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 2000);
    };

    // Fetch profile access requests and access list when privacy is private
    const fetchAccessData = async () => {
        if (privacySetting !== 'private') return;

        setAccessLoading(true);
        try {
            const [requestsData, listData] = await Promise.all([
                profileAccessAPI.getAccessRequests(),
                profileAccessAPI.getAccessList()
            ]);
            setAccessRequests(requestsData.requests || []);
            setAccessList(listData.access_list || []);
        } catch (err) {
            console.error('Failed to fetch access data:', err);
        } finally {
            setAccessLoading(false);
        }
    };

    // Fetch access data when privacy setting changes to private
    useEffect(() => {
        if (privacySetting === 'private' && !loading) {
            fetchAccessData();
        }
    }, [privacySetting, loading]);

    const handleRespondToRequest = async (requestId, action) => {
        setRespondingTo(requestId);
        try {
            await profileAccessAPI.respondToRequest(requestId, action);
            // Remove from requests list
            setAccessRequests(prev => prev.filter(r => r.id !== requestId));
            // If approved, refresh access list
            if (action === 'approve') {
                const listData = await profileAccessAPI.getAccessList();
                setAccessList(listData.access_list || []);
            }
            showSuccessMessage(action === 'approve' ? 'Access granted!' : 'Request denied');
        } catch (err) {
            setError(err.message || 'Failed to respond to request');
        } finally {
            setRespondingTo(null);
        }
    };

    const handleRevokeAccess = async (userId, username) => {
        if (!window.confirm(`Remove ${username}'s access to your profile?`)) return;

        setRevokingUser(userId);
        try {
            await profileAccessAPI.revokeAccess(userId);
            setAccessList(prev => prev.filter(a => a.granted_to !== userId));
            showSuccessMessage('Access revoked');
        } catch (err) {
            setError(err.message || 'Failed to revoke access');
        } finally {
            setRevokingUser(null);
        }
    };

    // Restrict access to only talent, agency_talent, and agency accounts
    if (!isAllowedAccountType) {
        return (
            <div className="appShell">
                <SettingsLayout
                    onNavigateToMainProfile={onNavigateToMainProfile}
                    className="profile-visibility"
                >
                    <div className="settings-header">
                        <h1>Profile Visibility</h1>
                    </div>
                    <div className="access-denied-message">
                        <FiLock size={48} />
                        <h2>Access Restricted</h2>
                        <p>Profile Visibility settings are only available for Talent, Agency Talent, and Agency accounts.</p>
                    </div>
                </SettingsLayout>
                <BottomNav onNavigate={onNavigate} />
            </div>
        );
    }

    return (
        <div className="appShell">
            <SettingsLayout
            onNavigateToMainProfile={onNavigateToMainProfile}
            className="profile-visibility"
            >
                <div className="settings-header">
                    <h1>Profile Visibility</h1>
                </div>

                {loading ? (
                    <div className="privacy-loading">
                        <FiLoader size={32} className="spin" />
                        <p>Loading settings...</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="privacy-error">{error}</div>
                        )}

                        {success && (
                            <div className="privacy-success">
                                <FiCheck size={16} />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Content Folders Section */}
                        <div className="privacy-section">
                            <h2 className="privacy-section-title">Content Organization</h2>
                            <p className="privacy-section-desc">Manage your content in public and private folders</p>

                            <div className="main-folders">
                                {/* Public Folder */}
                                <button
                                    className="main-folder-card public"
                                    onClick={() => onNavigateToFolder('public')}
                                >
                                    <div className="main-folder-icon">
                                        <FiGlobe size={28} />
                                    </div>
                                    <div className="main-folder-info">
                                        <span className="main-folder-name">Public Folder</span>
                                        <span className="main-folder-desc">Visible to everyone</span>
                                        <span className="main-folder-count">{publicCount} items</span>
                                    </div>
                                    <FiChevronRight size={20} className="main-folder-arrow" />
                                </button>

                                {/* Private Folder */}
                                <button
                                    className="main-folder-card private"
                                    onClick={() => onNavigateToFolder('private')}
                                >
                                    <div className="main-folder-icon">
                                        <FiLock size={28} />
                                    </div>
                                    <div className="main-folder-info">
                                        <span className="main-folder-name">Private Folder</span>
                                        <span className="main-folder-desc">Only you and granted users</span>
                                        <span className="main-folder-count">{privateCount} items</span>
                                    </div>
                                    <FiChevronRight size={20} className="main-folder-arrow" />
                                </button>

                                {/* Hidden Folder */}
                                <button
                                    className="main-folder-card hidden"
                                    onClick={() => onNavigateToFolder('hidden')}
                                >
                                    <div className="main-folder-icon">
                                        <FiEyeOff size={28} />
                                    </div>
                                    <div className="main-folder-info">
                                        <span className="main-folder-name">Hidden Folder</span>
                                        <span className="main-folder-desc">Accessible via direct link only</span>
                                        <span className="main-folder-count">{hiddenCount} items</span>
                                    </div>
                                    <FiChevronRight size={20} className="main-folder-arrow" />
                                </button>
                            </div>
                        </div>

                        {/* Profile Access Management (only shown when profile is private) */}
                        {privacySetting === 'private' && (
                            <div className="privacy-section">
                                <h2 className="privacy-section-title">
                                    <FiUsers size={18} />
                                    Profile Access Management
                                </h2>

                                {accessLoading ? (
                                    <div className="access-loading">
                                        <FiLoader size={20} className="spin" />
                                        <span>Loading access data...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Pending Access Requests */}
                                        {accessRequests.length > 0 && (
                                            <div className="access-requests-section">
                                                <h3 className="access-subsection-title">
                                                    Pending Requests ({accessRequests.length})
                                                </h3>
                                                <div className="access-list">
                                                    {accessRequests.map((request) => (
                                                        <div key={request.id} className="access-item request">
                                                            <div className="access-user-info">
                                                                <div className="access-avatar">
                                                                    {request.requester_username?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="access-details">
                                                                    <span className="access-username">@{request.requester_username}</span>
                                                                    {request.message && (
                                                                        <span className="access-message">"{request.message}"</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="access-actions">
                                                                <button
                                                                    className="access-btn approve"
                                                                    onClick={() => handleRespondToRequest(request.id, 'approve')}
                                                                    disabled={respondingTo === request.id}
                                                                    title="Approve"
                                                                >
                                                                    <FiUserCheck size={18} />
                                                                </button>
                                                                <button
                                                                    className="access-btn deny"
                                                                    onClick={() => handleRespondToRequest(request.id, 'deny')}
                                                                    disabled={respondingTo === request.id}
                                                                    title="Deny"
                                                                >
                                                                    <FiUserX size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Users with Access */}
                                        <div className="access-list-section">
                                            <h3 className="access-subsection-title">
                                                Users with Access ({accessList.length})
                                            </h3>
                                            {accessList.length > 0 ? (
                                                <div className="access-list">
                                                    {accessList.map((access) => (
                                                        <div key={access.id} className="access-item">
                                                            <div className="access-user-info">
                                                                <div className="access-avatar">
                                                                    {access.granted_to_username?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="access-details">
                                                                    <span className="access-username">@{access.granted_to_username}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                className="access-btn revoke"
                                                                onClick={() => handleRevokeAccess(access.granted_to, access.granted_to_username)}
                                                                disabled={revokingUser === access.granted_to}
                                                                title="Revoke access"
                                                            >
                                                                <FiTrash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="no-access-users">No users have been granted access yet.</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                                            </>
                )}
                <BottomNav onNavigate={onNavigate} />
            </SettingsLayout>
        </div>
    );
}
