"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { joinMatch, reportResult } from "@/lib/actions/match"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Gamepad2, Trophy, Users, Timer, ShieldCheck, ChevronLeft, TextQuote, BarChart2, Activity } from "lucide-react"
import { CSVStatsService, CSVPlayerStats } from "@/lib/services/csv-stats-service"

export function MatchRoom({ matchId }: { matchId: string }) {
    const [match, setMatch] = useState<any>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [csvCode, setCsvCode] = useState("")
    const [isImporting, setIsImporting] = useState(false)
    const [parsedStats, setParsedStats] = useState<CSVPlayerStats[]>([])
    
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            
            // Get profile for the user to have their account_id mapping
            if (user) {
                const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
                setCurrentUser(profile)
            }

            const { data: matchData } = await supabase.from("matches")
                .select("*, creator:users(username)")
                .eq("id", matchId)
                .single()

            setMatch(matchData)

            if (matchData) {
                const { data: parts } = await supabase.from("match_participants")
                    .select("*, profile:users(username, avatar_url, account_id, elo_rating)")
                    .eq("match_id", matchId)
                setParticipants(parts || [])
            }
        }
        load()

        const channel = supabase.channel(`match:${matchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
                setMatch(payload.new)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_participants', filter: `match_id=eq.${matchId}` }, async () => {
                const { data: parts } = await supabase.from("match_participants")
                    .select("*, profile:users(username, avatar_url, account_id, elo_rating)")
                    .eq("match_id", matchId)
                setParticipants(parts || [])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [matchId, supabase])

    const handleImportCSV = () => {
        if (!csvCode.trim()) return
        setIsImporting(true)
        
        try {
            const stats = CSVStatsService.parseCSVData(csvCode, matchId, match?.name || "Arena Match")
            setParsedStats(stats)
            toast.success(`Protocol Successful: ${stats.length} player identities mapped.`)
        } catch (err) {
            toast.error("Format Error: CSV Data unreadable.")
        } finally {
            setIsImporting(false)
        }
    }

    if (!match) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-primary font-black uppercase italic tracking-widest text-lg">Initializing Battle Ready Status...</div>
        </div>
    )

    const team1 = participants.filter(p => p.team_id === 1)
    const team2 = participants.filter(p => p.team_id === 2)
    const userParticipant = participants.find(p => p.user_id === currentUser?.id)

    const prizePool = match.prize_pool || (match.entry_fee * (match.team_size || 4) * 2 * 0.9).toFixed(2)

    const handleJoin = async (teamId: number) => {
        const res = await joinMatch(matchId, teamId)
        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(`Entry Confirmed: Team ${teamId}`)
        }
    }

    const handleReport = async (winnerTeam: number) => {
        if (!confirm(`Confirm Final Result: Team ${winnerTeam} Victory?`)) return
        
        // Final mapping validation: if CSV is present, ensure we include it in the report source
        const res = await reportResult(matchId, winnerTeam, csvCode)
        
        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(`Archive Finalized: Team ${winnerTeam} Wins. Record Syncing...`)
        }
    }

    // Helper to find stats for a participant based on their account_id mapping
    const getStatsForParticipant = (profile: any) => {
        if (!profile?.account_id) return null
        return parsedStats.find(s => s.accountId === profile.account_id)
    }

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-8 pb-32">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => router.push("/")} 
                        className="p-0 hover:bg-transparent text-muted-foreground hover:text-white transition-colors flex items-center gap-1 group"
                    >
                        <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                        Return to Lobby
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Gamepad2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic tracking-tighter">The Arena</h1>
                            <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Match Instance ID: {matchId.slice(0, 8)}...</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className={`px-4 py-1.5 rounded-full border-2 font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,255,255,0.05)] ${
                        match.status === 'open' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 
                        match.status === 'in_progress' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                        'border-purple-500/50 text-purple-400 bg-purple-500/10'
                    }`}>
                        {match.status.replace('_', ' ')}
                    </Badge>
                </div>
            </div>

            {/* Prize Pool Hero */}
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/40 p-8 shadow-2xl backdrop-blur-3xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy className="size-32 text-yellow-500" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic">Archive Prize Pool</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] tracking-tighter italic">${prizePool}</span>
                            <span className="text-xl font-bold text-muted-foreground uppercase italic tracking-widest">CR</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center min-w-[120px] backdrop-blur-xl">
                            <Users className="size-5 text-primary mb-1" />
                            <span className="text-xl font-black text-white italic">{participants.length}/{match.team_size * 2}</span>
                            <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Operators</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center min-w-[120px] backdrop-blur-xl">
                            <Timer className="size-5 text-primary mb-1" />
                            <span className="text-xl font-black text-white italic">${match.entry_fee}</span>
                            <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Entry Fee</span>
                        </div>
                    </div>
                </div>
                {/* Glow Effects */}
                <div className="absolute -bottom-20 -left-20 size-64 bg-primary/20 blur-[120px] opacity-50" />
                <div className="absolute -top-20 -right-20 size-64 bg-purple-500/20 blur-[120px] opacity-50" />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Team Alpha (1) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-blue-400 uppercase italic tracking-tighter flex items-center gap-2">
                                <ShieldCheck className="size-5" /> Team Alpha
                            </h2>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase font-black tracking-widest italic">{team1.length} / {match.team_size} DEPLOYED</span>
                    </div>
                    <Card className="border-white/5 bg-blue-500/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
                        <CardContent className="p-3 space-y-2">
                            {team1.map((p, idx) => {
                                const stats = getStatsForParticipant(p.profile);
                                return (
                                    <div key={p.user_id} className="group relative flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all duration-500 border border-transparent hover:border-blue-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="size-12 border border-white/10 group-hover:border-blue-500/50 transition-all duration-500 group-hover:scale-105">
                                                    <AvatarImage src={p.profile?.avatar_url} />
                                                    <AvatarFallback className="bg-blue-900/50 text-blue-200 font-bold">{p.profile?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center text-[10px] font-black text-white italic">{idx+1}</div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">{p.profile?.username}</span>
                                                    {p.user_id === currentUser?.id && <Badge className="bg-blue-500 hover:bg-blue-600 text-[10px] h-5 px-2 rounded-lg font-black italic tracking-widest">AGENT</Badge>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 opacity-50 font-bold uppercase tracking-widest text-[9px]">
                                                    <Badge variant="outline" className="text-blue-300 border-blue-500/20 px-1.5 h-4">{p.profile?.elo_rating} ELO</Badge>
                                                    {p.profile?.account_id && <span className="font-mono text-blue-200/50 lowercase">{p.profile.account_id.slice(-6)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Performance Preview from CSV Mapping */}
                                        {stats && (
                                            <div className="flex gap-4 text-right animate-in fade-in slide-in-from-right-2 duration-700">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Goals</span>
                                                    <span className="text-sm font-black text-white italic">{stats.goals}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Impact</span>
                                                    <span className="text-sm font-black text-blue-400 italic">{(stats.goals + stats.assists + stats.saves).toFixed(0)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {team1.length < match.team_size && !userParticipant && match.status === 'open' && (
                                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest italic rounded-2xl shadow-xl shadow-blue-500/20 mt-2" onClick={() => handleJoin(1)}>
                                    Deploy to Alpha
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Team Omega (2) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-rose-400 uppercase italic tracking-tighter flex items-center gap-2">
                            <ShieldCheck className="size-5" /> Team Omega
                        </h2>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase font-black tracking-widest italic">{team2.length} / {match.team_size} DEPLOYED</span>
                    </div>
                    <Card className="border-white/5 bg-rose-500/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
                        <CardContent className="p-3 space-y-2">
                            {team2.map((p, idx) => {
                                const stats = getStatsForParticipant(p.profile);
                                return (
                                    <div key={p.user_id} className="group relative flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all duration-500 border border-transparent hover:border-rose-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="size-12 border border-white/10 group-hover:border-rose-500/50 transition-all duration-500 group-hover:scale-105">
                                                    <AvatarImage src={p.profile?.avatar_url} />
                                                    <AvatarFallback className="bg-rose-900/50 text-rose-200 font-bold">{p.profile?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-rose-500 border-2 border-black flex items-center justify-center text-[10px] font-black text-white italic">{idx+1}</div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-white uppercase italic tracking-tighter group-hover:text-rose-400 transition-colors">{p.profile?.username}</span>
                                                    {p.user_id === currentUser?.id && <Badge className="bg-rose-500 hover:bg-rose-600 text-[10px] h-5 px-2 rounded-lg font-black italic tracking-widest">AGENT</Badge>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 opacity-50 font-bold uppercase tracking-widest text-[9px]">
                                                    <Badge variant="outline" className="text-rose-300 border-rose-500/20 px-1.5 h-4">{p.profile?.elo_rating} ELO</Badge>
                                                    {p.profile?.account_id && <span className="font-mono text-rose-200/50 lowercase">{p.profile.account_id.slice(-6)}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Performance Preview from CSV Mapping */}
                                        {stats && (
                                            <div className="flex gap-4 text-right animate-in fade-in slide-in-from-right-2 duration-700">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Goals</span>
                                                    <span className="text-sm font-black text-white italic">{stats.goals}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Impact</span>
                                                    <span className="text-sm font-black text-rose-400 italic">{(stats.goals + stats.assists + stats.saves).toFixed(0)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {team2.length < match.team_size && !userParticipant && match.status === 'open' && (
                                <Button className="w-full h-14 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest italic rounded-2xl shadow-xl shadow-rose-500/20 mt-2" onClick={() => handleJoin(2)}>
                                    Deploy to Omega
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Results Archive Mapping (The Dynamic Stat Mapping requested) */}
            {(match.status === 'completed' || userParticipant) && (
                <div className="space-y-4 slide-in-from-bottom-5 animate-in duration-700">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <BarChart2 className="size-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Game Archive Protocol (CSV Stats Mapping)</h3>
                        </div>
                        <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest border-primary/10 h-5">Identity Sync Engine v4.0</Badge>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden group">
                           <CardHeader className="pb-2">
                             <CardTitle className="text-base font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                                <TextQuote className="size-4 text-primary" />
                                Data Ingestion
                             </CardTitle>
                             <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                Paste the StarCraft mod archive data for automatic mapping.
                             </CardDescription>
                           </CardHeader>
                           <CardContent className="space-y-4">
                                <textarea
                                    className="w-full h-32 bg-black/60 border border-white/5 rounded-2xl p-4 text-[10px] font-mono text-primary/70 placeholder:text-muted-foreground/30 focus:border-primary/30 transition-all outline-none resize-none"
                                    placeholder="Paste SC2 Mod CSV Data here..."
                                    value={csvCode}
                                    onChange={(e) => setCsvCode(e.target.value)}
                                />
                                <Button 
                                    className="w-full h-12 bg-white/5 hover:bg-primary hover:text-primary-foreground border border-white/10 font-black uppercase italic tracking-widest rounded-xl transition-all"
                                    onClick={handleImportCSV}
                                    disabled={isImporting || !csvCode}
                                >
                                    {isImporting ? "Parsing Archives..." : "Execute Mapping Protocol"}
                                </Button>
                           </CardContent>
                        </Card>

                        <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden">
                           <CardHeader className="pb-2 border-b border-white/5">
                             <CardTitle className="text-base font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                                <Activity className="size-4 text-primary" />
                                Mapped Identities
                             </CardTitle>
                             <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                Stats synced from CSV to Arena Usernames.
                             </CardDescription>
                           </CardHeader>
                           <CardContent className="p-0 max-h-[220px] overflow-y-auto">
                                {parsedStats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-30 italic font-black uppercase text-[10px] tracking-widest">
                                        <BarChart2 className="size-10 mb-2" />
                                        No active mappings
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {parsedStats.map((stat, i) => {
                                            const matchedUser = participants.find(p => p.profile?.account_id === stat.accountId);
                                            return (
                                                <div key={i} className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.05] transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-mono text-muted-foreground">#{stat.accountId.slice(-4)}</span>
                                                        <span className={`font-black uppercase italic text-xs ${matchedUser ? 'text-primary' : 'text-white'}`}>
                                                            {matchedUser ? matchedUser.profile.username : stat.accountId}
                                                        </span>
                                                        {matchedUser && <Badge className="text-[8px] bg-primary/20 text-primary py-0 h-4 border-none font-black italic">MAPPED</Badge>}
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[8px] text-muted-foreground uppercase font-bold">Goals</span>
                                                            <span className="text-xs font-black text-white italic">{stat.goals}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[8px] text-muted-foreground uppercase font-bold">Assists</span>
                                                            <span className="text-xs font-black text-white italic">{stat.assists}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                           </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Operator Controls (Participants Only) */}
            {userParticipant && (match.status === 'open' || match.status === 'in_progress') && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-2 px-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">Final Result Protocol</h3>
                    </div>
                    <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-3xl overflow-hidden group">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <div className="space-y-2 text-center md:text-left">
                                    <p className="text-xl font-black text-white uppercase italic tracking-tighter">Combat Resolution</p>
                                    <p className="text-xs text-muted-foreground font-medium max-w-md">Verify the victorious team. Selection will finalize the archive and distribute the prize credits immediately.</p>
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <Button variant="outline" className="flex-1 md:flex-none border-blue-500/20 hover:bg-blue-500/20 text-blue-400 font-black uppercase italic tracking-widest rounded-2xl h-16 px-10 transition-all shadow-xl shadow-blue-500/5 group-hover:scale-105" onClick={() => handleReport(1)}>
                                        Alpha Wins
                                    </Button>
                                    <Button variant="outline" className="flex-1 md:flex-none border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-black uppercase italic tracking-widest rounded-2xl h-16 px-10 transition-all shadow-xl shadow-rose-500/5 group-hover:scale-105" onClick={() => handleReport(2)}>
                                        Omega Wins
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
