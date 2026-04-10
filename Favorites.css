import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/layout/BottomNav";
import "../styles/Settings.css";
import { SettingsLayout } from "../components/layout/SettingsLayout";
import { adminPostsAPI } from "../services/api";

export default function Settings({ onNavigate, onNavigateToMainProfile, onNavigateToAdmin, onNavigateToBio }) {
    const { user, logout } = useAuth();

    const isAdmin = user?.account_type === 'admin';

    // Password change state (admin only)
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);



    const handleLogout = async () => {
        await logout();
        // After logout, user will be null and App.jsx will show Auth page
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        setChangingPassword(true);
        try {
            await adminPostsAPI.changePassword(currentPassword, newPassword, confirmPassword);
            setPasswordSuccess('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordSection(false);
        } catch (err) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    // Get account type display - use account_type_display from backend if available, otherwise format account_type
    const getAccountTypeDisplay = () => {
        if (user?.account_type_display) {
            return user.account_type_display;
        }
        if (user?.account_type) {
            const typeMap = {
                "user": "User",
                "talent": "Talent",
                "agency": "Agency",
                "agency_talent": "Agency Talent",
                "admin": "Admin"
            };
            return typeMap[user.account_type] || user.account_type;
        }
        return "N/A";
    };

    return (
        <div className="appShell">
            <SettingsLayout onNavigateToMainProfile={onNavigateToMainProfile}>
                <div className="settings-header">
                    <h1>Settings</h1>
                </div>

                {/* User Info Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">Account Information</h2>
                    <div className="user-info-card">
                        <div className="user-info-item">
                            <span className="user-info-label">Username</span>
                            <span className="user-info-value">{user?.username || "N/A"}</span>
                        </div>
                        <div className="user-info-item">
                            <span className="user-info-label">Email</span>
                            <span className="user-info-value">{user?.email || "N/A"}</span>
                        </div>
                        <div className="user-info-item">
                            <span className="user-info-label">Account Type</span>
                            <span className="user-info-value">{getAccountTypeDisplay()}</span>
                        </div>
                        <div className="user-info-item">
                            <span className="user-info-label">Bio</span>
                            <button 
                            className="edit-bio-button"
                            onClick={onNavigateToBio}
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">Actions</h2>
                    <div className="settings-actions">
                        {isAdmin && (
                            <button
                                className="settings-button admin-button"
                                onClick={onNavigateToAdmin}
                            >
                                Admin Analytics
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                className="settings-button password-button"
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                            >
                                {showPasswordSection ? 'Cancel Password Change' : 'Reset Password'}
                            </button>
                        )}
                        <button
                            className="settings-button logout-button"
                            onClick={handleLogout}
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                {/* Password Change Section (Admin Only) */}
                {isAdmin && showPasswordSection && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Change Password</h2>
                        <div className="password-change-form">
                            {passwordError && (
                                <div className="password-message error">{passwordError}</div>
                            )}
                            {passwordSuccess && (
                                <div className="password-message success">{passwordSuccess}</div>
                            )}

                            <div className="password-input-group">
                                <label>Current Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                    />
                                </div>
                            </div>

                            <div className="password-input-group">
                                <label>New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                    />
                                </div>
                            </div>

                            <div className="password-input-group">
                                <label>Confirm New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            <button
                                className="settings-button submit-password-btn"
                                onClick={handleChangePassword}
                                disabled={changingPassword}
                            >
                                {changingPassword ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                )}
            </SettingsLayout>
            <BottomNav onNavigate={onNavigate} />
        </div>
    );
}
