import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ringr — Never Miss Another Call',
  description: 'AI-powered phone answering for service businesses. Answer every call 24/7, book appointments, and qualify leads automatically.',
  keywords: ['AI phone answering', 'virtual receptionist', 'home services', 'HVAC', 'plumbing', 'appointment booking'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
