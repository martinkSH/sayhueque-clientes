import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'CRM Agenda · Say Hueque',
  description: 'Agenda de clientes y ferias de Say Hueque',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-[#f7f5f1] text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
