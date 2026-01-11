
-- Fix missing INSERT policy for transactions
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

-- Also ensure increment_balance is secure if it's not logically restricted nicely, 
-- but logically it updates "own" balance if called with own ID. 
-- However, anyone can call rpc increment_balance(other_id, -1000).
-- We need to secure increment_balance to only allow affecting ONESELF?
-- Or rely on the fact that only SERVER can call it with service role? 
-- But our client code calls it as the USER. 
-- So a User could call `supabase.rpc('increment_balance', {user_id: victim, amount: -1000})`.
-- WE MUST FIX THIS SECURITY HOLE TOO.

create or replace function increment_balance(user_id uuid, amount numeric)
returns void as $$
begin
  -- Check if the user is updating their own balance
  if auth.uid() != user_id then
    raise exception 'Not authorized to update other users balance';
  end if;

  update public.users
  set balance = balance + amount
  where id = user_id;
end;
$$ language plpgsql;
