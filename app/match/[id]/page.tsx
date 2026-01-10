
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function MatchRoomPage() {
    const { id } = useParams()
    const [match, setMatch] = useState<any>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            // Fetch Match
            const { data: matchData } = await supabase.from("matches").select("*").eq("id", id).single()
            setMatch(matchData)

            // Fetch Participants
            const { data: parts } = await supabase.from("match_participants")
                .select("*, users(username)")
                .eq("match_id", id)
            setParticipants(parts || [])
        }
        load()

        const channel = supabase.channel(`match-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', filter: `match_id=eq.${id}`, table: 'match_participants' }, () => {
                // reload parts
                load()
            })
            .on('postgres_changes', { event: '*', schema: 'public', filter: `id=eq.${id}`, table: 'matches' }, () => {
                load()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [id])

    if (!match) return <div className="p-8 text-center">Loading match room...</div>

    const team1 = participants.filter(p => p.team_id === 1)
    const team2 = participants.filter(p => p.team_id === 2)
    const isParticipant = participants.some(p => p.user_id === currentUser?.id)

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <header className="mb-8 border-b border-gray-800 pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Match #{match.id.slice(0, 8)}</h1>
                        <Badge variant={match.status === 'open' ? 'secondary' : 'default'} className="mt-2">
                            {match.status.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Wager</div>
                        <div className="text-2xl font-bold text-green-400">${match.wager_amount}</div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Team 1 */}
                <Card className="bg-blue-950/20 border-blue-900">
                    <CardHeader>
                        <CardTitle className="text-blue-400">Team 1</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {team1.map(p => (
                            <div key={p.user_id} className="p-3 bg-blue-900/10 mb-2 rounded border border-blue-900/50 flex justify-between">
                                <span>{p.users?.username || 'Unknown'}</span>
                                <Badge variant="outline">{p.status}</Badge>
                            </div>
                        ))}
                        {Array.from({ length: match.team_size - team1.length }).map((_, i) => (
                            <div key={i} className="p-3 border-dashed border border-gray-700 rounded text-gray-600 text-center">
                                Empty Slot
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Team 2 */}
                <Card className="bg-red-950/20 border-red-900">
                    <CardHeader>
                        <CardTitle className="text-red-400">Team 2</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {team2.map(p => (
                            <div key={p.user_id} className="p-3 bg-red-900/10 mb-2 rounded border border-red-900/50 flex justify-between">
                                <span>{p.users?.username || 'Unknown'}</span>
                                <Badge variant="outline">{p.status}</Badge>
                            </div>
                        ))}
                        {Array.from({ length: match.team_size - team2.length }).map((_, i) => (
                            <div key={i} className="p-3 border-dashed border border-gray-700 rounded text-gray-600 text-center">
                                Empty Slot
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
                {match.status === 'open' && (
                    <Button className="w-full max-w-sm" disabled={!isParticipant}>
                        {isParticipant ? "Waiting for Opponent..." : "Spectating"}
                    </Button>
                )}

                {match.status === 'in_progress' && isParticipant && (
                    <div className="flex gap-4 w-full justify-center">
                        <Button className="bg-green-600 hover:bg-green-700">Report Win</Button>
                        <Button variant="destructive">Report Loss</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
