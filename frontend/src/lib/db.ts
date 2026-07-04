import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getPool, initMysqlDb } from './mysql';

const DB_DIR = path.join(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DB_DIR, 'uploads');

// Types
export interface AdminUser {
  username: string;
  passwordHash: string;
}

export interface Target {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  title: string;
  description: string;
  status: 'in_progress' | 'paused' | 'completed' | 'incomplete';
  createdAt: string;
  updatedAt: string;
}

export interface PersonalityItem {
  id: string;
  type: 'habits' | 'body_language' | 'communication' | 'clothing' | 'fitness';
  title: string;
  description: string;
  status: 'in_progress' | 'paused' | 'completed' | 'incomplete';
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'in_progress' | 'paused' | 'completed' | 'incomplete';
  fileName: string | null;
  fileMimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  status: 'in_progress' | 'paused' | 'completed' | 'incomplete';
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  admin: AdminUser;
  targets: Target[];
  personality: PersonalityItem[];
  books: Book[];
  diary: DiaryEntry[];
}

const DEFAULT_ADMIN_USERNAME = 'Abhimanyu';
const DEFAULT_ADMIN_PASSWORD = 'version';

function normalizeDateValue(value: any): string {
  if (value == null) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString();
}

export async function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  await initMysqlDb();
}

export async function readDb(): Promise<DatabaseSchema> {
  await initDb();
  const pool = getPool();

  const [adminRows]: any = await pool.query('SELECT username, passwordHash FROM admin LIMIT 1');
  const [targetRows]: any = await pool.query('SELECT * FROM targets');
  const [personalityRows]: any = await pool.query('SELECT * FROM personality');
  const [bookRows]: any = await pool.query('SELECT * FROM books');
  const [diaryRows]: any = await pool.query('SELECT * FROM diary');

  const adminRow = adminRows[0];

  return {
    admin: {
      username: adminRow?.username ?? DEFAULT_ADMIN_USERNAME,
      passwordHash: adminRow?.passwordHash ?? bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, bcrypt.genSaltSync(10)),
    },
    targets: targetRows.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      createdAt: normalizeDateValue(row.createdAt),
      updatedAt: normalizeDateValue(row.updatedAt),
    })),
    personality: personalityRows.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      createdAt: normalizeDateValue(row.createdAt),
      updatedAt: normalizeDateValue(row.updatedAt),
    })),
    books: bookRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      category: row.category,
      status: row.status,
      fileName: row.fileName,
      fileMimeType: row.fileMimeType,
      createdAt: normalizeDateValue(row.createdAt),
      updatedAt: normalizeDateValue(row.updatedAt),
    })),
    diary: diaryRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      status: row.status,
      createdAt: normalizeDateValue(row.createdAt),
      updatedAt: normalizeDateValue(row.updatedAt),
    })),
  };
}

export async function writeDb(schema: DatabaseSchema): Promise<void> {
  await initDb();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM targets');
    await connection.query('DELETE FROM personality');
    await connection.query('DELETE FROM books');
    await connection.query('DELETE FROM diary');

    for (const target of schema.targets || []) {
      await connection.query(
        'INSERT INTO targets (id, type, title, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [target.id, target.type, target.title, target.description, target.status, target.createdAt, target.updatedAt]
      );
    }

    for (const personality of schema.personality || []) {
      await connection.query(
        'INSERT INTO personality (id, type, title, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [personality.id, personality.type, personality.title, personality.description, personality.status, personality.createdAt, personality.updatedAt]
      );
    }

    for (const book of schema.books || []) {
      await connection.query(
        'INSERT INTO books (id, title, author, category, status, fileName, fileMimeType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [book.id, book.title, book.author, book.category, book.status, book.fileName, book.fileMimeType, book.createdAt, book.updatedAt]
      );
    }

    for (const diary of schema.diary || []) {
      await connection.query(
        'INSERT INTO diary (id, title, content, date, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [diary.id, diary.title, diary.content, diary.date, diary.status, diary.createdAt, diary.updatedAt]
      );
    }

    await connection.query(
      'INSERT INTO admin (id, username, passwordHash) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), passwordHash = VALUES(passwordHash)',
      [schema.admin.username, schema.admin.passwordHash]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Failed to write database:', error);
    throw new Error('Database write failed');
  } finally {
    connection.release();
  }
}
