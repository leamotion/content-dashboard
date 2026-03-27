import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

// Reuse pool across hot-reloads in development
if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}

export default pool;
