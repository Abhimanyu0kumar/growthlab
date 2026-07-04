import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
    let rawKey = process.env.APP_ENCRYPTION_KEY;
    if (!rawKey) {
        try {
            const envPath = path.join(process.cwd(), '.env.local');
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf8');
                const match = content.match(/APP_ENCRYPTION_KEY=([a-f0-9]+)/i);
                if (match && match[1]) {
                    rawKey = match[1];
                }
            }
        } catch {
            // ignore
        }
    }
    const key = rawKey || 'default-secret-key-for-development-mode-only';
    return crypto.createHash('sha256').update(key).digest();
}

export function encryptBuffer(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const header = Buffer.alloc(8);
    header.writeUInt32BE(iv.length, 0);
    header.writeUInt32BE(authTag.length, 4);
    return Buffer.concat([header, iv, authTag, encrypted]);
}

export function decryptBuffer(packedBuffer: Buffer): Buffer {
    const ivLength = packedBuffer.readUInt32BE(0);
    const authTagLength = packedBuffer.readUInt32BE(4);
    const iv = packedBuffer.subarray(8, 8 + ivLength);
    const authTag = packedBuffer.subarray(8 + ivLength, 8 + ivLength + authTagLength);
    const encrypted = packedBuffer.subarray(8 + ivLength + authTagLength);
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
