import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface SessionPayload {
    userId: string;
    email: string;
    expiresAt: number;
}

const SESSION_SECRET = process.env.APP_ENCRYPTION_KEY || 'default-secret-key-for-development-mode-only';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
    constructor(private readonly db: DatabaseService) { }

    async validateCredentials(email: string, password: string) {
        const user = await this.db.getUserByEmail(email);
        if (!user) return null;
        const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
        return isPasswordValid ? user : null;
    }

    async getAdmin() {
        return this.db.getAdmin();
    }

    async getUserById(userId: string) {
        return this.db.getUserById(userId);
    }

    async getUserByEmail(email: string) {
        return this.db.getUserByEmail(email);
    }

    async createUser(email: string, passwordHash: string) {
        return this.db.createUser(email, passwordHash);
    }

    async updateProfile(userId: string, email: string, passwordHash: string) {
        return this.db.updateUserProfile(userId, email, passwordHash);
    }

    async hashPassword(password: string) {
        return this.db.hashPassword(password);
    }

    createToken(userId: string, email: string) {
        const expiresAt = Date.now() + SESSION_EXPIRY_MS;
        const payload: SessionPayload = { userId, email, expiresAt };
        const serialized = JSON.stringify(payload);
        const iv = crypto.randomBytes(12);
        const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    verifyToken(token: string): SessionPayload | null {
        try {
            const [ivHex, authTagHex, encryptedHex] = token.split(':');
            if (!ivHex || !authTagHex || !encryptedHex) return null;
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const encrypted = Buffer.from(encryptedHex, 'hex');
            const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
            const payload = JSON.parse(decrypted) as SessionPayload;
            if (payload.expiresAt < Date.now()) return null;
            return payload;
        } catch {
            return null;
        }
    }
}
