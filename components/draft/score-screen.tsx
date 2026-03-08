"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { submitTournamentScore } from "@/lib/actions/tournament"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, CircleDashed, AlertCircle } from "lucide-react"

export function ScoreScreen({ tournamentId }: { tournamentId: string }) {
    const [team1Score, setTeam1Score] = useState("")
    const [team2Score, setTeam2Score] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [participants, setParticipants] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data: parts } = await supabase
                .from("tournament_participants")
                .select("*, profile:users(username)")
                .eq("tournament_id", tournamentId)

            setParticipants(parts || [])
        }
        load()

        const channel = supabase.channel(`score:${tournamentId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournament_participants',
                filter: `tournament_id=eq.${tournamentId}`
            }, async () => {
                const { data: parts } = await supabase
                    .from("tournament_participants")
                    .select("*, profile:users(username)")
                    .eq("tournament_id", tournamentId)
                setParticipants(parts || [])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [tournamentId])

    const submitScore = async () => {
        setSubmitting(true)
        try {
            const res = await submitTournamentScore(
                tournamentId,
                parseInt(team1Score),
                parseInt(team2Score)
            )

            if (res.error) {
                toast.error(res.error)
            } else if (res.consensus) {
                toast.success("Consensus reached! Match completed and prizes distributed.")
            } else {
                toast.success("Score submitted! Awaiting other players.")
            }
        } catch (e) {
            console.error(e)
            toast.error("Failed to submit score")
        } finally {
            setSubmitting(false)
        }
    }

    const allReported = participants.length > 0 && participants.every(p => p.reported_team1_score !== null)

    // Check if there is consensus among those who reported
    const distinctReports = new Set(participants
        .filter(p => p.reported_team1_score !== null)
        .map(p => `${p.reported_team1_score}-${p.reported_team2_score}`)
    )
    const hasConflict = distinctReports.size > 1

    return (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Submit Final Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Team 1 Score</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={team1Score}
                                onChange={e => setTeam1Score(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-lg py-6"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Team 2 Score</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={team2Score}
                                onChange={e => setTeam2Score(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-lg py-6"
                            />
                        </div>
                    </div>

                    {hasConflict && (
                        <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-md flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Scores do not match! Everyone must report the same result.</span>
                        </div>
                    )}

                    <Button
                        onClick={submitScore}
                        disabled={submitting || !team1Score || !team2Score}
                        className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all"
                    >
                        {submitting ? "Submitting..." : "Report Score"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Consensus Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {participants.map(p => {
                            const hasReported = p.reported_team1_score !== null
                            return (
                                <div key={p.user_id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className={hasReported ? "text-green-500" : "text-zinc-600"}>
                                            {hasReported ? <CheckCircle2 className="w-5 h-5" /> : <CircleDashed className="w-5 h-5 animate-pulse" />}
                                        </div>
                                        <span className="font-medium">
                                            {p.profile?.username || 'Anonymous'}
                                            {p.user_id === currentUser?.id && <span className="ml-2 text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">YOU</span>}
                                        </span>
                                    </div>
                                    {hasReported && (
                                        <span className="text-sm text-zinc-400">
                                            Reported: {p.reported_team1_score} - {p.reported_team2_score}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {!allReported && (
                        <div className="mt-6 text-center text-sm text-zinc-500">
                            Waiting for all players to report...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
