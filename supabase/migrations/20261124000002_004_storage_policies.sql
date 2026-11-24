/*
  004 - Storage: only the operator may upload, change or delete order images.   *** NOT APPLIED. REVIEW FIRST ***
  Run AFTER 003 (needs public.is_operator()).

  Why: 002 let ANYONE (anon) upload into bucket "order-images". Policies you added by hand in the dashboard
  are not in this repo, so this file also removes every existing policy on storage.objects that mentions
  the bucket, then adds operator-only ones.

  What it does NOT change: the bucket stays public-read, because the app shows images through getPublicUrl().
  Anyone who has an exact image URL can still open that image. Making the bucket private needs signed URLs in
  the app (a code change). That is a separate decision, see the handoff notes.
  Rollback: 20261124000003_004_rollback.sql (removes uploads for everyone except the service role; never reopens anon).
*/
BEGIN;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') ILIKE '%order-images%' OR coalesce(with_check, '') ILIKE '%order-images%'
           OR policyname ILIKE '%order%image%' OR policyname ILIKE '%upload images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "operator reads order images"   ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'order-images' AND public.is_operator());
CREATE POLICY "operator uploads order images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-images' AND public.is_operator());
CREATE POLICY "operator updates order images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'order-images' AND public.is_operator()) WITH CHECK (bucket_id = 'order-images' AND public.is_operator());
CREATE POLICY "operator deletes order images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'order-images' AND public.is_operator());

COMMIT;
