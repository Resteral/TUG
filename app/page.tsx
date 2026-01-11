
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CreateMatchForm } from "@/components/match/create-match-form"
import { MatchLobby } from "@/components/match/match-lobby"

export default function LobbyPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
        if (profile) setBalance(profile.balance)
      }
    }
    load()

    // Realtime balance listener? For now just load once.
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">TUG Wagering</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Balance</div>
            <div className="text-xl font-mono text-green-400">${balance.toFixed(2)}</div>
          </div>
          {!user && <Button onClick={() => router.push('/login')}>Login</Button>}
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <aside>
          <CreateMatchForm />
        </aside>

        <main className="space-y-4">
          <h2 className="text-xl font-semibold">Active Challenges</h2>
          <MatchLobby />
        </main>
      </div>
    </div>
  )
}
