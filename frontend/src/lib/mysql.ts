import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin@123';
const DB_NAME = process.env.DB_NAME || 'todo';

let pool: mysql.Pool;

async function ensureDatabaseExists() {
    const systemPool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: 'mysql',
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0,
    });

    try {
        await systemPool.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
    } finally {
        await systemPool.end();
    }
}

function getPool(): mysql.Pool {
    if (!pool) {
        pool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
        });
    }
    return pool;
}

export async function initMysqlDb() {
    await ensureDatabaseExists();

    const connection = await getPool().getConnection();
    try {
        await connection.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        passwordHash VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await connection.query(`
      CREATE TABLE IF NOT EXISTS targets (
        id VARCHAR(64) PRIMARY KEY,
        type ENUM('daily','weekly','monthly','yearly') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await connection.query(`
      CREATE TABLE IF NOT EXISTS personality (
        id VARCHAR(64) PRIMARY KEY,
        type ENUM('habits','body_language','communication','clothing','fitness') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        await connection.query(`
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

        await connection.query(`
      CREATE TABLE IF NOT EXISTS diary (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT DEFAULT '',
        date DATE NOT NULL,
        status ENUM('in_progress','paused','completed','incomplete') NOT NULL,
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        const [rows]: any = await connection.query('SELECT COUNT(*) AS count FROM admin');
        if (rows[0].count === 0) {
            await connection.query(
                'INSERT INTO admin (id, username, passwordHash) VALUES (1, ?, ?)',
                [
                    'Abhimanyu',
                    bcrypt.hashSync('version', bcrypt.genSaltSync(10)),
                ]
            );
        }
    } finally {
        connection.release();
    }
}

export { getPool };
