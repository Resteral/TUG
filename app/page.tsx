
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { createMatch, joinMatch } from "@/lib/actions/match"

export default function LobbyPage() {
  const [matches, setMatches] = useState<any[]>([])
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

      const { data } = await supabase.from("matches")
        .select("*, creator:users(username)") // Assumes users has username
        .eq("status", "open")
        .order("created_at", { ascending: false })

      setMatches(data || [])
    }
    load()

    // Realtime subscription
    const channel = supabase.channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        // refresh
        load()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
          <Card>
            <CardHeader>
              <CardTitle>Create Match</CardTitle>
              <CardDescription>Start a new wager</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createMatch} className="space-y-4">
                <div className="space-y-2">
                  <Label>Wager Amount ($)</Label>
                  <Input name="wagerAmount" type="number" min="1" step="0.50" required placeholder="10.00" />
                </div>
                <div className="space-y-2">
                  <Label>Team Size</Label>
                  <Input name="teamSize" type="number" min="1" max="6" required defaultValue="1" />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Create Challenge</Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-4">
          <h2 className="text-xl font-semibold">Active Challenges</h2>
          {matches.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
              No active matches. Be the first to create one!
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.map(match => (
                <Card key={match.id} className="bg-gray-900/40 border-gray-800">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">${match.wager_amount}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-400 border border-blue-800">
                          {match.team_size}v{match.team_size}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Created by {match.creator?.username || 'Unknown'}
                      </div>
                    </div>
                    <form action={async () => {
                      // Use client wrapper for action to handle redirect or error
                      // ideally this calls server action directly
                      await joinMatch(match.id, 2)
                    }}>
                      <Button variant="outline" className="border-green-800 text-green-400 hover:bg-green-900/50 hover:text-green-300">
                        Accept Challenge
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
