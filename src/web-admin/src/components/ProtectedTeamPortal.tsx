import { useEffect, useState } from 'react';
import { getCurrentUser, clearStoredAuth, checkMainPortalAuth, AuthUser } from '../lib/auth';
import LocalLoginForm from './LocalLoginForm';

interface ProtectedTeamPortalProps {
  children: React.ReactNode;
}

function UnauthorizedAccess({ onLocalLogin }: { onLocalLogin: (user: AuthUser, token: string) => void }) {
  const [showLocalLogin, setShowLocalLogin] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      textAlign: 'center',
      gap: '20px'
    }}>
      {/* Local Login Form */}
      {showLocalLogin ? (
        <LocalLoginForm onLoginSuccess={onLocalLogin} />
      ) : (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            color: '#856404',
            marginBottom: '20px',
            fontSize: '1.8rem'
          }}>
            🔒 Authentication Required
          </h1>
          <p style={{
            color: '#856404',
            marginBottom: '20px',
            fontSize: '1.1rem',
            lineHeight: '1.5'
          }}>
            Choose your authentication method:
          </p>

          {/* Local Development Option */}
          <div style={{
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            padding: '20px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              color: '#0c5460',
              margin: '0 0 10px 0',
              fontSize: '1.1rem'
            }}>
              🚀 Local Development
            </h3>
            <p style={{
              color: '#0c5460',
              margin: '0 0 15px 0',
              fontSize: '0.9rem'
            }}>
              Quick login for TeamD local development (no main portal required)
            </p>
            <button
              onClick={() => setShowLocalLogin(true)}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Use Local Login
            </button>
          </div>

          {/* Main Portal Option */}
          <div style={{
            backgroundColor: '#e9ecef',
            padding: '20px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              color: '#495057',
              margin: '0 0 10px 0',
              fontSize: '1.1rem'
            }}>
              🌐 Main Portal
            </h3>
            <p style={{
              margin: '0 0 15px 0',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              Log in through the main admin portal for full access:
            </p>
            <a
              href="http://localhost:4001"
              style={{
                display: 'inline-block',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Go to Main Portal
            </a>
            <p style={{
              margin: '10px 0 0 0',
              color: '#6c757d',
              fontSize: '0.8rem'
            }}>
              After logging in, use the "Team D Portal" button.
            </p>
          </div>

        </div>
      )}

      {/* Back Button for Local Login */}
      {showLocalLogin && (
        <button
          onClick={() => setShowLocalLogin(false)}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Auth Options
        </button>
      )}
    </div>
  );
}

export default function ProtectedTeamPortal({ children }: ProtectedTeamPortalProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking auth...'); // Debug log

      // First check local auth
      const currentUser = getCurrentUser();
      console.log('Current user:', currentUser); // Debug log

      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
        return;
      }

      // If no local auth, check main portal
      console.log('No local auth, checking main portal...');
      const mainPortalUser = await checkMainPortalAuth();

      if (mainPortalUser) {
        setUser(mainPortalUser);
      }

      setLoading(false);
    };

    // Check immediately
    checkAuth();

    // Listen for storage changes (if user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'teamd-auth-user' && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  const handleLocalLogin = (authUser: AuthUser, token: string) => {
    console.log('Local login successful:', authUser);
    setUser(authUser);
  };

  if (!user) {
    return <UnauthorizedAccess onLocalLogin={handleLocalLogin} />;
  }

  return (
    <div>
      {/* Auth info header */}
      <div style={{
        backgroundColor: '#d4edda',
        borderBottom: '1px solid #c3e6cb',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#155724', fontSize: '0.9rem' }}>
            ✅ Authenticated as: <strong>{user.email}</strong>
          </span>
          <span style={{
            color: '#0c5460',
            fontSize: '0.8rem',
            backgroundColor: '#d1ecf1',
            padding: '2px 8px',
            borderRadius: '3px',
            border: '1px solid #bee5eb'
          }}>
            {sessionStorage.getItem('teamd-auth-source') === 'local' ? '🚀 Local Dev' : '🌐 Main Portal'}
          </span>
        </div>
        {sessionStorage.getItem('teamd-auth-source') === 'local' && (
          <button
            onClick={() => {
              clearStoredAuth();
              window.location.reload();
            }}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        )}
      </div>
      {children}
    </div>
  );
}