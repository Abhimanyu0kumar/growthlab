import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TrackerService {
    constructor(private readonly db: DatabaseService) { }

    async getAll() {
        const [targets, personality, books, diary] = await Promise.all([
            this.db.query('SELECT * FROM targets ORDER BY createdAt DESC'),
            this.db.query('SELECT * FROM personality ORDER BY createdAt DESC'),
            this.db.query('SELECT * FROM books ORDER BY createdAt DESC'),
            this.db.query('SELECT * FROM diary ORDER BY createdAt DESC'),
        ]);

        return { targets, personality, books, diary };
    }

    private generateId() {
        return Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    }

    async performAction(collection: string, action: string, item: any) {
        switch (collection) {
            case 'targets':
                return this.handleTargets(action, item);
            case 'personality':
                return this.handlePersonality(action, item);
            case 'books':
                return this.handleBooks(action, item);
            case 'diary':
                return this.handleDiary(action, item);
            default:
                throw new Error('Invalid collection');
        }
    }

    private async handleTargets(action: string, item: any) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const createdAt = item.createdAt || now;
            const id = this.generateId();
            await this.db.query(
                'INSERT INTO targets (id, type, title, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, item.type || 'daily', item.title || 'Untitled Target', item.description || '', item.status || 'in_progress', createdAt, now],
            );
        } else if (action === 'update') {
            const now = new Date().toISOString();
            await this.db.query(
                'UPDATE targets SET type = ?, title = ?, description = ?, status = ?, createdAt = ?, updatedAt = ? WHERE id = ?',
                [item.type, item.title, item.description, item.status, item.createdAt || now, now, item.id],
            );
        } else if (action === 'delete') {
            await this.db.query('DELETE FROM targets WHERE id = ?', [item.id]);
        }
        return this.getAll();
    }

    private async handlePersonality(action: string, item: any) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const createdAt = item.createdAt || now;
            const id = this.generateId();
            await this.db.query(
                'INSERT INTO personality (id, type, title, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, item.type || 'habits', item.title || 'Untitled Focused Trait', item.description || '', item.status || 'in_progress', createdAt, now],
            );
        } else if (action === 'update') {
            const now = new Date().toISOString();
            await this.db.query(
                'UPDATE personality SET type = ?, title = ?, description = ?, status = ?, createdAt = ?, updatedAt = ? WHERE id = ?',
                [item.type, item.title, item.description, item.status, item.createdAt || now, now, item.id],
            );
        } else if (action === 'delete') {
            await this.db.query('DELETE FROM personality WHERE id = ?', [item.id]);
        }
        return this.getAll();
    }

    private async handleBooks(action: string, item: any) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const createdAt = item.createdAt || now;
            const id = this.generateId();
            await this.db.query(
                'INSERT INTO books (id, title, author, category, status, fileName, fileMimeType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, item.title || 'Untitled Book', item.author || 'Unknown Author', item.category || 'General', item.status || 'in_progress', item.fileName || null, item.fileMimeType || null, createdAt, now],
            );
        } else if (action === 'update') {
            const now = new Date().toISOString();
            await this.db.query(
                'UPDATE books SET title = ?, author = ?, category = ?, status = ?, fileName = ?, fileMimeType = ?, createdAt = ?, updatedAt = ? WHERE id = ?',
                [item.title, item.author, item.category, item.status, item.fileName || null, item.fileMimeType || null, item.createdAt || now, now, item.id],
            );
        } else if (action === 'delete') {
            await this.db.query('DELETE FROM books WHERE id = ?', [item.id]);
        }
        return this.getAll();
    }

    private async handleDiary(action: string, item: any) {
        if (action === 'create') {
            const now = new Date().toISOString();
            const id = this.generateId();
            await this.db.query(
                'INSERT INTO diary (id, title, content, date, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, item.title || 'Untitled Entry', item.content || '', item.date || now.split('T')[0], item.status || 'in_progress', now, now],
            );
        } else if (action === 'update') {
            await this.db.query(
                'UPDATE diary SET title = ?, content = ?, date = ?, status = ?, updatedAt = ? WHERE id = ?',
                [item.title, item.content, item.date, item.status, new Date().toISOString(), item.id],
            );
        } else if (action === 'delete') {
            await this.db.query('DELETE FROM diary WHERE id = ?', [item.id]);
        }
        return this.getAll();
    }
}
