import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DraftRoomClient } from "./draft-room-client" // We'll create a client wrapper for the hook

export default async function DraftRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", id).single()

    if (!tournament) {
        return <div>Tournament not found</div>
    }

    if (tournament.status === "active" || tournament.status === "completed") {
        redirect(`/draft/score/${id}`)
    }

    const { data: { user } } = await supabase.auth.getUser()

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-8">
            <h1 className="text-3xl font-bold text-center">Draft Room</h1>
            <p className="text-center text-muted-foreground">{tournament.name}</p>
            <DraftRoomClient tournamentId={id} userId={user?.id} />
        </div>
    )
}
