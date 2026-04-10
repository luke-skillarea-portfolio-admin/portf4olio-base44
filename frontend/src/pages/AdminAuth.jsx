import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import "../styles/Auth.css";
import { FiArrowLeft } from "react-icons/fi";

export default function AdminAuth({ onBack, onLoggedIn }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminLogin(usernameOrEmail, password);
      if (!result.success) {
        setError(result.error || 'Admin login failed');
      } else if (onLoggedIn) {
        onLoggedIn();
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
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

          <button className="back-button" onClick={() => onBack?.()}>
            <FiArrowLeft size={20} />
          </button>

          <h1
            style={{
              fontSize: '28px',
              textAlign: 'center',
              marginBottom: '10px',
              color: '#e0e0e0',
            }}
          >
            Admin Login
          </h1>
          <p style={{ color: '#b0b0b0', textAlign: 'center', marginBottom: '20px' }}>
            Only admin accounts can log in here.
          </p>

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
                Username or Email
              </label>
              <input
                id="username"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
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
                placeholder={'Enter admin username or email'}
              />
            </div>

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
                placeholder={'Enter admin password'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'inline-block',
                padding: '12px',
                backgroundColor: loading ? '#1e5fb8' : '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
