import { Body, Controller, Get, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response, Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { AuthService } from '../auth/auth.service';
import { decryptBuffer } from '../utils/crypto.util';

const SESSION_COOKIE_NAME = 'growth_tracker_session';

@Controller('books')
export class BooksController {
    constructor(private readonly db: DatabaseService, private readonly authService: AuthService) { }

    @Get()
    async downloadBook(@Req() req: Request, @Res() res: Response, @Query('id') bookId: string) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        if (!token || !this.authService.verifyToken(token)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!bookId) {
            return res.status(400).json({ error: 'Book ID is required' });
        }

        const [rows]: any = await this.db.query('SELECT fileName, fileMimeType FROM books WHERE id = ? LIMIT 1', [bookId]);
        const book = rows[0];
        if (!book || !book.fileName) {
            return res.status(404).json({ error: 'Book file not found' });
        }

        const encryptedBuffer = await this.db.readEncryptedFile(bookId);
        if (!encryptedBuffer) {
            return res.status(404).json({ error: 'Book file does not exist on disk' });
        }

        const decryptedBuffer = decryptBuffer(encryptedBuffer);

        res.setHeader('Content-Type', book.fileMimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.fileName)}"`);
        res.setHeader('Content-Length', decryptedBuffer.length);
        return res.send(decryptedBuffer);
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    async uploadBook(
        @Req() req: Request,
        @Res() res: Response,
        @UploadedFile() file: Express.Multer.File,
        @Body('bookId') bookId: string,
    ) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        if (!token || !this.authService.verifyToken(token)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!file || !bookId) {
            return res.status(400).json({ error: 'File and Book ID are required' });
        }

        const [rows]: any = await this.db.query('SELECT id FROM books WHERE id = ? LIMIT 1', [bookId]);
        if (!rows[0]) {
            return res.status(404).json({ error: 'Book record not found' });
        }

        await this.db.saveEncryptedFile(bookId, file.buffer);
        await this.db.query(
            'UPDATE books SET fileName = ?, fileMimeType = ?, updatedAt = ? WHERE id = ?',
            [file.originalname, file.mimetype || 'application/octet-stream', new Date().toISOString(), bookId],
        );

        const [updatedRows]: any = await this.db.query('SELECT * FROM books WHERE id = ? LIMIT 1', [bookId]);
        return res.json({ success: true, book: updatedRows[0] });
    }
}
