import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navigation } from "@/components/navigation"
import { AuthProvider } from "@/lib/auth-context"

export const metadata: Metadata = {
  title: "TUG Arena",
  description: "Skill-Based Competitive Arena Platform",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <div className="min-h-screen flex flex-col bg-background">
              <Navigation />
              <main className="flex-1 pt-16">{children}</main>
              <footer className="border-t border-gray-800 py-8 bg-black/40">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">TUG Arena</span>
                    <span className="text-sm text-gray-500">© 2024 Strategic Gaming Platform. All rights reserved.</span>
                  </div>
                  <div className="flex gap-8 text-sm text-gray-400">
                    <a href="/guide" className="hover:text-white transition-colors">How It Works</a>
                    <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                    <a href="/rules" className="hover:text-white transition-colors">Competition Rules</a>
                    <a href="/rules" className="hover:text-white transition-colors">Anti-Cheat Policy</a>
                  </div>
                  <div className="text-xs text-gray-600 bg-gray-900/50 px-3 py-1 rounded-full border border-gray-800">
                    18+ ONLY | Skill-Based Competition
                  </div>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
