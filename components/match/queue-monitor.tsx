"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { lobbyQueueService } from "@/lib/services/lobby-queue-service"

/**
 * QueueMonitor — invisible component that runs the matchmaking polling loop
 * for authenticated users. Checks every 5s if enough players are in the same
 * fee-tier queue to form a match and auto-creates a tournament if so.
 */
export function QueueMonitor() {
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return

        let active = true

        const poll = async () => {
            if (!active) return
            try {
                const queueConfigs = [
                    { type: "unmaxed" as const, format: "snake_draft" as const, count: 4 },
                    { type: "maxed" as const, format: "snake_draft" as const, count: 4 },
                    { type: "unmaxed" as const, format: "auction_draft" as const, count: 4 },
                    { type: "maxed" as const, format: "auction_draft" as const, count: 4 },
                ]
                // TUG now uses 0 entry fee for all skill-based matchmaking nodes
                const entryFees = [0]

                for (const config of queueConfigs) {
                    for (const fee of entryFees) {
                        await lobbyQueueService.checkAndCreateMatch(config.type, config.format, config.count, fee)
                    }
                }
            } catch (err) {
                // Silently suppress — this runs in the background
                console.error("[QueueMonitor] Background poll error:", err)
            }
        }

        // Run immediately, then every 5 seconds
        poll()
        const interval = setInterval(poll, 5000)

        return () => {
            active = false
            clearInterval(interval)
        }
    }, [user])

    return null
}
