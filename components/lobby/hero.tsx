"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Trophy, Zap, Users, ArrowRight } from "lucide-react"

export const Hero: React.FC = () => {
    return (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-black border border-white/10 shadow-2xl mb-12">
            {/* Background Image / Overlay */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                {/* We'll use the generated image path here if possible, but for dev we use a placeholder or the actual path if we had it in a public dir */}
                <div 
                    className="w-full h-full bg-cover bg-center animate-pulse-slow" 
                    style={{ backgroundImage: 'url("/assets/hero-bg.png")' }} // Fallback/Placeholder
                />
            </div>

            <div className="relative z-20 p-8 md:p-16 flex flex-col items-center md:items-start text-center md:text-left gap-8 max-w-4xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-black italic tracking-widest uppercase">
                    <Zap className="size-4 animate-pulse" />
                    Live Arena Protocol Active
                </div>

                <div className="space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-[0.9]">
                        The Ultimate <br />
                        <span className="text-primary italic">Battleground</span>
                    </h1>
                    <p className="text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
                        Stake your claim in high-stakes skill-based competition. 
                        Elite matchmaking, real-time draft protocols, and instant prize distribution.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Users className="size-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white italic tracking-tighter">1,248</p>
                            <p className="text-xs text-muted-foreground uppercase font-mono">Active Commandos</p>
                        </div>
                    </div>
                    <div className="w-px h-12 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Trophy className="size-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white italic tracking-tighter">$45,280</p>
                            <p className="text-xs text-muted-foreground uppercase font-mono">Bounty Pool</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button className="h-16 px-10 bg-primary hover:bg-primary/80 text-white font-black uppercase italic tracking-widest rounded-2xl border-t border-white/20 shadow-xl group">
                        Enter Arena
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" className="h-16 px-10 border-white/10 hover:bg-white/5 text-white font-black uppercase italic tracking-widest rounded-2xl">
                        View Intel
                    </Button>
                </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 p-8 hidden lg:block">
                <div className="size-64 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
            </div>
        </div>
    )
}
