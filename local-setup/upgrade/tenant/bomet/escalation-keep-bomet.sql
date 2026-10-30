-- Keep Bomet's escalation timings on v2.12.1 (run once, after the deploy).
--
-- Bomet's RAINMAKER-PGR.EscalationConfig stores each level's OWN wait, e.g.
-- [302400000, 90720000, 90720000]. v2.12.1 reads every ladder as cumulative
-- complaint age and ignores any ladder that is not strictly increasing, which
-- would drop all 91 overrides and the default to the built-in 5 days per level.
-- This rewrites each such ladder to its running total ([302400000, 393120000,
-- 483840000]), so a complaint nobody touches escalates at the same moments as
-- before. 9999999999999 ("never") stays effectively never.
--
-- Only this record changes: the workflow, roles and HRMS are left as they are.
-- Ladders that are already strictly increasing are left alone, so a re-run is a
-- no-op. The previous row is copied to eg_mdms_data_escalation_bak_20261028.
--
-- Run:  docker exec -i docker-postgres psql -U egov -d egov -v ON_ERROR_STOP=1 < escalation-keep-bomet.sql
-- Then: docker restart digit-mdms-backend-1 <pgr-services container>   (both cache MDMS)
-- Undo: see the end of this file.

BEGIN;

CREATE TABLE IF NOT EXISTS eg_mdms_data_escalation_bak_20261028 AS
  SELECT * FROM eg_mdms_data WHERE false;
INSERT INTO eg_mdms_data_escalation_bak_20261028
  SELECT d.* FROM eg_mdms_data d
   WHERE d.schemacode = 'RAINMAKER-PGR.EscalationConfig' AND d.tenantid = 'bo' AND d.isactive
     AND NOT EXISTS (SELECT 1 FROM eg_mdms_data_escalation_bak_20261028 b WHERE b.id = d.id);

-- Running total of a ladder, or the ladder itself when it already increases.
CREATE OR REPLACE FUNCTION pg_temp.cumulative(ladder jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN ladder IS NULL OR jsonb_typeof(ladder) <> 'array' THEN ladder
    WHEN (SELECT bool_and(v > p) FROM (
            SELECT v::numeric AS v, lag(v::numeric) OVER (ORDER BY i) AS p
              FROM jsonb_array_elements_text(ladder) WITH ORDINALITY t(v, i)) x
          WHERE p IS NOT NULL) IS NOT FALSE THEN ladder
    ELSE (SELECT jsonb_agg(s ORDER BY i) FROM (
            SELECT i, sum(v::numeric) OVER (ORDER BY i) AS s
              FROM jsonb_array_elements_text(ladder) WITH ORDINALITY t(v, i)) y)
  END
$$;

UPDATE eg_mdms_data d
   SET data = jsonb_set(
                jsonb_set(d.data, '{defaultSlaByLevel}', pg_temp.cumulative(d.data->'defaultSlaByLevel')),
                '{overrides}',
                COALESCE((SELECT jsonb_object_agg(o.key, pg_temp.cumulative(o.value))
                            FROM jsonb_each(d.data->'overrides') o), '{}'::jsonb)),
       lastmodifiedtime = (extract(epoch FROM now()) * 1000)::bigint
 WHERE d.schemacode = 'RAINMAKER-PGR.EscalationConfig' AND d.tenantid = 'bo' AND d.isactive
   AND d.data ? 'overrides' AND d.data ? 'defaultSlaByLevel';

-- Every ladder must now be strictly increasing, or nothing is committed.
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad
    FROM eg_mdms_data d,
         LATERAL (SELECT d.data->'defaultSlaByLevel' AS l
                  UNION ALL SELECT o.value FROM jsonb_each(d.data->'overrides') o) ladders
   WHERE d.schemacode = 'RAINMAKER-PGR.EscalationConfig' AND d.tenantid = 'bo' AND d.isactive
     AND pg_temp.cumulative(ladders.l) IS DISTINCT FROM ladders.l;
  IF bad > 0 THEN RAISE EXCEPTION '% ladder(s) still not increasing', bad; END IF;
END $$;

COMMIT;

-- Undo (restores the copied row):
--   UPDATE eg_mdms_data d SET data = b.data, lastmodifiedtime = b.lastmodifiedtime
--     FROM eg_mdms_data_escalation_bak_20261028 b WHERE d.id = b.id;
