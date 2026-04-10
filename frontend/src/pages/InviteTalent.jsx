import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { settingsAPI } from '../services/api';
import { FiArrowLeft, FiCopy, FiRefreshCw } from "react-icons/fi";

export default function InviteTalent({ onBack }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // Load existing invite code if available
    if (user?.agency_invite_code) {
      setInviteCode(user.agency_invite_code);
    }
  }, [user]);

  const generateNewInviteCode = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await settingsAPI.generateInviteCode();
      setInviteCode(response.invite_code);
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
      let errorMessage = 'Failed to generate invite code. Please try again.';
      if (error.message && error.message.includes('JSON.parse')) {
        errorMessage = 'Server returned invalid response. Please check if you have an agency account and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite code:', err);
    }
  };

  if (!user || user.account_type !== 'agency') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          height: '100vh',
          width: '390px',
          maxWidth: '100%',
          borderRadius: '30px',
          display: 'flex',
          flexDirection: 'column',
          background: '#1f1f1f',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '40px 20px',
            backgroundColor: '#1f1f1f',
            color: '#e0e0e0'
          }}>
            <h2>Access Denied</h2>
            <p>Only agency accounts can manage talent invites.</p>
            <button onClick={onBack} style={{
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px'
            }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        height: '100vh',
        width: '390px',
        maxWidth: '100%',
        borderRadius: '30px',
        display: 'flex',
        flexDirection: 'column',
        background: '#1f1f1f',
        overflow: 'hidden',
      }}>
        <div style={{
          alignContent: 'center',
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 20px',
          backgroundColor: '#1f1f1f',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '400px',
        }}>
          <button
            onClick={onBack}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              color: '#007AFF',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <FiArrowLeft size={20} />
          </button>

          <h1 style={{ marginBottom: '10px', textAlign: 'center', fontSize: '28px', color: '#e0e0e0' }}>
            Invite Talent
          </h1>

          <p style={{
            textAlign: 'center',
            marginBottom: '30px',
            color: '#b0b0b0',
            fontSize: '16px',
            lineHeight: '1.4'
          }}>
            Generate invite codes for talent to join your agency as agency talent accounts.
          </p>

          {error && (
            <div style={{
              backgroundColor: 'rgb(97, 44, 44)',
              color: 'rgb(247, 78, 78)',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e0e0e0' }}>
              Agency Invite Code
            </h3>

            {inviteCode ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    color: '#007AFF',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    fontFamily: 'monospace',
                    lineHeight: '1.4',
                    flex: 1
                  }}>
                    {inviteCode}
                  </span>
                  <button
                    onClick={copyInviteCode}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copySuccess ? '#4CAF50' : '#007AFF',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={copySuccess ? 'Copied!' : 'Copy invite code'}
                  >
                    <FiCopy size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={generateNewInviteCode}
                    disabled={loading}
                    style={{
                      backgroundColor: loading ? '#666' : '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FiRefreshCw size={12} />
                    {loading ? 'Generating...' : 'Generate New Code'}
                  </button>
                </div>

                {copySuccess && (
                  <div style={{
                    color: '#4CAF50',
                    fontSize: '12px'
                  }}>
                    Invite code copied to clipboard!
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  onClick={generateNewInviteCode}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#666' : '#007AFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Generating...' : 'Generate Invite Code'}
                </button>
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: '#1f2937',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#888'
          }}>
            <p><strong style={{ color: '#e0e0e0' }}>How it works:</strong></p>
            <ul style={{ margin: '8px 0', paddingLeft: '16px', lineHeight: '1.5' }}>
              <li>Share this invite code with talent who want to join your agency</li>
              <li>They must already have a talent account to use the code</li>
              <li>The code can be used multiple times until you generate a new one</li>
              <li>Generating a new code invalidates the old one</li>
              <li>You'll be notified when someone joins using your code</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}