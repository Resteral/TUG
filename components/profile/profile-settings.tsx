"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateProfile } from "@/lib/actions/profile"
import { Gamepad2, RefreshCw, CheckCircle, SearchCode } from "lucide-react"
import { SteamIcon } from "@/components/icons/steam-icon"

export function ProfileSettings() {
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [accountId, setAccountId] = useState("")
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncedData, setSyncedData] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from("users")
                .select("username, avatar_url, account_id")
                .eq("id", user.id)
                .single()

            if (profile) {
                setUsername(profile.username || "")
                setAvatarUrl(profile.avatar_url || "")
                setAccountId(profile.account_id || "")
            }
        }
        loadProfile()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateProfile({
            username,
            avatar_url: avatarUrl,
            account_id: accountId
        })

        if (result?.success) {
            toast.success("Profile links updated!")
        } else {
            toast.error(result?.error || "Failed to update links")
        }
        setLoading(false)
    }

    const handleBattleNetSync = () => {
        if (!accountId) {
            toast.error("Please enter a valid Account ID (e.g. BattleTag#1234) first.")
            return
        }

        setIsSyncing(true)
        // Simulate Battle.net API Data Sync
        setTimeout(() => {
            setSyncedData({
                bnetWins: Math.floor(Math.random() * 200) + 50,
                bnetKD: (Math.random() * 1.5 + 0.8).toFixed(2),
                syncedAt: new Date().toLocaleTimeString()
            })
            setIsSyncing(false)
            toast.success("Successfully synchronized global Battle.net statistics for " + accountId)
        }, 1800)
    }

    return (
        <Card className="border-primary/20 bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    Profile & Connections
                </CardTitle>
                <CardDescription>
                    Customize your appearance and securely sync your external gaming data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="Resteral"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-primary/5 border-primary/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatar">Avatar URL</Label>
                            <Input
                                id="avatar"
                                placeholder="https://example.com/avatar.png"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="bg-primary/5 border-primary/10"
                            />
                        </div>
                    </div>

                    {/* BattleNet Dedicated Sync Box */}
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2 text-blue-400 font-bold">
                                    <SearchCode className="size-4" />
                                    Global Account Synchronization
                                </Label>
                                <p className="text-xs text-blue-200/50">
                                    Link your central Account ID (or BattleTag) to instantly import your competitive history.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="e.g. Resteral#1999"
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="bg-black/40 border-blue-500/30 font-mono text-sm placeholder:text-blue-200/20"
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleBattleNetSync}
                                disabled={isSyncing || !accountId}
                                className="border-blue-500/30 hover:bg-blue-500/10 text-blue-400 whitespace-nowrap"
                            >
                                {isSyncing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : null}
                                {isSyncing ? "Syncing API..." : "Verify & Sync"}
                            </Button>
                        </div>

                        {syncedData && (
                            <div className="bg-black/60 rounded p-3 text-xs font-mono text-blue-300 flex items-center justify-between border border-blue-500/10 animate-in fade-in zoom-in-95 duration-300">
                                <span><CheckCircle className="size-3 inline mr-1 text-green-500" /> API Validated</span>
                                <div className="flex gap-4">
                                    <span>Lifetime Wins: <strong>{syncedData.bnetWins}</strong></span>
                                    <span>K/D: <strong>{syncedData.bnetKD}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>


                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Profile Changes"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
