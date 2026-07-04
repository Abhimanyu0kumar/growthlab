"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const SESSION_SECRET = process.env.APP_ENCRYPTION_KEY || 'default-secret-key-for-development-mode-only';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
let AuthService = class AuthService {
    constructor(db) {
        this.db = db;
    }
    async validateCredentials(username, password) {
        const admin = await this.db.getAdmin();
        if (!admin)
            return false;
        if (admin.username.toLowerCase() !== username.toLowerCase())
            return false;
        return bcryptjs_1.default.compareSync(password, admin.passwordHash);
    }
    async getAdmin() {
        return this.db.getAdmin();
    }
    async updateProfile(username, passwordHash) {
        return this.db.saveAdmin(username, passwordHash);
    }
    async hashPassword(password) {
        return this.db.hashPassword(password);
    }
    createToken(username) {
        const expiresAt = Date.now() + SESSION_EXPIRY_MS;
        const payload = { username, expiresAt };
        const serialized = JSON.stringify(payload);
        const iv = crypto_1.default.randomBytes(12);
        const key = crypto_1.default.createHash('sha256').update(SESSION_SECRET).digest();
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }
    verifyToken(token) {
        try {
            const [ivHex, authTagHex, encryptedHex] = token.split(':');
            if (!ivHex || !authTagHex || !encryptedHex)
                return null;
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const encrypted = Buffer.from(encryptedHex, 'hex');
            const key = crypto_1.default.createHash('sha256').update(SESSION_SECRET).digest();
            const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
            const payload = JSON.parse(decrypted);
            if (payload.expiresAt < Date.now())
                return null;
            return payload;
        }
        catch {
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthService);
//# sourceMappingURL=auth.service.js.map