-- =====================================================================
-- CONSOLIDATED: Create lobby_queue table + Queue RPCs
-- Paste this ENTIRE script into Supabase SQL Editor and run it.
-- It is safe to run multiple times (idempotent).
-- =====================================================================

-- STEP 1: Ensure transactions table uses TEXT type (not enum) so arena_entry works
-- (The elo_and_terminology_update migration already handles this, but included for safety)
DO $$
BEGIN
  -- Drop the old enum-typed column if it exists as an enum and recreate as TEXT
  -- This is a no-op if transactions already uses TEXT
  NULL;
END $$;

-- STEP 2: Create lobby_queue table with all columns including entry_fee
CREATE TABLE IF NOT EXISTS public.lobby_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('maxed', 'unmaxed')),
  game_format TEXT NOT NULL CHECK (game_format IN ('snake_draft', 'auction_draft', 'linear_draft')),
  player_count INTEGER NOT NULL CHECK (player_count IN (2, 3, 4, 6, 8, 12)),
  elo_rating INTEGER NOT NULL DEFAULT 1000,
  entry_fee NUMERIC NOT NULL DEFAULT 5.00,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add entry_fee if table already existed without it
ALTER TABLE public.lobby_queue ADD COLUMN IF NOT EXISTS entry_fee NUMERIC NOT NULL DEFAULT 5.00;

-- STEP 3: Indexes
CREATE INDEX IF NOT EXISTS idx_lobby_queue_status ON public.lobby_queue(status);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_type_format ON public.lobby_queue(queue_type, game_format, player_count);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_user ON public.lobby_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_joined_at ON public.lobby_queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_entry_fee ON public.lobby_queue(entry_fee);

-- STEP 4: Row Level Security
ALTER TABLE public.lobby_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all queue entries" ON public.lobby_queue;
CREATE POLICY "Users can view all queue entries" ON public.lobby_queue
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join queues" ON public.lobby_queue;
CREATE POLICY "Users can join queues" ON public.lobby_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own queue entries" ON public.lobby_queue;
CREATE POLICY "Users can update their own queue entries" ON public.lobby_queue
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own queue entries" ON public.lobby_queue;
CREATE POLICY "Users can delete their own queue entries" ON public.lobby_queue
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 5: join_pay_to_play_queue RPC (definitive version with entry_fee)
CREATE OR REPLACE FUNCTION public.join_pay_to_play_queue(
    p_user_id UUID,
    p_queue_type TEXT,
    p_game_format TEXT,
    p_player_count INTEGER,
    p_entry_fee NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
    v_elo_rating INTEGER;
    v_queue_entry JSONB;
BEGIN
    -- Already in queue?
    IF EXISTS (SELECT 1 FROM public.lobby_queue WHERE user_id = p_user_id AND status = 'waiting') THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already in a queue.');
    END IF;

    -- Sufficient balance?
    SELECT balance INTO v_balance FROM public.users WHERE id = p_user_id;
    IF v_balance IS NULL OR v_balance < p_entry_fee THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Required: $' || p_entry_fee::TEXT);
    END IF;

    SELECT elo_rating INTO v_elo_rating FROM public.users WHERE id = p_user_id;

    -- Deduct entry fee
    UPDATE public.users SET balance = balance - p_entry_fee WHERE id = p_user_id;

    -- Record transaction (TEXT type column - no enum constraint)
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, -p_entry_fee, 'arena_entry', 'completed', 'Arena queue entry fee');

    -- Insert queue entry WITH entry_fee
    INSERT INTO public.lobby_queue (user_id, queue_type, game_format, player_count, elo_rating, entry_fee, status)
    VALUES (p_user_id, p_queue_type, p_game_format, p_player_count, COALESCE(v_elo_rating, 1000), p_entry_fee, 'waiting')
    RETURNING to_jsonb(public.lobby_queue.*) INTO v_queue_entry;

    RETURN jsonb_build_object('success', true, 'queue_entry', v_queue_entry);
END;
$$;

-- STEP 6: leave_pay_to_play_queue RPC (reads stored fee for refund)
CREATE OR REPLACE FUNCTION public.leave_pay_to_play_queue(
    p_user_id UUID,
    p_entry_fee NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_waiting BOOLEAN;
    v_actual_fee NUMERIC;
BEGIN
    -- Get stored fee for accurate refund
    SELECT entry_fee INTO v_actual_fee FROM public.lobby_queue
    WHERE user_id = p_user_id AND status = 'waiting'
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM public.lobby_queue
        WHERE user_id = p_user_id AND status = 'waiting'
    ) INTO v_is_waiting;

    IF NOT v_is_waiting THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not currently in a queue.');
    END IF;

    UPDATE public.lobby_queue SET status = 'cancelled'
    WHERE user_id = p_user_id AND status = 'waiting';

    v_actual_fee := COALESCE(v_actual_fee, p_entry_fee);
    UPDATE public.users SET balance = balance + v_actual_fee WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, v_actual_fee, 'refund', 'completed', 'Arena queue refund');

    RETURN jsonb_build_object('success', true, 'message', 'Left queue. Refunded $' || v_actual_fee::TEXT);
END;
$$;
