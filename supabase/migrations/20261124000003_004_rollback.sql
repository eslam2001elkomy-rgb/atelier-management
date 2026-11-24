/* Rollback of 004 = lockdown for the bucket. Never restores anon upload. Only the service role can write afterwards. */
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND (coalesce(qual,'') ILIKE '%order-images%' OR coalesce(with_check,'') ILIKE '%order-images%')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname); END LOOP;
END $$;
COMMIT;
