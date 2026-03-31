import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface QueueEntry {
  id: string
  user_id: string
  queue_type: "maxed" | "unmaxed"
  game_format: "snake_draft" | "auction_draft" | "linear_draft"
  player_count: number // 4, 6, 8, 12
  elo_rating: number
  joined_at: string
  status: "waiting" | "matched" | "cancelled"
}

export interface LobbyQueue {
  queue_type: "maxed" | "unmaxed"
  game_format: string
  player_count: number
  current_players: number
  required_players: number
  estimated_wait_time: number
  queued_users: Array<{
    user_id: string
    username: string
    elo_rating: number
    wait_time: number
  }>
}

export const lobbyQueueService = {
  async joinQueue(
    userId: string,
    queueType: "maxed" | "unmaxed",
    gameFormat: "snake_draft" | "auction_draft" | "linear_draft",
    playerCount: number,
    entryFee: number = 5.00, // Default to $5
  ): Promise<QueueEntry> {
    console.log("[v0] User joining queue:", { userId, queueType, gameFormat, playerCount, entryFee })

    // Fetch ELO for Skill-Based Matchmaking
    const { data: userData } = await supabase.from('users').select('elo_rating').eq('id', userId).single();
    const elo = userData?.elo_rating || 1000;

    const { data: result, error } = await supabase.from('lobby_queue').insert({
      user_id: userId,
      queue_type: queueType,
      game_format: gameFormat,
      player_count: playerCount,
      elo_rating: elo,
      entry_fee: 0,
      status: 'waiting'
    }).select().single();

    if (error) {
      console.error("Database Error:", error)
      throw new Error("Failed to join queue. Please try again.")
    }

    // Check if we can create a match immediately
    await this.checkAndCreateMatch(queueType, gameFormat, playerCount)

    return result.queue_entry as QueueEntry
  },

  async leaveQueue(userId: string, entryFee: number = 5.00): Promise<void> {
    console.log("[v0] User leaving queue:", userId)

    const { error } = await supabase.from('lobby_queue').update({ status: 'cancelled' }).eq('user_id', userId).eq('status', 'waiting');

    if (error) {
      console.error("Database Error:", error)
      throw new Error("Error leaving queue")
    }
  },

  async getQueueStatus(queueType: "maxed" | "unmaxed", gameFormat: string, playerCount: number): Promise<LobbyQueue> {
    const { data: queuedUsers, error } = await supabase
      .from("lobby_queue")
      .select(
        `
        *,
        users(username, elo_rating)
      `,
      )
      .eq("queue_type", queueType)
      .eq("game_format", gameFormat)
      .eq("player_count", playerCount)
      .eq("status", "waiting")
      .order("joined_at", { ascending: true })

    if (error) throw error

    const requiredPlayers = playerCount * 2 // Total players needed (e.g., 4v4 = 8 players)
    const currentPlayers = queuedUsers?.length || 0
    const playersNeeded = Math.max(0, requiredPlayers - currentPlayers)
    const estimatedWaitTime = playersNeeded * 30 // Estimate 30 seconds per missing player

    return {
      queue_type: queueType,
      game_format: gameFormat,
      player_count: playerCount,
      current_players: currentPlayers,
      required_players: requiredPlayers,
      estimated_wait_time: estimatedWaitTime,
      queued_users:
        queuedUsers?.map((entry: any) => {
          const waitTime = Math.floor((Date.now() - new Date(entry.joined_at).getTime()) / 1000)
          return {
            user_id: entry.user_id,
            username: entry.users?.username || "Unknown",
            elo_rating: entry.users?.elo_rating || 1000,
            wait_time: waitTime,
          }
        }) || [],
    }
  },

  async getAllQueues(): Promise<LobbyQueue[]> {
    const queueConfigs = [
      { type: "maxed" as const, format: "snake_draft", count: 4 },
      { type: "maxed" as const, format: "auction_draft", count: 4 },
      { type: "unmaxed" as const, format: "snake_draft", count: 4 },
      { type: "unmaxed" as const, format: "auction_draft", count: 4 },
    ]

    const queues = await Promise.all(
      queueConfigs.map((config) => this.getQueueStatus(config.type, config.format, config.count)),
    )

    return queues
  },

  async checkAndCreateMatch(
    queueType: "maxed" | "unmaxed",
    gameFormat: string,
    playerCount: number,
    entryFee: number = 0,
  ): Promise<string | null> {
    console.log("[v0] Checking if we can create match:", { queueType, gameFormat, playerCount })

    const { data: queuedUsers } = await supabase
      .from("lobby_queue")
      .select(
        `
        *,
        users(username, elo_rating)
      `,
      )
      .eq("queue_type", queueType)
      .eq("game_format", gameFormat)
      .eq("player_count", playerCount)
      .eq("entry_fee", entryFee)
      .eq("status", "waiting")
      .order("joined_at", { ascending: true })

    const requiredPlayers = playerCount * 2
    const currentPlayers = queuedUsers?.length || 0

    // For maxed queues, need exact player count
    // For unmaxed queues, can start with minimum players
    const canStart = currentPlayers >= requiredPlayers

    if (!canStart || !queuedUsers) {
      return null
    }


    // SBMM: sort players by ELO so closest players match first
    queuedUsers.sort((a: any, b: any) => Math.abs(a.users.elo_rating - b.users.elo_rating) ? 1 : -1)
    
    // Take the required number of players closest in skill level
    const playersForMatch = queuedUsers.slice(0, requiredPlayers)

    const netPrizePool = 0; // Removing gambling, purely skill-based

    // Create tournament
    const tournamentName = `${queueType === "maxed" ? "Ranked" : "Quick Play"} ${gameFormat.replace("_", " ")} - ${new Date().toLocaleTimeString()}`

    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        name: tournamentName,
        description: `Auto-created from ${queueType} queue`,
        game: "Strategic Arena", // Neutral branding for IP safety
        tournament_type: "draft",
        max_participants: requiredPlayers,
        prize_pool: netPrizePool,
        player_pool_settings: {
          num_teams: playerCount,
          max_teams: playerCount,
          draft_mode: gameFormat,
          players_per_team: 2,
          auction_budget: 1000,
          auto_start: true,
          auto_assign_captains: true, // Enable auto-captain selection
          captain_selection_mode: 'high_elo',
        },
        created_by: playersForMatch[0].user_id,
        status: "ready_check", // Set status to ready_check instead of drafting
      })
      .select()
      .single()

    if (tournamentError) {
      console.error("[v0] Error creating tournament from queue:", tournamentError)
      return null
    }

    // Add all players as participants
    const participantInserts = playersForMatch.map((player: any) => ({
      tournament_id: tournament.id,
      user_id: player.user_id,
      joined_at: new Date().toISOString(),
      status: "pending_ready",
    }))

    const { error: participantError } = await supabase.from("tournament_participants").insert(participantInserts)

    if (participantError) {
      console.error("[v0] Error adding participants:", participantError)
      return null
    }

    // Update queue entries to matched status
    const playerIds = playersForMatch.map((p: any) => p.user_id)
    await supabase.from("lobby_queue").update({ status: "matched" }).in("user_id", playerIds).eq("status", "waiting")

    console.log("[v0] Created tournament from queue:", tournament.id)
    return tournament.id
  },

  async startQueueMonitoring(): Promise<void> {
    console.log("[v0] Starting queue monitoring service")

    // Check every 5 seconds for matches to create
    setInterval(async () => {
      try {
        const queueConfigs = [
          { type: "maxed" as const, format: "snake_draft", count: 4 },
          { type: "maxed" as const, format: "auction_draft", count: 4 },
          { type: "unmaxed" as const, format: "snake_draft", count: 4 },
          { type: "unmaxed" as const, format: "auction_draft", count: 4 },
        ]
        for (const config of queueConfigs) {
          // Check for matchmaking with 0 fee instead of array of fees
          await this.checkAndCreateMatch(config.type, config.format, config.count, 0)
        }
      } catch (error) {
        console.error("[v0] Error in queue monitoring:", error)
      }
    }, 5000)
  },
}
