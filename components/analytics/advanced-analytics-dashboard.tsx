"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { createClient } from "@/lib/supabase/client"
import { Trophy, TrendingUp, Target, Zap, Award, Flame, BarChart2, Shield, User, Globe, History, Archive } from "lucide-react"
import { CSVStatsService, CSVPlayerStats } from "@/lib/services/csv-stats-service"

interface PlayerStats {
  id: string
  username: string
  elo_rating: number
  matches_played: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_damage: number
  avg_accuracy: number
  wins: number
  losses: number
  win_percentage: number
  avg_performance_rating: number
  total_mvp_votes: number
}

interface PlayerStreak {
  user_id: string
  username: string
  streak_type: string
  current_streak: number
  best_streak: number
}

interface EloHistory {
  date: string
  elo: number
  username: string
}

export default function AdvancedAnalyticsDashboard() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [streaks, setStreaks] = useState<PlayerStreak[]>([])
  const [eloHistory, setEloHistory] = useState<EloHistory[]>([])
  const [csvStats, setCsvStats] = useState<CSVPlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAdvancedAnalytics()
  }, [])

  const loadAdvancedAnalytics = async () => {
    try {
      // 1. Load advanced player stats (Arena DB)
      const { data: stats } = await supabase
        .from("player_advanced_stats")
        .select("*")
        .order("elo_rating", { ascending: false })
        .limit(20)

      if (stats) setPlayerStats(stats)

      // 2. Load player streaks
      const { data: streakData } = await supabase
        .from("player_streaks")
        .select(`
          *,
          users!inner(username)
        `)
        .order("current_streak", { ascending: false })

      if (streakData) {
        const formattedStreaks = streakData.map((streak) => ({
          ...streak,
          username: streak.users.username,
        }))
        setStreaks(formattedStreaks)
      }

      // 3. Load CSV Statistics (Import Archives)
      const csvData = await CSVStatsService.getPlayerCSVStats(supabase)
      setCsvStats(csvData)

      // 4. Load ELO history
      const sampleEloHistory = [
        { date: "2024-01", elo: 1200, username: "DavidPameten" },
        { date: "2024-02", elo: 1250, username: "DavidPameten" },
        { date: "2024-03", elo: 1300, username: "DavidPameten" },
        { date: "2024-04", elo: 1380, username: "DavidPameten" },
        { date: "2024-05", elo: 1447, username: "DavidPameten" },
        { date: "2024-01", elo: 1100, username: "Cerv" },
        { date: "2024-02", elo: 1180, username: "Cerv" },
        { date: "2024-03", elo: 1250, username: "Cerv" },
        { date: "2024-04", elo: 1320, username: "Cerv" },
        { date: "2024-05", elo: 1371, username: "Cerv" },
      ]
      setEloHistory(sampleEloHistory)
    } catch (error) {
      console.error("Error loading advanced analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const topPerformers = playerStats.slice(0, 5)
  const winRateData = playerStats.map((p) => ({
    name: p.username,
    winRate: p.win_percentage || 0,
    matches: p.matches_played || 0,
  }))

  const performanceData = playerStats.slice(0, 8).map((p) => ({
    username: p.username,
    kills: p.avg_kills || 0,
    deaths: p.avg_deaths || 0,
    assists: p.avg_assists || 0,
    damage: (p.avg_damage || 0) / 100, // Scale for radar chart
    accuracy: p.avg_accuracy || 0,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-sm font-black uppercase italic tracking-widest text-primary animate-pulse">Decrypting Arena Archives...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BarChart2 className="h-6 w-6 text-primary" />
             </div>
             <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Archive Intel</h1>
          </div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest opacity-60">Strategic Performance Metrics & Combat History</p>
        </div>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-4 py-1 rounded-full font-black uppercase italic tracking-widest text-[10px]">Active Protocol: v4.2.0</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:grid-cols-6 h-auto p-1 bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Arena Intel</TabsTrigger>
          <TabsTrigger value="archives" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Historical</TabsTrigger>
          <TabsTrigger value="streaks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Streaks</TabsTrigger>
          <TabsTrigger value="elo-trends" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Trends</TabsTrigger>
          <TabsTrigger value="predictions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase italic text-[10px] tracking-widest py-3 rounded-xl">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden relative group transition-all hover:scale-105 hover:bg-black/60">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Trophy className="size-20" /></div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Elite Operator</CardDescription>
                        <CardTitle className="text-2xl font-black text-white italic truncate">{topPerformers[0]?.username || "N/A"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-black text-white italic">{topPerformers[0]?.elo_rating || 0}</span>
                             <span className="text-[10px] font-bold text-muted-foreground uppercase">Skill Rating</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden relative group transition-all hover:scale-105 hover:bg-black/60">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><TrendingUp className="size-20" /></div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 italic">Efficiency Index</CardDescription>
                        <CardTitle className="text-2xl font-black text-white italic">{Math.max(...playerStats.map((p) => p.win_percentage || 0)).toFixed(1)}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase">Global High Win Rate</p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden relative group transition-all hover:scale-105 hover:bg-black/60">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Award className="size-20" /></div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 italic">MVP Archive</CardDescription>
                        <CardTitle className="text-2xl font-black text-white italic">{Math.max(...playerStats.map((p) => p.total_mvp_votes || 0))} Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Top Combat Merit</p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden relative group transition-all hover:scale-105 hover:bg-black/60">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Target className="size-20" /></div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Combat Force</CardDescription>
                        <CardTitle className="text-2xl font-black text-white italic">{playerStats.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Field Agents</p>
                    </CardContent>
                </Card>
           </div>

           <div className="grid gap-8 md:grid-cols-2">
                <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                            <History className="size-5 text-primary" /> Efficiency Spread
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Global Win Distribution per Operator</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={winRateData.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" fontSize={10} fontStyle="italic" />
                                <YAxis fontSize={10} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="winRate" fill="#facc15" radius={[5, 5, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                            <Trophy className="size-5 text-primary" /> Elite Command
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Top Ranking Agents in Active Theater</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {topPerformers.map((player, index) => (
                            <div key={player.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all border border-transparent hover:border-primary/20">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-[10px] font-black italic text-primary group-hover:scale-110 transition-transform">#{index+1}</div>
                                    <div>
                                        <h4 className="font-black text-white uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">{player.username}</h4>
                                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">{player.matches_played} Archive Logs</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-white italic leading-none">{player.elo_rating}</div>
                                    <span className="text-[8px] font-black text-primary uppercase italic tracking-widest">Skill Index</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
           </div>
        </TabsContent>

        <TabsContent value="performance" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <RadarChart data={performanceData}>
                        <PolarGrid stroke="#ffffff10" />
                        <PolarAngleAxis dataKey="username" tick={{ fill: '#888', fontSize: 10, fontStyle: 'italic', fontWeight: '900' }} />
                        <PolarRadiusAxis stroke="#ffffff10" tick={false} />
                        <Radar name="Combat Kills" dataKey="kills" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                        <Radar name="Support Assists" dataKey="assists" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        <Radar name="Field Impact" dataKey="damage" stroke="#facc15" fill="#facc15" fillOpacity={0.2} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: '900' }} />
                    </RadarChart>
                </ResponsiveContainer>
             </Card>
        </TabsContent>

        <TabsContent value="archives" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-2 border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                                <Archive className="size-5 text-primary" /> SC2 Mod History Mappings
                            </CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Aggregated statistics from all valid CSV archive imports.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                            {csvStats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/20 italic font-black uppercase text-xs tracking-widest">
                                    No archive data ingested
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {csvStats.sort((a,b) => b.goals - a.goals).map((stat, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 hover:bg-white/[0.03] transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-xl bg-black border border-white/5 flex items-center justify-center text-xs font-mono text-muted-foreground group-hover:border-primary/30 transition-colors">#{stat.accountId.slice(-4)}</div>
                                                <div>
                                                    <h4 className="font-black text-white uppercase italic tracking-tighter text-base group-hover:text-primary transition-colors">{stat.username || stat.accountId}</h4>
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{stat.gamesPlayed} Archives Mapped</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-8">
                                                <div className="text-center">
                                                    <div className="text-lg font-black text-white italic leading-none">{stat.goals}</div>
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase italic tracking-widest">Goals</span>
                                                </div>
                                                <div className="text-center border-l border-white/5 pl-8">
                                                    <div className="text-lg font-black text-white italic leading-none">{stat.assists}</div>
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase italic tracking-widest">Assists</span>
                                                </div>
                                                <div className="text-center border-l border-white/5 pl-8">
                                                    <div className="text-lg font-black text-primary italic leading-none">{stat.savePercentage.toFixed(1)}%</div>
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase italic tracking-widest">Save Eff.</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden h-fit">
                        <CardHeader>
                           <CardTitle className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                                <Shield className="size-5 text-primary" /> Key Mappings
                           </CardTitle>
                           <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Current identity links between SC2 IDs and Arena Profiles.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                                <p className="text-[10px] font-black text-primary uppercase italic tracking-widest">Active Mapping Engine</p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">The system automatically cross-references ingested CSV payloads with the <span className="text-white">account_id</span> link in user profiles.</p>
                             </div>
                             <div className="space-y-2">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">System Status</span>
                                <div className="flex items-center justify-between text-[10px] font-black italic text-white uppercase">
                                    <span>Auth Sync</span>
                                    <span className="text-green-500">Online</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-black italic text-white uppercase">
                                    <span>Parser v4</span>
                                    <span className="text-green-500">Active</span>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>
             </div>
        </TabsContent>

        <TabsContent value="streaks" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid gap-6 md:grid-cols-3">
            {["win", "mvp", "loss"].map((streakType) => (
              <Card key={streakType} className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                    <Flame className={`h-5 w-5 ${streakType === 'loss' ? 'text-gray-500' : 'text-orange-500'}`} />
                    {streakType} Streaks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {streaks
                      .filter((s) => s.streak_type === streakType)
                      .slice(0, 5)
                      .map((streak, index) => (
                        <div key={`${streak.user_id}-${streak.streak_type}`} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black italic text-muted-foreground">#{index + 1}</span>
                                <span className="font-black text-white uppercase italic text-xs truncate max-w-[100px]">{streak.username}</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-xl font-black text-orange-500 italic leading-none">{streak.current_streak}</div>
                                    <span className="text-[8px] font-black text-muted-foreground uppercase italic tracking-widest">Active</span>
                                </div>
                            </div>
                        </div>
                      ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ... Elo Trends & Predictions similarly updated with the new theme */}
        <TabsContent value="elo-trends" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden p-8">
                 <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={eloHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                    <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10, fontStyle: 'italic', fontWeight: '900' }} />
                    <YAxis tick={{ fill: '#888', fontSize: 10, fontStyle: 'italic', fontWeight: '900' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="elo" stroke="#facc15" strokeWidth={4} dot={{ r: 6, fill: '#facc15' }} activeDot={{ r: 8 }} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: '900' }} />
                  </LineChart>
                </ResponsiveContainer>
            </Card>
        </TabsContent>

        <TabsContent value="predictions" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden p-12 text-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                 <Zap className="size-20 text-primary mx-auto mb-6 animate-pulse" />
                 <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Neural Forecast Engine</h2>
                 <p className="max-w-xl mx-auto text-muted-foreground font-medium text-sm mb-8 italic">Analyzing combat archives for predictive modeling. Current sample size insufficient for localized forecasting.</p>
                 <Badge variant="outline" className="border-primary/30 text-primary font-black uppercase italic tracking-widest px-6 py-2 rounded-full">Status: Awaiting Data Aggregation</Badge>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
