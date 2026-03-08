
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function WalletPage() {
    const [balance, setBalance] = useState(0)
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/auth/login")
                return
            }

            // Load Balance
            const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single()
            if (profile) setBalance(profile.balance)

            // Load Transactions
            const { data: txs } = await supabase.from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
            setTransactions(txs || [])
            setLoading(false)
        }
        load()
    }, [router])

    const handleMockDeposit = async () => {
        // Mock deposit logic
        // Ideally call a server action, but for mock we can just use RPC if we authorized it for self,
        // or a server action `deposit(amount)`.
        // Let's assume we need a server action for safety actually.
        // But for this step, I'll essentially just "refresh" or show a helper message.
        // Actually, let's make it work! I'll create an ad-hoc action or just RPC call if enabled.
        // I enabled increment_balance for self in the migration!

        const amount = 100
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.rpc('increment_balance', {
            user_id: user.id,
            amount: amount
        })

        if (!error) {
            // We also should log the transaction!
            await supabase.from("transactions").insert({
                user_id: user.id,
                amount: amount,
                type: 'deposit',
                provider: 'platform', // Mock
                status: 'completed',
                external_id: 'mock_deposit_' + Date.now()
            })
            alert("Mock Deposit Successful! +$100")
            window.location.reload()
        } else {
            alert("Deposit failed")
        }
    }

    if (loading) return <div className="p-8">Loading wallet...</div>

    return (
        <div className="container mx-auto p-4 max-w-4xl space-y-8">
            <header className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push("/")}>← Back to Lobby</Button>
                <h1 className="text-3xl font-bold">Wallet</h1>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-mono text-green-400 mb-4">${balance.toFixed(2)}</div>
                        <Button onClick={handleMockDeposit} className="w-full bg-green-600 hover:bg-green-700">
                            [MOCK] Deposit $100
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                            *This is a mock deposit for testing purposes. Real payments (Stripe/Crypto) to be implemented.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                        <CardDescription>Recent transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {transactions.length === 0 && <div className="text-gray-500">No transactions yet.</div>}
                            {transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center p-2 bg-gray-900/40 rounded border border-gray-800">
                                    <div>
                                        <div className="text-sm font-semibold">
                                            {tx.type === 'arena_entry' ? 'Arena Entry fee' :
                                                tx.type === 'arena_prize' ? 'Arena Prize Payout' :
                                                    tx.type === 'deposit' ? 'Wallet Deposit' :
                                                        tx.type === 'refund' ? 'Arena Refund' :
                                                            tx.type.replace('_', ' ')}
                                        </div>
                                        <div className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</div>
                                        {tx.description && <div className="text-xs text-gray-500 italic mt-1">{tx.description}</div>}
                                    </div>
                                    <div className={`font-mono text-lg ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
