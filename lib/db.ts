import { Client } from 'pg';

// Serverless-safe: fresh client per request.
// Vercel functions are short-lived — a pool doesn't survive between invocations
// and can exhaust Supabase's direct connection limit.
export async function getClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  return client;
}
