"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function QueueRakeDisplay({ entryFee = 5 }: { entryFee?: number }) {
    const [rakePercentage, setRakePercentage] = useState<number>(0.10)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchRake() {
            try {
                const { data } = await supabase
                    .from("platform_settings")
                    .select("value")
                    .eq("key", "rake_percentage")
                    .single()

                if (data && data.value) {
                    setRakePercentage(parseFloat(data.value))
                }
            } catch (e) {
                console.error("Failed to fetch rake setting:", e)
            } finally {
                setLoading(false)
            }
        }

        fetchRake()
    }, [])

    if (loading) {
        return <div className="text-xs text-muted-foreground animate-pulse mt-2">Loading platform fees...</div>
    }

    const platformCut = entryFee * rakePercentage
    const displayPercentage = (rakePercentage * 100).toFixed(0)

    return (
        <Alert variant="default" className="mt-3 bg-muted/50 border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs flex justify-between items-center w-full">
                <span>Platform Rake ({displayPercentage}%)</span>
                <span className="font-semibold text-primary">-${platformCut.toFixed(2)}</span>
            </AlertDescription>
        </Alert>
    )
}
