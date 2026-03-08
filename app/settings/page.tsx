import { SteamIcon } from "@/components/icons/steam-icon"
import { ProfileSettings } from "@/components/profile/profile-settings"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function SettingsPage() {
    return (
        <div className="container mx-auto p-4 max-w-2xl space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                    <p className="text-muted-foreground text-sm">Manage your profile and social connections.</p>
                </div>
            </div>

            <div className="grid gap-8">
                <ProfileSettings />

                <Card className="border-primary/20 bg-black/40 backdrop-blur-xl opacity-50 cursor-not-allowed">
                    <CardHeader>
                        <CardTitle className="text-sm">More Settings Coming Soon</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Notification preferences and security options are being prepared.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
