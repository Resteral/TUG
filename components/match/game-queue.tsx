"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { joinMatch } from "@/lib/actions/match"
import { GameConfig, GameMode, getAllowedModesForGame } from "@/lib/game-config"
import { Users, Trophy, Clock, PlayCircle, Loader2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { readyCheckService } from "@/lib/services/ready-check-service"
import { ReadyCheckModal } from "@/components/match/ready-check-modal"
import { QueueRakeDisplay } from "@/components/match/queue-rake-display"
import { useAuth } from "@/lib/auth-context"
import { lobbyQueueService } from "@/lib/services/lobby-queue-service"
import { toast } from "sonner"

interface GameQueueProps {
    game: GameConfig
}

export function GameQueue({ game }: GameQueueProps) {
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { data } = await supabase
                .from("matches")
                .select("*, creator:users(username)")
                .eq("status", "open")
                .eq("game", game.id)
                .order("created_at", { ascending: false })

            setMatches(data || [])
            setLoading(false)
        }
        load()

        const channel = supabase
            .channel(`${game.id}-lobby`)
            .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
                load()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [game.id])

    const router = useRouter()
    const { user } = useAuth()
    const [inQueue, setInQueue] = useState(false)
    const [queueLoading, setQueueLoading] = useState(false)

    useEffect(() => {
        if (!user) return
        const checkQueue = async () => {
            const { data } = await supabase
                .from("lobby_queue")
                .select("*")
                .eq("user_id", user.id)
                .eq("status", "waiting")
                .single()
            setInQueue(!!data)
        }
        checkQueue()
    }, [user])

    const handleQueueAction = async () => {
        if (!user) return
        setQueueLoading(true)
        try {
            if (inQueue) {
                await lobbyQueueService.leaveQueue(user.id)
                setInQueue(false)
                toast.info("Left queue")
            } else {
                // Default to 4v4 Snake Draft for now as per requirements
                await lobbyQueueService.joinQueue(user.id, "unmaxed", "snake_draft", 4)
                setInQueue(true)
                toast.success("Joined queue for Snake Draft!")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to update queue status")
        } finally {
            setQueueLoading(false)
        }
    }

    const allowedModes = getAllowedModesForGame(game.id)

    if (loading) {
        return (
            <Card className={`${game.color} bg-opacity-10 border-2`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{game.icon}</span>
                        {game.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={`${game.color} bg-opacity-10 border-2`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{game.icon}</span>
                        {game.name}
                    </CardTitle>
                    <div className="flex gap-2 items-center">
                        {user && (
                            <Button
                                onClick={handleQueueAction}
                                disabled={queueLoading}
                                variant={inQueue ? "destructive" : "default"}
                                size="sm"
                                className={inQueue ? "" : "bg-green-600 hover:bg-green-700"}
                            >
                                {queueLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : inQueue ? (
                                    <XCircle className="h-4 w-4 mr-2" />
                                ) : (
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                )}
                                {inQueue ? "Leave Queue" : "Join Queue ($5)"}
                            </Button>
                        )}
                        {allowedModes.map((mode) => (
                            <Badge key={mode.id} variant="secondary" className={mode.color}>
                                {mode.name}
                            </Badge>
                        ))}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">{game.description}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <QueueRakeDisplay entryFee={5.00} />
                {matches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No active lobbies</p>
                        <p className="text-xs mt-1">Join the queue to start a new match!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {matches.map((match) => (
                            <Card key={match.id} className="bg-background/50">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-bold">${match.wager_amount}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {match.team_size}v{match.team_size}
                                            </Badge>
                                            {match.tournament_mode && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Trophy className="h-3 w-3 mr-1" />
                                                    Tournament
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {match.creator?.username || "Unknown"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(match.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => router.push(`/match/${match.id}`)}
                                        variant="default"
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        View Lobby
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
            {user && <ReadyCheckModal userId={user.id} />}
        </Card>
    )
}
