import mysql from 'mysql2/promise';
import { config } from '../config';
import { migrate } from './migrator';

let pool: mysql.Pool | null = null;
export let isMySqlConnected = false;

export async function initDatabase(options: { skipAutoMigrate?: boolean } = {}): Promise<boolean> {
  try {
    // 1. Initial connection to verify server & create database
    try {
      const tempConnection = await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        ssl: (config.db as any).ssl,
      });

      await tempConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await tempConnection.end();
    } catch (tempErr: any) {
      // In cloud databases like TiDB, CREATE DATABASE might be restricted or already exists
      console.log(`[MySQL 8.0 Note] Pre-pool check: ${tempErr.message}`);
    }

    // 2. Create the real connection pool
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: (config.db as any).ssl,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: 'Z',
    });

    // Test real connectivity before declaring MySQL active
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    // 3. Ensure migrations table exists and auto-apply migrations on server startup unless skipped
    if (!options.skipAutoMigrate) {
      await runMigrations();
    }

    isMySqlConnected = true;
    console.log(`[MySQL 8.0] Successfully connected to '${config.db.database}' at ${config.db.host}:${config.db.port}`);
    return true;
  } catch (err: any) {
    if (pool) {
      try { await pool.end(); } catch {}
      pool = null;
    }
    console.warn(`[MySQL 8.0 Warning] Could not connect to MySQL: ${err.message}`);
    console.warn(`[Engine Que System] Operating with resilient In-Memory Store. (Update DB_PASSWORD in .env when ready).`);
    isMySqlConnected = false;
    return false;
  }
}

async function runMigrations() {
  if (!pool) return;
  try {
    await migrate(pool);
  } catch (err: any) {
    console.error(`[MySQL 8.0 Migration Error] ${err.message}`);
  }
}

export function getDb(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized.');
  }
  return pool;
}
