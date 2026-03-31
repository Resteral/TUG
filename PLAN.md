
# TUG Arena - Production-Ready SBMM & Identity Mapping Plan

## Goal Description
Transition the TUG platform from a generic wagering template to a specialized, production-ready **Skill-Based Matchmaking (SBMM)** environment for the StarCraft community. The system now prioritizes performance-based scaling and automated stat ingestion over simple wagering.

## Milestone Status: COMPLETED
> [!NOTE]
> **StarCraft Identity Mapping**: Users now link their StarCraft Account ID (SCID) to their TUG profile. This mapping is used as the "Key" for all performance analytics.
> **Automated Stat Ingestion**: Match results are determined by importing CSV archives from the SC2 Mod. Stats (Goals, Assists, etc.) are automatically mapped to participants.
> **SBMM Infrastructure**: Matchmaking thresholds are set to production-level tournament sizes (e.g., 4v4 = 8 players).
> **Archive Intel Dashboard**: A premium, real-time analytics dashboard provides a deep-dive into combat history and efficiency indices.

## Implemented Infrastructure

### Match Verification & Mapping
- **CSV Import Engine**: In `MatchRoom`, users can paste CSV game data.
- **Identity Resolver**: The `CSVStatsService` maps SCID strings in the CSV to TUG usernames via the `account_id` field in the `users` table.
- **Archive Persistance**: Every reported match now includes a source CSV code for permanent historical record-keeping.

### Skill-Based Matchmaking (SBMM)
- **Production Thresholds**: Matchmaking nodes (e.g., 4v4 Snake Draft) require a full lobby of 8 players to trigger a "Ready Check".
- **ELO-Based Pairing**: Players are sorted by skill rating (ELO) to ensure balanced teams within the queue.
- **Zero-Fee Protocol**: TUG currently operates on a skill-only basis with 0 entry fees for standard ranked nodes.

### Security & Compliance (RLS Preparation)
- **RLS Status**: Row Level Security is currently **disabled** across core tables to maintain compatibility with the custom Next.js authentication provider.
- **Transition Plan**: Scripts are prepared to re-enable RLS once granular policies for `service_role` access are finalized.

## Next Steps for Scale
1. **Global Leaderboard Expansion**: Integrate aggregated CSV stats (Goals/Saves) into the primary leaderboard ELO calculation.
2. **Automated File Monitoring**: Replace manual CSV pasting with a client-side file watcher (or automated upload) for SC2 Replay folders.
3. **Admin Dispute Console**: Implement a manual review dashboard for matches where the CSV data is disputed or malformed.
4. **RLS Hardening**: Apply granular policies to the `users` and `tournament_participants` tables.

---
*Created: 2026-03-31*
*Version: 2.0.0 (Production Core)*
