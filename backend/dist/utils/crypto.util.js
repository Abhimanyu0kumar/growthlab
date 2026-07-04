"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
function getEncryptionKey() {
    let rawKey = process.env.APP_ENCRYPTION_KEY;
    if (!rawKey) {
        try {
            const envPath = path_1.default.join(process.cwd(), '.env.local');
            if (fs_1.default.existsSync(envPath)) {
                const content = fs_1.default.readFileSync(envPath, 'utf8');
                const match = content.match(/APP_ENCRYPTION_KEY=([a-f0-9]+)/i);
                if (match && match[1]) {
                    rawKey = match[1];
                }
            }
        }
        catch {
            // ignore
        }
    }
    const key = rawKey || 'default-secret-key-for-development-mode-only';
    return crypto_1.default.createHash('sha256').update(key).digest();
}
function encryptBuffer(buffer) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const header = Buffer.alloc(8);
    header.writeUInt32BE(iv.length, 0);
    header.writeUInt32BE(authTag.length, 4);
    return Buffer.concat([header, iv, authTag, encrypted]);
}
function decryptBuffer(packedBuffer) {
    const ivLength = packedBuffer.readUInt32BE(0);
    const authTagLength = packedBuffer.readUInt32BE(4);
    const iv = packedBuffer.subarray(8, 8 + ivLength);
    const authTag = packedBuffer.subarray(8 + ivLength, 8 + ivLength + authTagLength);
    const encrypted = packedBuffer.subarray(8 + ivLength + authTagLength);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
//# sourceMappingURL=crypto.util.js.map