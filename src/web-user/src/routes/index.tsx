import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect } from 'react';

function HomePage() {
  const { user, logout } = useAuth();
  const [isLocalAuth, setIsLocalAuth] = useState(false);

  useEffect(() => {
    // Check if user is authenticated via local auth (not main portal)
    const authSource = sessionStorage.getItem('teamd-auth-source');
    setIsLocalAuth(authSource === 'local');
  }, [user]);

  const services = [
    {
      title: 'Service Area 1',
      description: 'Team D service offerings and capabilities for large event support.',
      icon: '⚙️',
      features: ['Feature A', 'Feature B', 'Feature C', 'Feature D']
    },
    {
      title: 'Service Area 2',
      description: 'Additional team capabilities and service offerings.',
      icon: '🛠️',
      features: ['Feature E', 'Feature F', 'Feature G', 'Feature H']
    },
    {
      title: 'Support Services',
      description: 'Team D support and assistance for event operations.',
      icon: '🔧',
      features: ['Support Type 1', 'Support Type 2', 'Support Type 3', 'Support Type 4']
    },
    {
      title: 'Additional Services',
      description: 'Extended team capabilities and specialized services.',
      icon: '📋',
      features: ['Service 1', 'Service 2', 'Service 3', 'Service 4']
    }
  ];

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        {/* Header */}
        <header style={{
          backgroundColor: '#8b5cf6',
          color: 'white',
          padding: '20px 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                margin: 0
              }}>
                Team D - Event Services
              </h1>
              <p style={{
                fontSize: '0.9rem',
                margin: '4px 0 0 0',
                opacity: 0.9
              }}>
                Team D Large Event Support
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.9rem' }}>Welcome, {user?.email}</span>
              {isLocalAuth && (
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 20px'
        }}>
          {/* Welcome Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '60px'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '16px'
            }}>
              Welcome, {user?.email}
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: '#6b7280',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Team D services and capabilities for large event support.
              Access your team resources and manage event-related activities.
            </p>
          </div>

          {/* Services Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            marginBottom: '60px'
          }}>
            {services.map((service, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'white',
                  padding: '30px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  {service.icon}
                </div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  {service.title}
                </h3>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '20px',
                  lineHeight: '1.6',
                  textAlign: 'center'
                }}>
                  {service.description}
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  {service.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      style={{
                        backgroundColor: '#f3f4f6',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#374151',
                        textAlign: 'center'
                      }}
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '16px'
            }}>
              Need Team D Services?
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '30px',
              fontSize: '1.1rem'
            }}>
              Contact the team to discuss your event requirements and service needs.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <button style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Contact Team
              </button>
              <button style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                View Services
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: '#1f2937',
          color: '#9ca3af',
          padding: '30px 0',
          marginTop: '60px'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              © 2025 Team D Event Services. Large event support and coordination.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
