"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { GameQueue } from "@/components/match/game-queue"
import { getAllGames } from "@/lib/game-config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LobbyPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const games = getAllGames()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
        if (profile) setBalance(profile.balance)
      }
    }
    load()
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          TUG Wagering
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Balance</div>
              <div className="text-xl font-mono text-green-400">${balance.toFixed(2)}</div>
            </div>
          )}
          {!user && <Button onClick={() => router.push("/auth")}>Login</Button>}
        </div>
      </header>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All Games</TabsTrigger>
          {games.map((game) => (
            <TabsTrigger key={game.id} value={game.id}>
              <span className="mr-1">{game.icon}</span>
              <span className="hidden sm:inline">{game.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {games.map((game) => (
              <GameQueue key={game.id} game={game} />
            ))}
          </div>
        </TabsContent>

        {games.map((game) => (
          <TabsContent key={game.id} value={game.id}>
            <GameQueue game={game} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
