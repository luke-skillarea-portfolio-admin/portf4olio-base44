import BottomNav from "../components/layout/BottomNav";
import "../styles/Settings.css";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { authAPI } from "../services/api";
import { useState } from "react";
import { SettingsLayout } from "../components/layout/SettingsLayout";

export default function SwitchAccount({ onNavigateToMainProfile, onNavigate }) {
    const { user, checkAuth } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [linkFormData, setLinkFormData] = useState({
        usernameOrEmail: '',
        password: ''
    });
    const [linkLoading, setLinkLoading] = useState(false);

    const canSwitch = user?.can_switch_account;
    const switchableType = user?.switchable_account_type;

    const handleSwitch = async () => {
        setError('');
        setLoading(true);
        try {
            await authAPI.switchAccountType();
            await checkAuth();
        } catch (e) {
            setError(e?.message || 'Failed to switch account');
        }
        setLoading(false);
    };

    const handleLinkAccount = async (e) => {
        e.preventDefault();
        setError('');
        setLinkLoading(true);
        
        try {
            await authAPI.linkAccount(linkFormData.usernameOrEmail, linkFormData.password);
            await checkAuth(); // Refresh user data
            setShowLinkForm(false);
            setLinkFormData({ usernameOrEmail: '', password: '' });
        } catch (e) {
            setError(e?.message || 'Failed to link account');
        }
        setLinkLoading(false);
    };

    const getAccountTypeDisplay = (accountType) => {
        const typeMap = {
            "user": "User",
            "talent": "Talent", 
            "agency": "Agency",
            "agency_talent": "Agency Talent",
            "admin": "Admin"
        };
        return typeMap[accountType] || accountType;
    };

    return (
        <div className="appShell">
            <SettingsLayout onNavigateToMainProfile={onNavigateToMainProfile}>
                    <div className="settings-header">
                        <h1>Switch Account Type</h1>
                    </div>

                    <div className="settings-section">
                        <h2 className="settings-section-title">Current Account</h2>
                        <div className="user-info-card">
                            <div className="user-info-item">
                                <span className="user-info-label">Username</span>
                                <span className="user-info-value">{user?.username}</span>
                            </div>
                            <div className="user-info-item">
                                <span className="user-info-label">Type</span>
                                <span className="user-info-value">{getAccountTypeDisplay(user?.account_type)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2 className="settings-section-title">Switch Account</h2>
                        
                        {error && (
                            <div style={{ 
                                backgroundColor: '#442222', 
                                color: '#ff6b6b',
                                padding: '12px', 
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                {error}
                            </div>
                        )}
                        
                        {!canSwitch ? (
                            <div>
                                <div style={{ 
                                    backgroundColor: '#2a2a2a', 
                                    padding: '16px', 
                                    borderRadius: '8px',
                                    color: '#b0b0b0',
                                    marginBottom: '16px'
                                }}>
                                    <p>No linked account found. Link your {user?.account_type === 'talent' ? 'Agency Talent' : 'Talent'} account to enable switching.</p>
                                </div>
                                
                                {!showLinkForm ? (
                                    <button 
                                        className="settings-button"
                                        onClick={() => setShowLinkForm(true)}
                                        style={{
                                            backgroundColor: '#007AFF',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '12px 24px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Link Account
                                    </button>
                                ) : (
                                    <form onSubmit={handleLinkAccount} style={{ marginTop: '16px' }}>
                                        <h3 style={{ color: '#e0e0e0', marginBottom: '16px' }}>
                                            Link your {user?.account_type === 'talent' ? 'Agency Talent' : 'Talent'} account
                                        </h3>
                                        
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ 
                                                display: 'block',
                                                marginBottom: '8px',
                                                color: '#b0b0b0',
                                                fontSize: '14px'
                                            }}>
                                                Username or Email
                                            </label>
                                            <input
                                                type="text"
                                                value={linkFormData.usernameOrEmail}
                                                onChange={(e) => setLinkFormData(prev => ({ ...prev, usernameOrEmail: e.target.value }))}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '1px solid #555',
                                                    borderRadius: '6px',
                                                    fontSize: '16px',
                                                    backgroundColor: '#2a2a2a',
                                                    color: '#e0e0e0',
                                                    boxSizing: 'border-box'
                                                }}
                                                placeholder="Enter username or email"
                                            />
                                        </div>
                                        
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ 
                                                display: 'block',
                                                marginBottom: '8px',
                                                color: '#b0b0b0',
                                                fontSize: '14px'
                                            }}>
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                value={linkFormData.password}
                                                onChange={(e) => setLinkFormData(prev => ({ ...prev, password: e.target.value }))}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '1px solid #555',
                                                    borderRadius: '6px',
                                                    fontSize: '16px',
                                                    backgroundColor: '#2a2a2a',
                                                    color: '#e0e0e0',
                                                    boxSizing: 'border-box'
                                                }}
                                                placeholder="Enter password"
                                            />
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                type="submit"
                                                disabled={linkLoading}
                                                style={{
                                                    backgroundColor: linkLoading ? '#666' : '#007AFF',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '12px 24px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: linkLoading ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {linkLoading ? 'Linking...' : 'Link Account'}
                                            </button>
                                            
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setShowLinkForm(false);
                                                    setLinkFormData({ usernameOrEmail: '', password: '' });
                                                    setError('');
                                                }}
                                                style={{
                                                    backgroundColor: '#666',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '12px 24px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div style={{ 
                                    backgroundColor: '#2a2a2a', 
                                    padding: '16px', 
                                    borderRadius: '8px',
                                    marginBottom: '16px'
                                }}>
                                    <p style={{ color: '#b0b0b0', marginBottom: '8px' }}>
                                        Switch to your <strong>{getAccountTypeDisplay(switchableType)}</strong> account
                                    </p>
                                    <p style={{ color: '#888', fontSize: '14px' }}>
                                        You can switch back anytime using this same feature.
                                    </p>
                                </div>
                                <button 
                                    className="settings-button"
                                    onClick={handleSwitch}
                                    disabled={loading}
                                    style={{
                                        backgroundColor: loading ? '#666' : '#007AFF',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '12px 24px',
                                        fontSize: '16px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {loading ? 'Switching...' : `Switch to ${getAccountTypeDisplay(switchableType)}`}
                                </button>
                            </div>
                        )}
                    </div>
                </SettingsLayout>
            <BottomNav onNavigate={onNavigate} />
        </div>
    );
}
