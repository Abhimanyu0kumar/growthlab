import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Get or derive the key, falling back to reading .env.local file directly from disk
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
    } catch (e) {
      // Ignore reading errors
    }
  }
  const key = rawKey || 'default-secret-key-for-development-mode-only';
  return crypto.createHash('sha256').update(key).digest();
}

const ENCRYPTION_KEY = getEncryptionKey();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts a plain text string to an encrypted hex string.
 * Format: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted hex string back to a plain text string.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Decryption Failed - Invalid Key or Corrupted Data]';
  }
}

/**
 * Encrypts a binary buffer.
 * Format: [4 bytes iv len][4 bytes auth tag len][iv][auth tag][ciphertext]
 */
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

/**
 * Decrypts a packed binary buffer.
 */
export function decryptBuffer(packedBuffer: Buffer): Buffer {
  try {
    const ivLength = packedBuffer.readUInt32BE(0);
    const authTagLength = packedBuffer.readUInt32BE(4);
    
    const iv = packedBuffer.subarray(8, 8 + ivLength);
    const authTag = packedBuffer.subarray(8 + ivLength, 8 + ivLength + authTagLength);
    const encrypted = packedBuffer.subarray(8 + ivLength + authTagLength);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (error) {
    console.error('Buffer decryption failed:', error);
    throw new Error('File decryption failed - key mismatch or corrupted file');
  }
}
