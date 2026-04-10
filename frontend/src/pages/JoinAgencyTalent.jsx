import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { FiArrowLeft } from "react-icons/fi";

export default function JoinAgencyTalent({ onBack }) {
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, checkAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await authAPI.registerAgencyTalentViaInvite(inviteCode, username);
      setSuccess('Agency talent account created successfully! You can now switch between your accounts.');
      setInviteCode('');
      
      // Refresh user data to update switching information
      await checkAuth();
      
      // Go back to main profile after a delay
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error) {
      setError(error.message || 'Failed to join agency talent account');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', color: '#e0e0e0' }}>
        <p>You must be logged in to join an agency talent account.</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  if (user.account_type !== 'talent') {
    return (
      <div style={{ padding: '20px', color: '#e0e0e0' }}>
        <h2>Join Agency Talent Account</h2>
        <p style={{ color: '#f59e0b', marginBottom: '20px' }}>
          You must have a talent account to join an agency talent account.
        </p>
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
    );
  }

  // Check if user already has an agency talent account
  if (user.can_switch_account) {
    return (
      <div style={{ padding: '20px', color: '#e0e0e0' }}>
        <h2>Join Agency Talent Account</h2>
        <p style={{ color: '#10b981', marginBottom: '20px' }}>
          You already have an agency talent account! You can switch between your accounts using the "Switch Account" feature.
        </p>
        <button onClick={onBack} style={{ 
          backgroundColor: '#007AFF', 
          color: 'white', 
          border: 'none', 
          padding: '10px 20px', 
          borderRadius: '6px' 
        }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
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
      }}
    >
      <div
        style={{
          height: '100vh',
          width: '390px',
          maxWidth: '100%',
          borderRadius: '30px',
          display: 'flex',
          flexDirection: 'column',
          background: '#1f1f1f',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            alignContent: 'center',
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 20px',
            backgroundColor: '#1f1f1f',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
          }}
        >
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
            Join Agency Talent Account
          </h1>

          <p style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            color: '#b0b0b0', 
            fontSize: '16px',
            lineHeight: '1.4'
          }}>
            Enter an agency invite code to create an agency talent account linked to your existing talent account.
          </p>

        <form onSubmit={handleSubmit}>
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

          {success && (
            <div style={{
              backgroundColor: 'rgb(34, 78, 54)',
              color: 'rgb(74, 222, 128)',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              {success}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#b0b0b0',
              }}
            >
              Username for Agency Talent Account
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading || success}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #555',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: '#2a2a2a',
                color: '#e0e0e0',
              }}
              placeholder="Choose a username (e.g., mila)"
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              This will be your public username for this agency talent account
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="inviteCode"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#b0b0b0',
              }}
            >
              Agency Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              disabled={loading || success}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #555',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: '#2a2a2a',
                color: '#e0e0e0',
              }}
              placeholder="Enter your agency invite code"
            />
          </div>

          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#1f2937', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#e0e0e0' }}>Current Account Info:</h3>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#b0b0b0' }}>
              <strong>Email:</strong> {user.email}
            </p>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#b0b0b0' }}>
              <strong>Username:</strong> {user.username}
            </p>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#b0b0b0' }}>
              <strong>Account Type:</strong> {user.account_type}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !inviteCode.trim() || !username.trim() || success}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: loading ? '#666' : '#007AFF',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating Agency Talent Account...' : 'Join Agency Talent'}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#1f2937', borderRadius: '6px', fontSize: '12px', color: '#888' }}>
          <p><strong>What happens when you join:</strong></p>
          <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
            <li>A new agency talent account will be created with your chosen username</li>
            <li>You can switch between your talent and agency talent accounts</li>
            <li>Both accounts will share the same login credentials</li>
            <li>The agency will be notified of your new account</li>
          </ul>
          </div>
        </div>
      </div>
    </div>
  );
}