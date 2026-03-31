"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, DollarSign, Medal, Crown, TrendingUp, Users, Target, Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { CSVStatsService, CSVPlayerStats } from "@/lib/services/csv-stats-service"

interface LeaderboardEntry {
  id: string
  username: string
  elo_rating: number
  total_earnings: number
  win_rate: number
  teammate_rating: number
  division: string
  rank: number
  goals?: number
  assists?: number
}

export function Leaderboards() {
  const [eloLeaders, setEloLeaders] = useState<LeaderboardEntry[]>([])
  const [earningsLeaders, setEarningsLeaders] = useState<LeaderboardEntry[]>([])
  const [winRateLeaders, setWinRateLeaders] = useState<LeaderboardEntry[]>([])
  const [teammateLeaders, setTeammateLeaders] = useState<LeaderboardEntry[]>([])
  const [archiveLeaders, setArchiveLeaders] = useState<CSVPlayerStats[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadLeaderboards()
  }, [])

  const loadLeaderboards = async () => {
    try {
      // 1. Load highest ELO players
      const { data: eloData } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .order("elo_rating", { ascending: false })
        .limit(20)

      if (eloData) {
        const eloLeaders = eloData.map((user, index) => ({
          id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          total_earnings: 0,
          win_rate: 0,
          teammate_rating: 0,
          division: getDivisionFromElo(user.elo_rating),
          rank: index + 1,
        }))
        setEloLeaders(eloLeaders)
      }

      // 2. Load CSV Statistics (Archive Pro Leaders)
      const csvData = await CSVStatsService.getPlayerCSVStats(supabase)
      setArchiveLeaders(csvData.sort((a,b) => (b.goals + b.assists) - (a.goals + a.assists)).slice(0, 20))

      // 3. Load highest earners
      const { data: earnersProfiles } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .limit(100)

      if (earnersProfiles) {
        const { data: payouts } = await supabase
          .from("transactions")
          .select("user_id, amount")
          .eq("type", "tournament_payout")
          .in("user_id", earnersProfiles.map(u => u.id))

        const earningsMap = new Map<string, number>()
        payouts?.forEach(p => {
          earningsMap.set(p.user_id, (earningsMap.get(p.user_id) || 0) + p.amount)
        })

        const earningsLeaders = earnersProfiles.map((user) => ({
          id: user.id,
          username: user.username,
          elo_rating: user.elo_rating,
          total_earnings: earningsMap.get(user.id) || 0,
          win_rate: 0,
          teammate_rating: 0,
          division: getDivisionFromElo(user.elo_rating),
          rank: 0,
        }))
        
        setEarningsLeaders(
          earningsLeaders
            .sort((a, b) => b.total_earnings - a.total_earnings)
            .slice(0, 20)
            .map((user, index) => ({ ...user, rank: index + 1 }))
        )
      }

      // 3. Load highest win rate
      const { data: winData } = await supabase
        .from("users")
        .select("id, username, elo_rating, wins, total_games")
        .limit(50)
      
      if (winData) {
        // Filter those with at least a few games so 1-0 isn't the #1 player
        const validPlayers = winData.filter(u => u.total_games >= 3)
        const sortedWinRate = (validPlayers.length > 0 ? validPlayers : winData)
          .map(user => ({
            id: user.id,
            username: user.username,
            elo_rating: user.elo_rating,
            total_earnings: 0,
            win_rate: user.total_games > 0 ? (user.wins / user.total_games) * 100 : 0,
            teammate_rating: 0,
            division: getDivisionFromElo(user.elo_rating),
            rank: 0
          }))
          .sort((a, b) => b.win_rate - a.win_rate)
          .slice(0, 20)
          .map((user, index) => ({ ...user, rank: index + 1 }))
        
        setWinRateLeaders(sortedWinRate)
      }

      // 4. Load "Best Teammate" (Synergy / Support stats approximation)
      const { data: teamData } = await supabase
        .from("users")
        .select("id, username, elo_rating, total_games")
        .limit(50)

      if (teamData) {
        // We synthesize a 1-100 teammate rating based on ELO and experience
        const sortedTeammates = teamData
          .map(user => {
            const synergyScore = Math.min(99.9, ((user.elo_rating / 1500) * 80) + (user.total_games > 10 ? 15 : user.total_games))
            return {
              id: user.id,
              username: user.username,
              elo_rating: user.elo_rating,
              total_earnings: 0,
              win_rate: 0,
              teammate_rating: Number(synergyScore.toFixed(1)),
              division: getDivisionFromElo(user.elo_rating),
              rank: 0
            }
          })
          .sort((a, b) => b.teammate_rating - a.teammate_rating)
          .slice(0, 20)
          .map((user, index) => ({ ...user, rank: index + 1 }))
        
        setTeammateLeaders(sortedTeammates)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading leaderboards:", error)
      setLoading(false)
    }
  }

  const getDivisionFromElo = (elo: number): string => {
    if (elo >= 1800) return "premier"
    if (elo >= 1600) return "championship"
    if (elo >= 1400) return "league_one"
    return "league_two"
  }

  const getDivisionColor = (division: string) => {
    switch (division) {
      case "premier": return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
      case "championship": return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      case "league_one": return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "league_two": return "bg-gradient-to-r from-green-500 to-teal-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  const getDivisionName = (division: string) => {
    switch (division) {
      case "premier": return "Premier"
      case "championship": return "Championship"
      case "league_one": return "League One"
      case "league_two": return "League Two"
      default: return "Unranked"
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Hall of Fame
        </h2>
        <p className="text-muted-foreground">Top performers, teammates, and earners across the platform.</p>
      </div>

      <Tabs defaultValue="elo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl">
          <TabsTrigger value="elo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Highest ELO</TabsTrigger>
          <TabsTrigger value="archives" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Arena Pro</TabsTrigger>
          <TabsTrigger value="winrate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Win Rate</TabsTrigger>
          <TabsTrigger value="teammate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Best Synergy</TabsTrigger>
          <TabsTrigger value="earnings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="elo" className="space-y-4 animate-in fade-in duration-300">
           <div className="grid gap-4">
                {eloLeaders.map((player) => (
                  <div key={player.id} className="group flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-primary/20 rounded-2xl transition-all duration-300">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center justify-center w-10">{getRankIcon(player.rank)}</div>
                        <Avatar className="size-12 border border-white/10 group-hover:scale-105 transition-transform">
                            <AvatarFallback className="bg-primary/10 text-primary font-black italic">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-white uppercase italic tracking-tighter text-lg">{player.username}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${getDivisionColor(player.division)} text-[8px] font-black uppercase py-0 px-2 rounded-md`}>{getDivisionName(player.division)}</Badge>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white italic leading-none">{player.elo_rating}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary italic mt-1">Combat Index</p>
                    </div>
                  </div>
                ))}
           </div>
        </TabsContent>

        <TabsContent value="archives" className="space-y-4 animate-in fade-in duration-300">
           <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-white uppercase italic tracking-tighter">
                        <Target className="size-5 text-primary" />
                        Arena Pro Archive Leaders
                    </CardTitle>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Global goal & assistance metrics from all valid StarCraft archives.</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {archiveLeaders.length === 0 ? (
                            <div className="p-20 text-center text-muted-foreground italic opacity-30 font-black uppercase text-xs tracking-widest">No archives ingested</div>
                        ) : (
                            archiveLeaders.map((stat, i) => (
                                <div key={i} className="flex items-center justify-between p-6 hover:bg-white/[0.03] transition-colors group">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center justify-center w-10 font-black text-muted-foreground italic text-lg">#{i+1}</div>
                                        <div>
                                            <h4 className="font-black text-white uppercase italic tracking-tighter text-base group-hover:text-primary transition-colors">{stat.username || stat.accountId}</h4>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{stat.gamesPlayed} Archive Instances Mapped</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-12">
                                        <div className="text-center">
                                            <div className="text-xl font-black text-white italic leading-none">{stat.goals}</div>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase italic tracking-widest">Total Goals</span>
                                        </div>
                                        <div className="text-center border-l border-white/5 pl-12">
                                            <div className="text-xl font-black text-white italic leading-none">{stat.assists}</div>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase italic tracking-widest">Assists</span>
                                        </div>
                                        <div className="text-center border-l border-white/5 pl-12">
                                            <div className="text-xl font-black text-primary italic leading-none">{(stat.goals + stat.assists + stat.saves)}</div>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase italic tracking-widest">Total Impact</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="winrate" className="space-y-4 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Highest Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {winRateLeaders.map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 sm:w-12">{getRankIcon(player.rank)}</div>
                    <Avatar>
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getDivisionColor(player.division)} text-[10px] sm:text-xs`}>{getDivisionName(player.division)}</Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{player.elo_rating} ELO</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-blue-500">{player.win_rate.toFixed(1)}%</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teammate" className="space-y-4 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Best Teammates (Synergy)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teammateLeaders.map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 sm:w-12">{getRankIcon(player.rank)}</div>
                    <Avatar>
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getDivisionColor(player.division)} text-[10px] sm:text-xs`}>{getDivisionName(player.division)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-purple-500">{player.teammate_rating}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Synergy Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Highest Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earningsLeaders.map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 sm:w-12">{getRankIcon(player.rank)}</div>
                    <Avatar>
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getDivisionColor(player.division)} text-[10px] sm:text-xs`}>{getDivisionName(player.division)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">${player.total_earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total Earnings</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
