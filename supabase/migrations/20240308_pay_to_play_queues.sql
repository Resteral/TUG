-- Migration for Pay-to-Play Queues

-- Create an RPC to safely join a queue by deducting the entry fee
CREATE OR REPLACE FUNCTION join_pay_to_play_queue(
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
    v_queue_entry lobby_queue;
BEGIN
    -- 1. Check if user is already in a waiting queue
    IF EXISTS (
        SELECT 1 FROM lobby_queue 
        WHERE user_id = p_user_id AND status = 'waiting'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already in a queue.');
    END IF;

    -- 2. Check user's balance
    SELECT balance INTO v_balance FROM users WHERE id = p_user_id;
    IF v_balance IS NULL OR v_balance < p_entry_fee THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for entry fee. Required: $' || p_entry_fee);
    END IF;

    -- 3. Get user's ELO
    SELECT elo_rating INTO v_elo_rating FROM users WHERE id = p_user_id;

    -- 4. Deduct the entry fee
    UPDATE users SET balance = balance - p_entry_fee WHERE id = p_user_id;

    -- 5. Track the deduction via a transaction record (optional but good practice)
    INSERT INTO transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, -p_entry_fee, 'wager', 'completed', 'Pay-to-play queue entry fee');

    -- 6. Insert into queue
    INSERT INTO lobby_queue (user_id, queue_type, game_format, player_count, elo_rating, status)
    VALUES (p_user_id, p_queue_type, p_game_format, p_player_count, COALESCE(v_elo_rating, 1000), 'waiting')
    RETURNING * INTO v_queue_entry;

    RETURN jsonb_build_object('success', true, 'queue_entry', to_jsonb(v_queue_entry));
END;
$$;

-- Create an RPC to safely leave the queue and refund the entry fee
CREATE OR REPLACE FUNCTION leave_pay_to_play_queue(
    p_user_id UUID,
    p_entry_fee NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_queue_entry lobby_queue;
BEGIN
    -- 1. Verify user is actually in the queue
    SELECT * INTO v_queue_entry FROM lobby_queue 
    WHERE user_id = p_user_id AND status = 'waiting';

    IF v_queue_entry IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not currently waiting in a queue.');
    END IF;

    -- 2. Update queue status
    UPDATE lobby_queue SET status = 'cancelled' 
    WHERE user_id = p_user_id AND status = 'waiting';

    -- 3. Refund the user
    UPDATE users SET balance = balance + p_entry_fee WHERE id = p_user_id;

    -- 4. Note the refund
    INSERT INTO transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, p_entry_fee, 'refund', 'completed', 'Pay-to-play queue refund');

    RETURN jsonb_build_object('success', true, 'message', 'Left queue and refunded $' || p_entry_fee);
END;
$$;
