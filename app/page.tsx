"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { GameQueue } from "@/components/match/game-queue"
import { QueueRakeDisplay } from "@/components/match/queue-rake-display"
import { getAllGames } from "@/lib/game-config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, ExternalLink } from "lucide-react"

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
          TUG Arena
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Balance</div>
              <div className="text-xl font-mono text-green-400">${balance.toFixed(2)}</div>
            </div>
          )}
          {!user && <Button onClick={() => router.push("/auth/login")}>Login</Button>}
        </div>
      </header>

      <QueueRakeDisplay />

      <div className="my-8">
        <a
          href="https://discord.gg/TBV2XxmUkc"
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <Card className="border-primary/20 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#5865F2]/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#5865F2]/20 transition-all" />
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-6 text-center md:text-left">
                <div className="w-16 h-16 bg-[#5865F2] rounded-2xl flex items-center justify-center shadow-lg shadow-[#5865F2]/40">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Join the TUG Community</h2>
                  <p className="text-[#B9BBBE]">Connect with other players, find matches, and stay updated on Discord.</p>
                </div>
              </div>
              <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold gap-2 px-8 h-12 rounded-xl">
                Join Discord
                <ExternalLink className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </a>
      </div>

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
