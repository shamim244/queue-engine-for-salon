import type mysql from 'mysql2/promise';

export interface Migration {
  name: string;
  up: (db: mysql.Pool) => Promise<void>;
  down?: (db: mysql.Pool) => Promise<void>;
}
