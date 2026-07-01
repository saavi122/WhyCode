import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Save to localStorage as "token" exactly
      localStorage.setItem('token', token);
      // Redirect to /dashboard
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#020202',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 99999
    }}>
      <div style={{
        fontSize: '28px',
        marginBottom: '16px',
        animation: 'spin 1s linear infinite',
        display: 'inline-block'
      }}>
        ⚡
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Authenticating with GitHub</h3>
      <p style={{ fontSize: '12px', color: '#8e8e93', margin: 0 }}>Establishing secure session tunnel...</p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
