
-- TUG ARENA - COMPLETE SBMM SCHEMA
-- consolidates core wagering, matchmaking queue, and StarCraft identity mapping.

-- 1. UTILITIES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE USERS
-- Includes 'account_id' for StarCraft ID mapping
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    account_id TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    elo_rating INTEGER NOT NULL DEFAULT 1000,
    balance NUMERIC DEFAULT 0.00,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    -- Compliance / Ledger (KYC/AML)
    kyc_status TEXT DEFAULT 'unverified',
    age_verified BOOLEAN DEFAULT false,
    region_allowed BOOLEAN DEFAULT true,
    aml_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FINANCIAL LEDGER
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'tournament_fee', 'tournament_payout'
    status TEXT DEFAULT 'completed',
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MATCHMAKING QUEUE (Lobby waitlist)
CREATE TABLE IF NOT EXISTS public.lobby_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    queue_type TEXT NOT NULL, -- 'maxed', 'unmaxed'
    game_format TEXT NOT NULL, -- 'snake_draft', etc.
    player_count INTEGER NOT NULL,
    elo_rating INTEGER NOT NULL,
    entry_fee NUMERIC DEFAULT 0.00,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'matched', 'cancelled'
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MATCHMAKING ARENAS / TOURNAMENTS
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    game TEXT NOT NULL,
    tournament_type TEXT NOT NULL,
    max_participants INTEGER NOT NULL,
    prize_pool NUMERIC DEFAULT 0.00,
    player_pool_settings JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'registration', -- 'registration', 'ready_check', 'drafting', 'active', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ARENA PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'pending_ready', 'ready', 'active', 'eliminated'
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. GENERIC MATCHES (Used by some UI components for match histories)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    game TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    team_size INTEGER DEFAULT 4,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ARENA MATCH PARTICIPANTS (Used for MatchRoom logic)
CREATE TABLE IF NOT EXISTS public.match_participants (
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL CHECK (team_id IN (1, 2)),
    status TEXT DEFAULT 'joined',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id)
);

-- 9. ADVANCED ANALYTICS
CREATE TABLE IF NOT EXISTS public.player_advanced_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT,
    elo_rating INTEGER DEFAULT 1000,
    matches_played INTEGER DEFAULT 0,
    avg_kills NUMERIC DEFAULT 0,
    avg_deaths NUMERIC DEFAULT 0,
    avg_assists NUMERIC DEFAULT 0,
    avg_damage NUMERIC DEFAULT 0,
    avg_accuracy NUMERIC DEFAULT 0,
    win_percentage NUMERIC DEFAULT 0,
    total_mvp_votes INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    streak_type TEXT NOT NULL, -- 'win', 'mvp', 'loss'
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, streak_type)
);

-- 10. SCORE SUBMISSIONS (For CSV stat importing)
CREATE TABLE IF NOT EXISTS public.score_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    submitter_id UUID REFERENCES public.users(id),
    team1_score INTEGER,
    team2_score INTEGER,
    winner_team INTEGER,
    csv_code TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'disputed'
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MATCH RESULTS (Finalized outcomes)
CREATE TABLE IF NOT EXISTS public.match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE UNIQUE,
    team1_score INTEGER,
    team2_score INTEGER,
    winner_team INTEGER,
    csv_code TEXT,
    total_submissions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION increment_balance(target_user_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET balance = balance + amount
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 13. CONFIGURE RLS (ROW LEVEL SECURITY)
-- Disabled for Custom Auth flow compatibility.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_advanced_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_streaks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results DISABLE ROW LEVEL SECURITY;
