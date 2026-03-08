import { SteamIcon } from "@/components/icons/steam-icon"
import { ProfileSettings } from "@/components/profile/profile-settings"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

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

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`rounded-xl border shadow-sm ${className}`}>{children}</div>
}
function CardHeader({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col space-y-1.5 p-6">{children}</div>
}
function CardTitle({ children, className }: { children: React.ReactNode, className?: string }) {
    return <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
}
function CardContent({ children }: { children: React.ReactNode }) {
    return <div className="p-6 pt-0">{children}</div>
}
