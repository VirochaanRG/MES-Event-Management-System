import { useState } from 'react';
import { AuthUser } from '../lib/auth';

interface LocalLoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export default function LocalLoginForm({ onLoginSuccess }: LocalLoginFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.token) {
          // Store auth info
          sessionStorage.setItem('teamd-auth-user', JSON.stringify(data.user));
          sessionStorage.setItem('teamd-auth-token', data.token);
          sessionStorage.setItem('teamd-auth-source', 'local');

          onLoginSuccess(data.user, data.token);
        } else {
          setError('Invalid response from server');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          🚀 Local Development Login
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '0.9rem'
        }}>
          Quick login for TeamD development
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: isLoading ? '#9ca3af' : '#17a2b8',
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#0c4a6e'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Valid test accounts:</p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>user@teamd.local</li>
          <li>test@teamd.dev</li>
          <li>demo@teamd.local</li>
        </ul>
      </div>
    </div>
  );
}