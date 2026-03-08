"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfileLinks(data: { steam_id: string, epic_games_id: string }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { error } = await supabase
        .from("users")
        .update({
            steam_id: data.steam_id,
            epic_games_id: data.epic_games_id,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

    if (error) {
        console.error("Failed to update profile links", error)
        return { error: "Failed to update profile links" }
    }

    revalidatePath("/")
    revalidatePath("/settings")
    return { success: true }
}
