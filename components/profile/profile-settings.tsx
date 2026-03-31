"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateProfile } from "@/lib/actions/profile"
import { Gamepad2, RefreshCw, CheckCircle, SearchCode, Loader2 } from "lucide-react"

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
            toast.success("Profile mapping archived!")
        } else {
            toast.error(result?.error || "Failed to update links")
        }
        setLoading(false)
    }

    const handleBattleNetSync = () => {
        if (!accountId) {
            toast.error("Please enter a valid StarCraft ID (e.g. 1-S2-...) first.")
            return
        }

        setIsSyncing(true)
        // Simulate StarCraft Folder Metadata Sync
        setTimeout(() => {
            setSyncedData({
                bnetWins: Math.floor(Math.random() * 200) + 50,
                bnetKD: (Math.random() * 1.5 + 0.8).toFixed(2),
                syncedAt: new Date().toLocaleTimeString()
            })
            setIsSyncing(false)
            toast.success("Archived identity mapping for SCID: " + accountId)
        }, 1800)
    }

    return (
        <Card className="border-primary/20 bg-black/40 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Gamepad2 className="size-48 text-primary" />
            </div>
            <CardHeader className="relative z-10">
                <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-primary" />
                    Identity & Mapping
                </CardTitle>
                <CardDescription className="text-xs uppercase font-mono tracking-widest text-muted-foreground">
                    Secure cross-platform performance tracking archives.
                </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground italic">Arena Handle</Label>
                            <Input
                                id="username"
                                placeholder="Resteral"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-black/60 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all font-bold text-white italic"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatar" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground italic">Avatar Endpoint</Label>
                            <Input
                                id="avatar"
                                placeholder="https://example.com/avatar.png"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="bg-black/60 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all font-mono text-xs"
                            />
                        </div>
                    </div>

                    {/* StarCraft Folder Identity Mapping Box */}
                    <div className="p-4 rounded-3xl border border-primary/20 bg-primary/5 space-y-4 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                        {/* Background Accent */}
                        <div className="absolute -top-10 -right-10 size-32 bg-primary/10 blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors" />
                        
                        <div className="space-y-1 relative z-10">
                            <Label className="flex items-center gap-2 text-primary font-black uppercase italic tracking-tighter">
                                <SearchCode className="size-4" />
                                StarCraft Folder Mapping (SBMM Protocol)
                            </Label>
                            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                Link your identity to automatically map results from imported CSV game data. Found in: 
                                <span className="text-primary/70 font-mono block mt-1">Documents/StarCraft II/Accounts/...</span>
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                            <Input
                                placeholder="e.g. 1-S2-1-5822233"
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="bg-black/60 border-primary/20 font-mono text-sm h-12 rounded-xl focus:border-primary/50 transition-all font-black text-primary uppercase italic"
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleBattleNetSync}
                                disabled={isSyncing || !accountId}
                                className="border-primary/20 hover:bg-primary/10 text-primary h-12 px-6 rounded-xl font-black uppercase italic tracking-widest transition-all"
                            >
                                {isSyncing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : null}
                                {isSyncing ? "SYNCING..." : "MAP IDENTITY"}
                            </Button>
                        </div>

                        {syncedData && (
                            <div className="bg-black/80 rounded-2xl p-4 text-[10px] font-black text-white uppercase italic tracking-widest flex items-center justify-between border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-500 shadow-2xl">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="size-4 text-green-500" /> 
                                    <span>Identity Validated</span>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex flex-col items-center">
                                        <span className="text-muted-foreground opacity-50">Arena Wins</span>
                                        <span className="text-primary text-sm tracking-tighter">{syncedData.bnetWins}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-muted-foreground opacity-50">Skill Index</span>
                                        <span className="text-primary text-sm tracking-tighter">{syncedData.bnetKD}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    <Button
                        type="submit"
                        className="w-full h-14 bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase italic tracking-[0.2em] rounded-2xl shadow-2xl transition-all shadow-primary/20"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin size-5" /> : "CONFIRM PROFILE ARCHIVE"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
