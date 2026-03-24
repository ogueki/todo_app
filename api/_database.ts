import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export const db = {
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const { rows } = await pool.query(sql, params);
    return rows as T[];
  },

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    const { rows } = await pool.query(sql, params);
    return rows[0] as T | undefined;
  },

  async run(sql: string, params?: any[]): Promise<{ rowCount: number }> {
    const { rowCount } = await pool.query(sql, params);
    return { rowCount: rowCount ?? 0 };
  },
};

export default db;
