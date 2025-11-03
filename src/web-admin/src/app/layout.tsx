import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team D Web Admin',
  description: 'Team D Administrative Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          fontFamily: 'Arial, sans-serif',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px'
        }}>
          {children}
        </div>
      </body>
    </html>
  )
}