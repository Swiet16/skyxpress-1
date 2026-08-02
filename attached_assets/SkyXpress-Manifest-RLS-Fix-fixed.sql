-- ================================================================
-- SkyXpress — Manifest RLS Fix
-- Run this entire script in the Supabase SQL Editor (one shot).
-- ================================================================

-- ----------------------------------------------------------------
-- 1. manifests_detail
--    • admin / staff / developer → full access to ALL rows
--    • partner               → only rows where partner_user_id = their UID
-- ----------------------------------------------------------------
ALTER TABLE manifests_detail ENABLE ROW LEVEL SECURITY;

-- Remove old / conflicting policies first so the script is safe to re-run
DROP POLICY IF EXISTS "admin_staff_full_access_manifests"   ON manifests_detail;
DROP POLICY IF EXISTS "partners_own_manifests_select"        ON manifests_detail;
DROP POLICY IF EXISTS "partners_own_manifests_insert"        ON manifests_detail;
DROP POLICY IF EXISTS "partners_own_manifests_update"        ON manifests_detail;
DROP POLICY IF EXISTS "partners_own_manifests_delete"        ON manifests_detail;

-- Admin / staff / developer — read & write everything
CREATE POLICY "admin_staff_full_access_manifests"
  ON manifests_detail
  FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'staff', 'developer')
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'staff', 'developer')
  );

-- Partner — SELECT own manifests only
CREATE POLICY "partners_own_manifests_select"
  ON manifests_detail
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'partner'
    AND partner_user_id = auth.uid()
  );

-- Partner — INSERT (they must stamp their own UID)
CREATE POLICY "partners_own_manifests_insert"
  ON manifests_detail
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'partner'
    AND partner_user_id = auth.uid()
  );

-- Partner — UPDATE own rows only
CREATE POLICY "partners_own_manifests_update"
  ON manifests_detail
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'partner'
    AND partner_user_id = auth.uid()
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'partner'
    AND partner_user_id = auth.uid()
  );

-- Partner — DELETE own rows only
CREATE POLICY "partners_own_manifests_delete"
  ON manifests_detail
  FOR DELETE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'partner'
    AND partner_user_id = auth.uid()
  );

-- NOTE: if partner_user_id is stored as UUID (not TEXT) in your DB,
-- replace   auth.uid()   with just   auth.uid()   in all policies above.


-- ----------------------------------------------------------------
-- 2. manifest_history
--    • admin / staff / developer → full access
--    • partner → SELECT only for history entries belonging to their own manifests
-- ----------------------------------------------------------------
ALTER TABLE manifest_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_staff_full_access_manifest_history" ON manifest_history;
DROP POLICY IF EXISTS "partners_own_manifest_history_select"      ON manifest_history;

CREATE POLICY "admin_staff_full_access_manifest_history"
  ON manifest_history
  FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'staff', 'developer')
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'staff', 'developer')
  );

CREATE POLICY "partners_own_manifest_history_select"
  ON manifest_history
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'partner'
    AND EXISTS (
      SELECT 1
      FROM   manifests_detail md
      WHERE  md.manifest_id       = manifest_history.manifest_id
        AND  md.partner_user_id   = auth.uid()
    )
  );


-- ----------------------------------------------------------------
-- 3. manifest_sequence
--    Counter used to generate manifest IDs.
--    All authenticated users need read + update access (partners
--    create manifests and must be able to increment the counter).
-- ----------------------------------------------------------------
ALTER TABLE manifest_sequence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_manifest_sequence"      ON manifest_sequence;
DROP POLICY IF EXISTS "authenticated_update_manifest_sequence"    ON manifest_sequence;

CREATE POLICY "authenticated_read_manifest_sequence"
  ON manifest_sequence
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_update_manifest_sequence"
  ON manifest_sequence
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ----------------------------------------------------------------
-- 4. Make increment_manifest_sequence a SECURITY DEFINER function
--    so partners (who cannot directly UPDATE manifest_sequence)
--    can still call the RPC and get the next number.
--    Only run this block if the function already exists; adjust
--    the body to match your current implementation.
-- ----------------------------------------------------------------
/*
  Example — uncomment and adapt to your real function body:

  CREATE OR REPLACE FUNCTION increment_manifest_sequence()
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER          -- ← key line: runs as the function owner (superuser)
  SET search_path = public
  AS $$
  DECLARE
    next_val bigint;
  BEGIN
    UPDATE manifest_sequence
       SET last_number = last_number + 1
     WHERE id = 1
    RETURNING last_number INTO next_val;
    RETURN next_val;
  END;
  $$;
*/


-- ================================================================
-- Quick verification — run these SELECTs after applying the script
-- to confirm policies are in place.
-- ================================================================
SELECT schemaname, tablename, policyname, cmd, roles
FROM   pg_policies
WHERE  tablename IN ('manifests_detail', 'manifest_history', 'manifest_sequence')
ORDER  BY tablename, policyname;
