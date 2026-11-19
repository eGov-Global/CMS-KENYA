// Reads and writes ONLY additionaldetails->'priority' on eg_pgr_service_v2.
// The merge (||) keeps every other key in additionaldetails untouched.

import pg from 'pg';

export function createStore(dbCfg) {
  const pool = new pg.Pool(dbCfg);

  async function getPriority(tenantId, serviceRequestId) {
    const { rows } = await pool.query(
      `SELECT additionaldetails->>'priority' AS priority
         FROM eg_pgr_service_v2
        WHERE servicerequestid = $1 AND tenantid = $2`,
      [serviceRequestId, tenantId],
    );
    if (rows.length === 0) return { exists: false, priority: null };
    return { exists: true, priority: rows[0].priority };
  }

  // Returns true if the row existed and was updated.
  async function setPriority(tenantId, serviceRequestId, level) {
    const { rowCount } = await pool.query(
      `UPDATE eg_pgr_service_v2
          SET additionaldetails = COALESCE(additionaldetails, '{}'::jsonb) || jsonb_build_object('priority', $1::text)
        WHERE servicerequestid = $2 AND tenantid = $3`,
      [level, serviceRequestId, tenantId],
    );
    return rowCount > 0;
  }

  async function ping() {
    await pool.query('SELECT 1');
  }

  return { getPriority, setPriority, ping, close: () => pool.end() };
}
