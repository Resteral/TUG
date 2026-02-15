"use server";

import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function createDepositSession(amount: number) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Platform Deposit",
                        },
                        unit_amount: Math.round(amount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?canceled=true`,
            metadata: {
                userId: user.id,
                type: "deposit",
            },
        });

        return { url: session.url };
    } catch (error) {
        console.error("Stripe session creation error:", error);
        return { error: "Failed to create payment session" };
    }
}
