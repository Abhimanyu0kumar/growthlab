import { Injectable, OnModuleInit } from '@nestjs/common';
import mysql, { Pool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { encryptBuffer } from '../utils/crypto.util';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin@123';
const DB_NAME = process.env.DB_NAME || 'todo';
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

@Injectable()
export class DatabaseService implements OnModuleInit {
    private pool?: Pool;

    async onModuleInit() {
        await this.ensureStorageDirectories();
        await this.ensureDatabase();
        await this.ensureSchema();
    }

    private async ensureStorageDirectories() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
    }

    private async ensureDatabase() {
        const adminPool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0,
        });

        try {
            await adminPool.query('CREATE DATABASE IF NOT EXISTS `' + DB_NAME + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        } finally {
            await adminPool.end();
        }
    }

    private async addUserIdColumnIfNeeded(tableName: string) {
        const [columns]: any = await this.getPool().query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'userId'`,
            [DB_NAME, tableName]
        );
        if (columns.length === 0) {
            await this.getPool().query(`ALTER TABLE ${tableName} ADD COLUMN userId VARCHAR(64) NOT NULL DEFAULT '1'`);
        }
    }

    private async ensureSchema() {
        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        passwordHash VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        createdAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        // Migrate 'username' column to 'email' if it exists from previous run
        try {
            const [columns]: any = await this.getPool().query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`,
                [DB_NAME]
            );
            if (columns.length > 0) {
                await this.getPool().query('ALTER TABLE users CHANGE username email VARCHAR(100) NOT NULL UNIQUE');
            }
        } catch (err) {
            console.error('Failed to rename username column to email:', err);
        }

        // Migrate any legacy 'Abhimanyu' email values to 'abhimanyu@gmail.com'
        try {
            await this.getPool().query(
                "UPDATE users SET email = 'abhimanyu@gmail.com' WHERE LOWER(email) = 'abhimanyu'"
            );
        } catch (err) {
            console.error('Failed to update legacy email address:', err);
        }

        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS targets (
        id VARCHAR(64) PRIMARY KEY,
        type ENUM('daily','weekly','monthly','yearly') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS personality (
        id VARCHAR(64) PRIMARY KEY,
        type ENUM('habits','body_language','communication','clothing','fitness') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        color VARCHAR(32) NOT NULL DEFAULT 'green',
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        fileName VARCHAR(255) DEFAULT NULL,
        fileMimeType VARCHAR(255) DEFAULT NULL,
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS diary (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        date DATE NOT NULL,
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        // Check if users table is empty
        const [usersCount]: any = await this.getPool().query('SELECT COUNT(*) AS count FROM users');
        if (usersCount[0].count === 0) {
            // Check if legacy admin table has data
            let hasAdminData = false;
            try {
                const [adminRows]: any = await this.getPool().query('SELECT * FROM admin');
                if (adminRows.length > 0) {
                    hasAdminData = true;
                    for (const admin of adminRows) {
                        let email = admin.username;
                        if (email.toLowerCase() === 'abhimanyu') {
                            email = 'abhimanyu@gmail.com';
                        }
                        await this.getPool().query(
                            'INSERT IGNORE INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
                            [admin.id.toString(), email, admin.passwordHash, new Date().toISOString()]
                        );
                    }
                }
            } catch (err) {
                // admin table might not exist
            }

            if (!hasAdminData) {
                const defaultPasswordHash = await this.hashPassword('version');
                await this.getPool().query(
                    'INSERT IGNORE INTO users (id, email, passwordHash, createdAt) VALUES ("1", ?, ?, ?)',
                    ['abhimanyu@gmail.com', defaultPasswordHash, new Date().toISOString()],
                );
            }
        }

        // Add userId column if needed to other tables
        await this.addUserIdColumnIfNeeded('targets');
        await this.addUserIdColumnIfNeeded('personality');
        await this.addUserIdColumnIfNeeded('books');
        await this.addUserIdColumnIfNeeded('diary');

        // Add color column to personality if it doesn't exist
        try {
            const [columns]: any = await this.getPool().query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'personality' AND COLUMN_NAME = 'color'`,
                [DB_NAME]
            );
            if (columns.length === 0) {
                await this.getPool().query("ALTER TABLE personality ADD COLUMN color VARCHAR(32) NOT NULL DEFAULT 'green'");
            }
        } catch (err) {
            console.error('Failed to add color column to personality table:', err);
        }
    }

    private getPool() {
        if (!this.pool) {
            this.pool = mysql.createPool({
                host: DB_HOST,
                user: DB_USER,
                password: DB_PASSWORD,
                database: DB_NAME,
                waitForConnections: true,
                connectionLimit: 5,
                queueLimit: 0,
            });
        }
        return this.pool;
    }

    async query<T = any>(query: string, params: any[] = []): Promise<T> {
        const [rows]: any = await this.getPool().query(query, params);
        return rows as T;
    }

    async getAdmin() {
        const [rows]: any = await this.getPool().query('SELECT email AS username, passwordHash FROM users WHERE id = "1" LIMIT 1');
        return rows[0] ?? null;
    }

    async saveAdmin(username: string, passwordHash: string) {
        await this.getPool().query(
            'INSERT INTO users (id, email, passwordHash, createdAt) VALUES ("1", ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), passwordHash = VALUES(passwordHash)',
            [username, passwordHash, new Date().toISOString()],
        );
    }

    async getUserByEmail(email: string) {
        const [rows]: any = await this.getPool().query('SELECT id, email, passwordHash FROM users WHERE email = ? LIMIT 1', [email]);
        return rows[0] ?? null;
    }

    async getUserById(id: string) {
        const [rows]: any = await this.getPool().query('SELECT id, email, passwordHash FROM users WHERE id = ? LIMIT 1', [id]);
        return rows[0] ?? null;
    }

    async createUser(email: string, passwordHash: string) {
        const id = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
        await this.getPool().query(
            'INSERT INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
            [id, email, passwordHash, new Date().toISOString()]
        );
        return { id, email };
    }

    async updateUserProfile(id: string, email: string, passwordHash: string) {
        await this.getPool().query(
            'UPDATE users SET email = ?, passwordHash = ? WHERE id = ?',
            [email, passwordHash, id]
        );
    }

    async hashPassword(password: string) {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    }

    getUploadsPath(bookId: string) {
        return path.join(UPLOADS_DIR, `${bookId}.enc`);
    }

    async saveEncryptedFile(bookId: string, buffer: Buffer) {
        const filepath = this.getUploadsPath(bookId);
        const encrypted = encryptBuffer(buffer);
        await fs.promises.writeFile(filepath, encrypted);
    }

    async readEncryptedFile(bookId: string) {
        const filepath = this.getUploadsPath(bookId);
        if (!fs.existsSync(filepath)) return null;
        return fs.promises.readFile(filepath);
    }
}
