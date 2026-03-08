"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMatch } from "@/lib/actions/match"
import { getAllGames, getAllowedModesForGame } from "@/lib/game-config"

export function CreateMatchForm() {
    const [selectedGame, setSelectedGame] = useState("zealot_hockey")
    const games = getAllGames()
    const allowedModes = getAllowedModesForGame(selectedGame)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Match</CardTitle>
                <CardDescription>Start a new arena competition</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    action={async (formData) => {
                        const result = await createMatch(formData)
                        if (result?.error) {
                            console.error(result.error)
                            alert(result.error)
                        }
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label>Game</Label>
                        <Select name="game" value={selectedGame} onValueChange={setSelectedGame} required>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {games.map((game) => (
                                    <SelectItem key={game.id} value={game.id}>
                                        <span className="flex items-center gap-2">
                                            <span>{game.icon}</span>
                                            <span>{game.name}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Team Size</Label>
                        <Select name="teamSize" required defaultValue={allowedModes[0]?.teamSize.toString()}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {allowedModes.map((mode) => (
                                    <SelectItem key={mode.id} value={mode.teamSize.toString()}>
                                        {mode.name} ({mode.players} players)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Entry Fee ($)</Label>
                        <Input name="entryFee" type="number" min="1" step="0.50" required placeholder="10.00" />
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                        Create Arena Challenge
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
