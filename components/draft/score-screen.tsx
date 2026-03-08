"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function ScoreScreen({ tournamentId }: { tournamentId: string }) {
    const [team1Score, setTeam1Score] = useState("")
    const [team2Score, setTeam2Score] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const supabase = createClient()

    const submitScore = async () => {
        setSubmitting(true)
        try {
            // Assume we create a table "score_reports" or just call an RPC for it
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error("Not logged in")
                return
            }

            // Simplified: we just hit a Server Action or RPC
            toast.success("Score submitted! Awaiting other players to submit the same score.")
        } catch (e) {
            console.error(e)
            toast.error("Failed to submit score")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-4 max-w-sm mx-auto p-4 border rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Submit Match Score</h2>
            <div className="flex flex-col gap-2">
                <label>Team 1 Score:</label>
                <Input type="number" value={team1Score} onChange={e => setTeam1Score(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 border-b pb-4">
                <label>Team 2 Score:</label>
                <Input type="number" value={team2Score} onChange={e => setTeam2Score(e.target.value)} />
            </div>
            <Button onClick={submitScore} disabled={submitting || !team1Score || !team2Score}>
                Submit Score
            </Button>
        </div>
    )
}
