import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import "../styles/Auth.css";
import { FiArrowLeft } from "react-icons/fi";

export default function Auth({onNavigate}) {
  const [isLogin, setIsLogin] = useState(true);
  const [accountType, setAccountType] = useState('user'); // user, talent, agency, agency_talent
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState(''); // For agency_talent registration
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        // Login with username or email (same for all account types)
        // Use username field which accepts either username or email
        result = await login(username, password);
      } else {
        // Register based on account type
        if (password !== passwordConfirm) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (accountType === 'user') {
          result = await registerUser(username, email, password, passwordConfirm);
        } else if (accountType === 'talent') {
          result = await registerTalent(username, email, password, passwordConfirm);
        } else if (accountType === 'agency') {
          result = await registerAgency(username, email, password, passwordConfirm);
        } else if (accountType === 'agency_talent') {
          result = await registerAgencyTalent(username, email, password, passwordConfirm, inviteCode);
        }
      }

      if (!result.success) {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const registerTalent = async (username, email, password, passwordConfirm) => {
    try {
      const data = await authAPI.registerTalent(username, email, password, passwordConfirm);
      // Auto-login after registration
      const loginResult = await login(email, password);
      return loginResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const registerUser = async (username, email, password, passwordConfirm) => {
    try {
      await authAPI.registerUser(username, email, password, passwordConfirm);
      // Auto-login after registration
      const loginResult = await login(email, password);
      return loginResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const registerAgency = async (username, email, password, passwordConfirm) => {
    try {
      const data = await authAPI.registerAgency(username, email, password, passwordConfirm);
      // Auto-login after registration
      const loginResult = await login(email, password);
      return loginResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const registerAgencyTalent = async (username, email, password, passwordConfirm, inviteCode) => {
    try {
      // Don't send username for agency talent - it will be auto-generated
      const data = await authAPI.registerAgencyTalent(null, email, password, passwordConfirm, inviteCode);
      // Auto-login after registration
      const loginResult = await login(email, password);
      return loginResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };


  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setInviteCode('');
    setError('');
  };

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

          <button className="back-button" onClick={() => onNavigate()}>
              <FiArrowLeft size={20} />
          </button>

          {/* Welcome Header */}
          <h1
            style={{
              fontSize: '32px',
              textAlign: 'center',
              marginBottom: '10px',
              color: '#e0e0e0',
            }}
          >
            Welcome to <span style={{ color: '#007bff' }}>Portfolio!</span>
          </h1>

          {/* Login / Signup Header */}
          <h1 style={{ marginBottom: '30px', textAlign: 'center', fontSize: '28px', color: '#e0e0e0' }}>
            {isLogin ? 'Login' : 'Create Account'}
          </h1>

          {/* Account Type Selection (only for signup) */}
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#b0b0b0',
                }}
              >
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => {
                  setAccountType(e.target.value);
                  resetForm();
                }}
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
              >
                <option value="user">User</option>
                <option value="agency_talent">Agency Talent</option>
              </select>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: 'rgb(97, 44, 44)',
                color: 'rgb(247, 78, 78)',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username field - show for both login and signup */}
            {/* Username field (for login or non-agency-talent signup) */}
            {(isLogin || accountType !== 'agency_talent') && (
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
                  {isLogin ? 'Username or Email' : 'Username'}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
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
                  placeholder={isLogin ? 'Enter username or email' : 'Choose a username'}
                />
              </div>
            )}

            {/* Agency Talent Username Info */}
            {!isLogin && accountType === 'agency_talent' && (
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#b0b0b0' }}>
                  <strong>Username:</strong> Will be auto-generated (e.g., AgencyNameTalent1)
                </p>
              </div>
            )}



            {/* Email field (only for signup) */}
            {!isLogin && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#b0b0b0',
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  placeholder="Enter your email"
                />
              </div>
            )}

            {/* Password field */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#b0b0b0',
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                placeholder="Enter your password"
              />
            </div>

            {/* Confirm Password (only for signup) */}
            {!isLogin && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="passwordConfirm"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#b0b0b0',
                  }}
                >
                  Confirm Password
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
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
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {/* Agency Talent Invite Code (only for signup) */}
            {!isLogin && accountType === 'agency_talent' && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="inviteCode"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
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
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#8e8e8e' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '20px',
              }}
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>

          <div style={{ 
            display: 'flex', 
            textAlign: 'center', 
            fontSize: '14px', 
            color: '#b0b0b0',
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column'
          }}>
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    resetForm();
                    setAccountType('user');
                  }}
                  style={{
                    background: 'none',
                    width: 'fit-content',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsLogin(true);
                    resetForm();
                    setAccountType('user');
                  }}
                  style={{
                    background: 'none',
                    width: 'fit-content',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
