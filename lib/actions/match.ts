
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createMatch(formData: FormData) {
  const supabase = await createClient()

  const wagerAmount = parseFloat(formData.get("wagerAmount")?.toString() || "0")
  const teamSize = parseInt(formData.get("teamSize")?.toString() || "1")
  
  if (wagerAmount <= 0) {
    return { error: "Wager must be positive" }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
      // Fallback for custom auth if needed, but for now expect Supabase Auth
      // If the template uses custom auth (stored in session?), we might need to fetch it differently.
      // Based on lib/actions.ts, it returns a user object.
      // But standard Supabase RLS relies on auth.uid().
      return { error: "Not authenticated" }
  }

  // Check balance
  const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
  
  if (!profile || profile.balance < wagerAmount) {
      return { error: "Insufficient funds" }
  }

  // Deduct balance (Lock funds)
  const { error: txError } = await supabase.from("users").update({
      balance: profile.balance - wagerAmount
  }).eq("id", user.id)

  if (txError) return { error: "Transaction failed" }

  // Create Match
  const { data: match, error: matchError } = await supabase.from("matches").insert({
      creator_id: user.id,
      wager_amount: wagerAmount,
      team_size: teamSize,
      status: "open"
  }).select().single()

  if (matchError) {
      // Refund on failure
      await supabase.from("users").update({ balance: profile.balance }).eq("id", user.id)
      return { error: "Failed to create match" }
  }

  // Add Creator as Participant
  await supabase.from("match_participants").insert({
      match_id: match.id,
      user_id: user.id,
      team_id: 1, // Creator is always Team 1
      status: "joined"
  })

  revalidatePath("/lobby")
  redirect(`/match/${match.id}`)
}

export async function joinMatch(matchId: string, teamId: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    // Fetch match
    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single()
    if (!match || match.status !== "open") return { error: "Match unavailable" }

    // Check balance
    const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
    if (!profile || profile.balance < match.wager_amount) return { error: "Insufficient funds" }

    // Deduct
    const { error: txError } = await supabase.from("users").update({
        balance: profile.balance - match.wager_amount
    }).eq("id", user.id)
    if (txError) return { error: "Transaction failed" }

    // Join
    const { error: joinError } = await supabase.from("match_participants").insert({
        match_id: matchId,
        user_id: user.id,
        team_id: teamId,
        status: "joined"
    })

    if (joinError) {
        // Refund
         await supabase.from("users").update({ balance: profile.balance }).eq("id", user.id)
         return { error: "Failed to join" }
    }

    revalidatePath(`/match/${matchId}`)
    return { success: true }
}
