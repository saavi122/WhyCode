import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      // OAuth provider returned an error — send back to login with message
      navigate(`/login?oauth_error=${error}`);
      return;
    }

    if (token) {
      // Call login() so AuthContext React state updates immediately
      // This makes ProtectedRoute see isAuthenticated = true before navigating
      login(token, null);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, login]);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#040404',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 99999
    }}>
      {/* Animated glow ring */}
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        border: '2px solid transparent',
        borderTopColor: '#00D9FF',
        borderRightColor: '#7C3AED',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '20px',
        boxShadow: '0 0 20px rgba(0,217,255,0.3)',
      }} />
      <h3 style={{
        fontSize: '15px',
        fontWeight: '700',
        margin: '0 0 8px 0',
        letterSpacing: '-0.02em',
        color: '#ffffff',
      }}>
        Signing you in…
      </h3>
      <p style={{ fontSize: '12px', color: '#52525b', margin: 0 }}>
        Establishing secure session
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
