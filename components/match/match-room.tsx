
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { joinMatch, reportResult } from "@/lib/actions/match"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function MatchRoom({ matchId }: { matchId: string }) {
    const [match, setMatch] = useState<any>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data: matchData } = await supabase.from("matches")
                .select("*, creator:users(username)")
                .eq("id", matchId)
                .single()

            setMatch(matchData)

            if (matchData) {
                const { data: parts } = await supabase.from("match_participants")
                    .select("*, profile:users(username)")
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
                // Reload participants
                const { data: parts } = await supabase.from("match_participants")
                    .select("*, profile:users(username)")
                    .eq("match_id", matchId)
                setParticipants(parts || [])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [matchId])

    if (!match) return <div>Loading...</div>

    const team1 = participants.filter(p => p.team_id === 1)
    const team2 = participants.filter(p => p.team_id === 2)
    const userParticipant = participants.find(p => p.user_id === currentUser?.id)

    const isFull = participants.length >= (match.team_size * 2)

    // Handlers
    const handleJoin = async (teamId: number) => {
        const res = await joinMatch(matchId, teamId)
        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(`Joined Team ${teamId}!`)
        }
    }

    const handleReport = async (winnerTeam: number) => {
        if (!confirm(`Are you sure Team ${winnerTeam} won?`)) return
        const res = await reportResult(matchId, winnerTeam)
        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(`Reported Team ${winnerTeam} as winner.`)
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-8">
            <header>
                <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">← Back to Lobby</Button>
                <h1 className="text-3xl font-bold">Match Room</h1>
                <div className="text-gray-400">ID: {matchId}</div>
                <div className={`text-xl font-bold ${match.status === 'open' ? 'text-green-400' : 'text-yellow-400'}`}>
                    Status: {match.status.toUpperCase()}
                </div>
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                    <div>
                        <span className="block text-sm text-gray-400 uppercase tracking-wider font-semibold">Total Prize Pool</span>
                        <span className="text-3xl font-black text-white">${match.prize_pool || (match.wager_amount * match.team_size * 2 * 0.9).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm text-gray-400 uppercase tracking-wider font-semibold">Tournament Format</span>
                        <span className="text-lg font-bold text-primary">Skill-Based Arena</span>
                    </div>
                </div>
                {match.status === 'completed' && (
                    <div className="text-2xl text-purple-400 mt-2">
                        Winner: Team {match.winner_team_id}
                    </div>
                )}
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Team 1 */}
                <Card className="border-blue-800 bg-blue-950/20">
                    <CardHeader>
                        <CardTitle className="text-blue-400">Team 1</CardTitle>
                        <CardDescription>Size: {team1.length} / {match.team_size}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {team1.map(p => (
                            <div key={p.user_id} className="p-2 bg-blue-900/40 rounded flex items-center justify-between">
                                <span>{p.profile?.username || 'User'}</span>
                                {p.user_id === currentUser?.id && <span className="text-xs bg-blue-600 px-2 rounded">YOU</span>}
                            </div>
                        ))}
                        {match.status === 'open' && team1.length < match.team_size && !userParticipant && (
                            <Button className="w-full bg-blue-700 hover:bg-blue-600" onClick={() => handleJoin(1)}>
                                Join Team 1 (${match.wager_amount} Entry Fee)
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Team 2 */}
                <Card className="border-red-800 bg-red-950/20">
                    <CardHeader>
                        <CardTitle className="text-red-400">Team 2</CardTitle>
                        <CardDescription>Size: {team2.length} / {match.team_size}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {team2.map(p => (
                            <div key={p.user_id} className="p-2 bg-red-900/40 rounded flex items-center justify-between">
                                <span>{p.profile?.username || 'User'}</span>
                                {p.user_id === currentUser?.id && <span className="text-xs bg-red-600 px-2 rounded">YOU</span>}
                            </div>
                        ))}
                        {match.status === 'open' && team2.length < match.team_size && !userParticipant && (
                            <Button className="w-full bg-red-700 hover:bg-red-600" onClick={() => handleJoin(2)}>
                                Join Team 2 (${match.wager_amount} Entry Fee)
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Action Area */}
            {userParticipant && match.status !== 'completed' && (
                <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => handleReport(1)}>Report Team 1 Won</Button>
                            <Button variant="outline" onClick={() => handleReport(2)}>Report Team 2 Won</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
