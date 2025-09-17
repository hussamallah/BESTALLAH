import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PFF Quiz - Personality Assessment',
  description: 'Discover your personality patterns through this interactive assessment',
  keywords: ['personality', 'quiz', 'assessment', 'pff'],
  authors: [{ name: 'PFF Quiz Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}