import type { Metadata } from 'next'
import { AuthProvider } from '../contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Team D User Portal',
  description: 'Team D User Portal for Large Event Services',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f9fafb' }}>
        <AuthProvider>
          <div style={{
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            minHeight: '100vh'
          }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}