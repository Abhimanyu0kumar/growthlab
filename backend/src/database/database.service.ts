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

    private async ensureSchema() {
        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        passwordHash VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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

        const [rows]: any = await this.getPool().query('SELECT COUNT(*) AS count FROM admin');
        if (rows[0].count === 0) {
            const defaultPasswordHash = await this.hashPassword('version');
            await this.getPool().query(
                'INSERT INTO admin (id, username, passwordHash) VALUES (1, ?, ?)',
                ['Abhimanyu', defaultPasswordHash],
            );
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
        const [rows]: any = await this.getPool().query('SELECT username, passwordHash FROM admin WHERE id = 1 LIMIT 1');
        return rows[0] ?? null;
    }

    async saveAdmin(username: string, passwordHash: string) {
        await this.getPool().query(
            'INSERT INTO admin (id, username, passwordHash) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), passwordHash = VALUES(passwordHash)',
            [username, passwordHash],
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
