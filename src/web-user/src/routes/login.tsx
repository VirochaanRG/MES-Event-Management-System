import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Which "screen" is shown inside the login card
type Screen = 'login' | 'forgot' | 'reset';

function LoginPageContent() {
  const [screen, setScreen] = useState<Screen>('login');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forgot-password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Reset-password fields
  const [resetEmail, setResetEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/login' });

  useEffect(() => {
    const authToken = (searchParams as any)?.auth;
    if (authToken && !user) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        if (payload.user?.email) handleAutoLogin(payload.user.email);
      } catch { /* ignore */ }
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (user) navigate({ to: '/' });
  }, [user, navigate]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleAutoLogin = async (userEmail: string) => {
    setIsLoading(true);
    clearMessages();
    try {
      const ok = await login(userEmail);
      if (ok) navigate({ to: '/' });
      else setError('Auto-login failed. Please log in manually.');
    } catch { setError('Auto-login failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setIsLoading(true);
    clearMessages();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Cookie is set — do a full reload so checkAuth() picks it up
        window.location.href = '/';
      } else {
        setError(data.error ?? 'Login failed. Please check your credentials.');
      }
    } catch { setError('An error occurred. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Please enter your email'); return; }
    setForgotLoading(true);
    clearMessages();
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      // Always show success to prevent email enumeration
      setSuccess('If an account exists for that email, a temporary password has been sent. Check your inbox.');
      setResetEmail(forgotEmail.trim());
      setForgotEmail('');
      // Move to reset screen after a short delay
      setTimeout(() => { clearMessages(); setScreen('reset'); }, 3000);
    } catch { setError('Failed to send reset email. Please try again.'); }
    finally { setForgotLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!resetEmail.trim() || !tempPassword || !newPassword || !confirmPassword) {
      setError('All fields are required'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match'); return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters'); return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), tempPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Password reset successfully! You can now log in.');
        setTempPassword(''); setNewPassword(''); setConfirmPassword('');
        setTimeout(() => { clearMessages(); setScreen('login'); }, 2500);
      } else {
        setError(data.error ?? 'Failed to reset password');
      }
    } catch { setError('Failed to reset password. Please try again.'); }
    finally { setResetLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 12px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '15px', boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#374151', marginBottom: '6px',
  };
  const btnPrimary = (disabled: boolean): React.CSSProperties => ({
    width: '100%', backgroundColor: disabled ? '#9ca3af' : '#7f1d1d',
    color: 'white', padding: '12px', borderRadius: '6px',
    border: 'none', fontSize: '15px', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });
  const linkBtn: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0,
    color: '#7f1d1d', fontSize: '13px', cursor: 'pointer',
    textDecoration: 'underline', fontWeight: 500,
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', backgroundColor: '#fef3c7', padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white', padding: '36px 40px',
        borderRadius: '14px', boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
        width: '100%', maxWidth: '420px',
        borderTop: '4px solid #7f1d1d',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7f1d1d', margin: 0, fontStyle: 'italic' }}>
            EvENGage
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {screen === 'login' && 'Sign in to your account'}
            {screen === 'forgot' && 'Reset your password'}
            {screen === 'reset' && 'Enter your new password'}
          </p>
        </div>

        {/* Error / success banners */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534',
            padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
            {success}
          </div>
        )}

        {/* ── LOGIN SCREEN ── */}
        {screen === 'login' && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" style={inputStyle} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button type="button" style={linkBtn}
                onClick={() => { clearMessages(); setForgotEmail(email); setScreen('forgot'); }}>
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={isLoading} style={btnPrimary(isLoading)}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD SCREEN ── */}
        {screen === 'forgot' && (
          <form onSubmit={handleForgot}>
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0, marginBottom: '16px' }}>
              Enter your account email and we'll send you a temporary password.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle} />
            </div>
            <button type="submit" disabled={forgotLoading} style={btnPrimary(forgotLoading)}>
              {forgotLoading ? 'Sending…' : 'Send Temporary Password'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button type="button" style={linkBtn} onClick={() => { clearMessages(); setScreen('login'); }}>
                ← Back to login
              </button>
            </div>
          </form>
        )}

        {/* ── RESET PASSWORD SCREEN ── */}
        {screen === 'reset' && (
          <form onSubmit={handleReset}>
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0, marginBottom: '16px' }}>
              Enter the temporary password from your email, then choose a new password.
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Temporary Password</label>
              <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)}
                placeholder="From your email" required style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '2px' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password" required style={inputStyle} />
            </div>
            <button type="submit" disabled={resetLoading} style={btnPrimary(resetLoading)}>
              {resetLoading ? 'Resetting…' : 'Set New Password'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button type="button" style={linkBtn} onClick={() => { clearMessages(); setScreen('forgot'); }}>
                ← Resend temporary password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPageContent,
});
