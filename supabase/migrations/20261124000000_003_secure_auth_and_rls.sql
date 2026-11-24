/*
  003 - Real authentication (Supabase Auth) + operator-only RLS.   *** NOT APPLIED. REVIEW FIRST ***

  Order of work (do NOT run this file first):
   1. Supabase dashboard > Authentication > Providers > Email: keep enabled, DISABLE "Allow new users to sign up".
   2. Create the single operator user (Authentication > Users > Add user) with a NEW strong password and a real email.
   3. Run:  INSERT INTO public.operators(user_id) SELECT id FROM auth.users WHERE email = '<operator email>';
      (this file refuses to run if the operators table is empty, so you cannot lock yourself out)
   4. Deploy the new app build (it logs in with that email), confirm login works.
   5. Run this file. It closes the public exposure in one transaction.
   Rollback: 20261124000001_003_rollback.sql = lockdown (nobody but the service role has access). It never reopens public access.
*/
BEGIN;

CREATE TABLE IF NOT EXISTS public.operators (user_id uuid PRIMARY KEY);
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operators FROM anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.operators) THEN
    RAISE EXCEPTION 'operators table is empty: add the operator first (see header)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_operator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_operator() TO authenticated;

-- 1) Remove every existing policy on the app tables (including the open anon ones)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','customers','orders','order_images','notifications','ai_conversations','settings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Per-user tables now point to Supabase Auth users (existing rows tied to old ids are left but not validated)
ALTER TABLE notifications     DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE ai_conversations  DROP CONSTRAINT IF EXISTS ai_conversations_user_id_fkey;
ALTER TABLE settings          DROP CONSTRAINT IF EXISTS settings_user_id_fkey;
ALTER TABLE notifications     ADD CONSTRAINT notifications_user_id_fkey    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ai_conversations  ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE settings          ADD CONSTRAINT settings_user_id_fkey         FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

-- 3) Lock everything to signed-in users. anon gets NOTHING on the tables.
REVOKE ALL ON users, customers, orders, order_images, notifications, ai_conversations, settings FROM anon;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;      -- legacy table (holds old password hashes); no policies = no access via API
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Shared business data: only the listed operator
CREATE POLICY "operator customers"    ON customers    FOR ALL TO authenticated USING (public.is_operator()) WITH CHECK (public.is_operator());
CREATE POLICY "operator orders"       ON orders       FOR ALL TO authenticated USING (public.is_operator()) WITH CHECK (public.is_operator());
CREATE POLICY "operator order_images" ON order_images FOR ALL TO authenticated USING (public.is_operator()) WITH CHECK (public.is_operator());

-- Personal data: only own rows
CREATE POLICY "own notifications" ON notifications    FOR ALL TO authenticated USING (public.is_operator() AND user_id = auth.uid()) WITH CHECK (public.is_operator() AND user_id = auth.uid());
CREATE POLICY "own conversations" ON ai_conversations FOR ALL TO authenticated USING (public.is_operator() AND user_id = auth.uid()) WITH CHECK (public.is_operator() AND user_id = auth.uid());
CREATE POLICY "own settings"      ON settings         FOR ALL TO authenticated USING (public.is_operator() AND user_id = auth.uid()) WITH CHECK (public.is_operator() AND user_id = auth.uid());

-- 4) Customer order tracking without opening the orders table.
--    One exact 7-digit code in, first name + status out. No image, no phone. Global throttle limits guessing.
CREATE TABLE IF NOT EXISTS public.track_order_hits (at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.track_order_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.track_order_hits FROM anon, authenticated;

-- the live database may already have a track_order with another return shape: drop it first
DROP FUNCTION IF EXISTS public.track_order(text);
CREATE FUNCTION public.track_order(p_code text)
RETURNS TABLE (order_code text, customer_name text, status text, image_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.track_order_hits WHERE at < now() - interval '1 minute';
  IF (SELECT count(*) FROM public.track_order_hits) >= 30 THEN
    RAISE EXCEPTION 'too many lookups, try again in a minute';
  END IF;
  INSERT INTO public.track_order_hits DEFAULT VALUES;
  IF p_code IS NULL OR p_code !~ '^[0-9]{7}$' THEN RETURN; END IF;
  RETURN QUERY
    SELECT o.order_code::text, split_part(trim(o.customer_name), ' ', 1)::text, o.status::text, NULL::text
    FROM public.orders o WHERE o.order_code = p_code LIMIT 1;
END $$;
REVOKE ALL ON FUNCTION public.track_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;

-- Manual follow-ups (not automatic, destructive): after confirming login works, run
--   UPDATE users SET password_hash = '';   -- clear legacy hashes
-- Storage bucket "order-images": its policies are not in this repo; review them in the dashboard.

COMMIT;
