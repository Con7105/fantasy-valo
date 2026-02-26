# Supabase setup for Draft and Leagues

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In the SQL Editor, run the migrations in order: copy contents of `supabase/migrations/001_draft_schema.sql` and execute, then `supabase/migrations/002_leagues.sql`.
3. In Project Settings > API: copy **Project URL** and **anon public** key.
4. In the web app root (`web/`), create `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Restart the dev server after adding env vars.

**Realtime (so picks update on all screens without refresh):**  
In the SQL Editor, run:
```sql
alter publication supabase_realtime add table public.draft_rooms;
alter publication supabase_realtime add table public.draft_picks;
```
If you get "table already in publication", you're done. For league member list updates in real time, you can also add:
```sql
alter publication supabase_realtime add table public.leagues;
alter publication supabase_realtime add table public.league_members;
alter publication supabase_realtime add table public.league_weeks;
```
Without Realtime, the app still works: the person who picks sees the update immediately (optimistic update), and everyone else gets updates every few seconds via polling.
