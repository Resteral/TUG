
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createMatch } from "@/lib/actions/match"

export function CreateMatchForm() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Match</CardTitle>
                <CardDescription>Start a new wager</CardDescription>
            </CardHeader>
            <CardContent>

                <form action={async (formData) => {
                    const result = await createMatch(formData)
                    if (result?.error) {
                        // In a real app, use toast or state to show error
                        console.error(result.error)
                        alert(result.error)
                    }
                }} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Wager Amount ($)</Label>
                        <Input name="wagerAmount" type="number" min="1" step="0.50" required placeholder="10.00" />
                    </div>
                    <div className="space-y-2">
                        <Label>Team Size</Label>
                        <Input name="teamSize" type="number" min="1" max="6" required defaultValue="1" />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Create Challenge</Button>
                </form>
            </CardContent>
        </Card>
    )
}
