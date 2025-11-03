import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getCurrentUser, AuthUser } from '../lib/auth';
import ProtectedTeamPortal from '../components/ProtectedTeamPortal';

function TeamDDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const authUser = getCurrentUser();
    setUser(authUser);
  }, []);

  return (
    <main>
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          color: '#333',
          marginBottom: '20px'
        }}>
          Hi {user?.email}
        </h1>
        <h2 style={{
          fontSize: '2rem',
          color: '#555',
          marginBottom: '20px'
        }}>
          Team D Web Admin
        </h2>
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '30px'
        }}>
          Welcome to the Team D Administrative Dashboard
        </p>
        <div style={{
          backgroundColor: '#e7f3ff',
          padding: '20px',
          borderRadius: '4px',
          border: '1px solid #b3d9ff'
        }}>
          <p style={{ margin: 0, color: '#0066cc' }}>
            This app is running on port 3024 and ready for development!
          </p>
          <p style={{ margin: '10px 0 0 0', color: '#0066cc' }}>
            Session authenticated for: <strong>{user?.email}</strong>
          </p>
        </div>

        {/* Team D specific content */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ color: '#495057', marginBottom: '15px' }}>
            Team D Management Tools
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '20px'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>Events</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>
                Manage Team D events and activities
              </p>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>Users</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>
                Team member management and permissions
              </p>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>Reports</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>
                Analytics and performance metrics
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Home() {
  return (
    <ProtectedTeamPortal>
      <TeamDDashboard />
    </ProtectedTeamPortal>
  );
}

export const Route = createFileRoute('/')({
  component: Home,
});
