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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooksController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const database_service_1 = require("../database/database.service");
const auth_service_1 = require("../auth/auth.service");
const crypto_util_1 = require("../utils/crypto.util");
const SESSION_COOKIE_NAME = 'growth_tracker_session';
let BooksController = class BooksController {
    constructor(db, authService) {
        this.db = db;
        this.authService = authService;
    }
    async downloadBook(req, res, bookId) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!bookId) {
            return res.status(400).json({ error: 'Book ID is required' });
        }
        const [rows] = await this.db.query('SELECT fileName, fileMimeType, userId FROM books WHERE id = ? LIMIT 1', [bookId]);
        const book = rows[0];
        if (!book) {
            return res.status(404).json({ error: 'Book record not found' });
        }
        if (book.userId !== payload.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (!book.fileName) {
            return res.status(404).json({ error: 'Book file not found' });
        }
        const encryptedBuffer = await this.db.readEncryptedFile(bookId);
        if (!encryptedBuffer) {
            return res.status(404).json({ error: 'Book file does not exist on disk' });
        }
        const decryptedBuffer = (0, crypto_util_1.decryptBuffer)(encryptedBuffer);
        res.setHeader('Content-Type', book.fileMimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.fileName)}"`);
        res.setHeader('Content-Length', decryptedBuffer.length);
        return res.send(decryptedBuffer);
    }
    async uploadBook(req, res, file, bookId) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!file || !bookId) {
            return res.status(400).json({ error: 'File and Book ID are required' });
        }
        const [rows] = await this.db.query('SELECT id, userId FROM books WHERE id = ? LIMIT 1', [bookId]);
        const book = rows[0];
        if (!book) {
            return res.status(404).json({ error: 'Book record not found' });
        }
        if (book.userId !== payload.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await this.db.saveEncryptedFile(bookId, file.buffer);
        await this.db.query('UPDATE books SET fileName = ?, fileMimeType = ?, updatedAt = ? WHERE id = ?', [file.originalname, file.mimetype || 'application/octet-stream', new Date().toISOString(), bookId]);
        const [updatedRows] = await this.db.query('SELECT * FROM books WHERE id = ? LIMIT 1', [bookId]);
        return res.json({ success: true, book: updatedRows[0] });
    }
};
exports.BooksController = BooksController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], BooksController.prototype, "downloadBook", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('bookId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String]),
    __metadata("design:returntype", Promise)
], BooksController.prototype, "uploadBook", null);
exports.BooksController = BooksController = __decorate([
    (0, common_1.Controller)('books'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService, auth_service_1.AuthService])
], BooksController);
//# sourceMappingURL=books.controller.js.map