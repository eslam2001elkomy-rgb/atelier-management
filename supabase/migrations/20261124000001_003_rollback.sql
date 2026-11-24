/*
  Rollback of 003 = SAFE LOCKDOWN. It never restores the old public policies.
  After it runs, nobody except the service role can read or write the app tables, and tracking is off.
  Use it to stop an incident or a broken release; fix forward, or re-run 003 once ready.
*/
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('users','customers','orders','order_images','notifications','ai_conversations','settings')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename); END LOOP;
END $$;
REVOKE ALL ON users, customers, orders, order_images, notifications, ai_conversations, settings FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.track_order(text);
COMMIT;
