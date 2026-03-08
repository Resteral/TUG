import { NotificationSettings } from "@/components/profile/notification-settings"
import { PrivacySettings } from "@/components/profile/privacy-settings"
import { ProfileSettings } from "@/components/profile/profile-settings"
import { SecuritySettings } from "@/components/profile/security-settings"
import { DangerZone } from "@/components/profile/danger-zone"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft, HelpCircle } from "lucide-react"
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
                    <p className="text-muted-foreground text-sm">Manage your profile, social, and platform preferences.</p>
                </div>
            </div>

            <div className="grid gap-8 pb-10">
                <ProfileSettings />
                <SecuritySettings />
                <PrivacySettings />
                <NotificationSettings />

                <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-blue-400" />
                        <CardTitle className="text-sm">Need Help?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mb-4">Have questions about your account or platform rules?</p>
                        <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link href="/support">Visit Support Center</Link>
                        </Button>
                    </CardContent>
                </Card>

                <DangerZone />
            </div>
        </div>
    )
}
