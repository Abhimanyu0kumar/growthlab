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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackerService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let TrackerService = class TrackerService {
    constructor(db) {
        this.db = db;
    }
    async getAll(userId) {
        const [targets, personality, books, diary] = await Promise.all([
            this.db.query('SELECT * FROM targets WHERE userId = ? ORDER BY createdAt DESC', [userId]),
            this.db.query('SELECT * FROM personality WHERE userId = ? ORDER BY createdAt DESC', [userId]),
            this.db.query('SELECT * FROM books WHERE userId = ? ORDER BY createdAt DESC', [userId]),
            this.db.query('SELECT * FROM diary WHERE userId = ? ORDER BY createdAt DESC', [userId]),
        ]);
        return { targets, personality, books, diary };
    }
    generateId() {
        return Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    }
    async performAction(userId, collection, action, item) {
        switch (collection) {
            case 'targets':
                return this.handleTargets(userId, action, item);
            case 'personality':
                return this.handlePersonality(userId, action, item);
            case 'books':
                return this.handleBooks(userId, action, item);
            case 'diary':
                return this.handleDiary(userId, action, item);
            default:
                throw new Error('Invalid collection');
        }
    }
    async handleTargets(userId, action, item) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const createdAt = item.createdAt || now;
            const id = this.generateId();
            await this.db.query('INSERT INTO targets (id, userId, type, title, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, item.type || 'daily', item.title || 'Untitled Target', item.description || '', item.status || 'in_progress', createdAt, now]);
        }
        else if (action === 'update') {
            const now = new Date().toISOString();
            await this.db.query('UPDATE targets SET type = ?, title = ?, description = ?, status = ?, createdAt = ?, updatedAt = ? WHERE id = ? AND userId = ?', [item.type, item.title, item.description, item.status, item.createdAt || now, now, item.id, userId]);
        }
        else if (action === 'delete') {
            await this.db.query('DELETE FROM targets WHERE id = ? AND userId = ?', [item.id, userId]);
        }
        return this.getAll(userId);
    }
    async handlePersonality(userId, action, item) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const createdAt = item.createdAt || now;
            const id = this.generateId();
            await this.db.query('INSERT INTO personality (id, userId, type, title, description, status, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, item.type || 'habits', item.title || 'Untitled Focused Trait', item.description || '', item.status || 'in_progress', item.color || 'green', createdAt, now]);
        }
        else if (action === 'update') {
            const now = new Date().toISOString();
            await this.db.query('UPDATE personality SET type = ?, title = ?, description = ?, status = ?, color = ?, createdAt = ?, updatedAt = ? WHERE id = ? AND userId = ?', [item.type, item.title, item.description, item.status, item.color || 'green', item.createdAt || now, now, item.id, userId]);
        }
        else if (action === 'delete') {
            await this.db.query('DELETE FROM personality WHERE id = ? AND userId = ?', [item.id, userId]);
        }
        return this.getAll(userId);
    }
    async handleBooks(userId, action, item) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const createdAt = item.createdAt || now;
            const id = this.generateId();
            await this.db.query('INSERT INTO books (id, userId, title, author, category, status, fileName, fileMimeType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, item.title || 'Untitled Book', item.author || 'Unknown Author', item.category || 'General', item.status || 'in_progress', item.fileName || null, item.fileMimeType || null, createdAt, now]);
        }
        else if (action === 'update') {
            const now = new Date().toISOString();
            await this.db.query('UPDATE books SET title = ?, author = ?, category = ?, status = ?, fileName = ?, fileMimeType = ?, createdAt = ?, updatedAt = ? WHERE id = ? AND userId = ?', [item.title, item.author, item.category, item.status, item.fileName || null, item.fileMimeType || null, item.createdAt || now, now, item.id, userId]);
        }
        else if (action === 'delete') {
            await this.db.query('DELETE FROM books WHERE id = ? AND userId = ?', [item.id, userId]);
        }
        return this.getAll(userId);
    }
    async handleDiary(userId, action, item) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const id = this.generateId();
            await this.db.query('INSERT INTO diary (id, userId, title, content, date, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, item.title || 'Untitled Entry', item.content || '', item.date || now.split('T')[0], item.status || 'in_progress', now, now]);
        }
        else if (action === 'update') {
            await this.db.query('UPDATE diary SET title = ?, content = ?, date = ?, status = ?, updatedAt = ? WHERE id = ? AND userId = ?', [item.title, item.content, item.date, item.status, new Date().toISOString(), item.id, userId]);
        }
        else if (action === 'delete') {
            await this.db.query('DELETE FROM diary WHERE id = ? AND userId = ?', [item.id, userId]);
        }
        return this.getAll(userId);
    }
};
exports.TrackerService = TrackerService;
exports.TrackerService = TrackerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TrackerService);
//# sourceMappingURL=tracker.service.js.map