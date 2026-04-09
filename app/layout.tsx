import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TETSUO CUT — Silence Removed. Precision Kept.',
  description:
    'Premium audio processing platform for video editors. Cut pauses and silences automatically.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0A] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
