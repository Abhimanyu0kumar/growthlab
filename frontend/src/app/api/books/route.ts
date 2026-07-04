import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import { readDb, writeDb, UPLOADS_DIR } from '@/lib/db';
import { encryptBuffer, decryptBuffer } from '@/lib/crypto';

// GET: Download / Stream decrypted book file
export async function GET(request: Request) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('id');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const db = await readDb();
    const book = db.books?.find(x => x.id === bookId);

    if (!book || !book.fileName) {
      return NextResponse.json({ error: 'Book file not found' }, { status: 404 });
    }

    const filepath = path.join(UPLOADS_DIR, `${bookId}.enc`);
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Book file does not exist on disk' }, { status: 404 });
    }

    // Read encrypted file
    const encryptedBuffer = await fs.promises.readFile(filepath);
    
    // Decrypt file
    const decryptedBuffer = decryptBuffer(encryptedBuffer);

    // Stream the response back
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', book.fileMimeType || 'application/octet-stream');
    responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(book.fileName)}"`);
    responseHeaders.set('Content-Length', decryptedBuffer.length.toString());

    return new Response(decryptedBuffer as any, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Book GET API error:', error);
    return NextResponse.json({ error: 'Internal server error during download' }, { status: 500 });
  }
}

// POST: Upload and encrypt book file
export async function POST(request: Request) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bookId = formData.get('bookId') as string | null;

    if (!file || !bookId) {
      return NextResponse.json({ error: 'File and Book ID are required' }, { status: 400 });
    }

    const db = await readDb();
    const bookIndex = db.books?.findIndex(x => x.id === bookId);

    if (bookIndex === -1 || db.books === undefined) {
      return NextResponse.json({ error: 'Book record not found' }, { status: 404 });
    }

    // Convert file to ArrayBuffer, then Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Encrypt the buffer
    const encryptedBuffer = encryptBuffer(fileBuffer);

    // Write encrypted buffer to disk
    const filepath = path.join(UPLOADS_DIR, `${bookId}.enc`);
    await fs.promises.writeFile(filepath, encryptedBuffer);

    // Update book metadata in database
    db.books[bookIndex] = {
      ...db.books[bookIndex],
      fileName: file.name,
      fileMimeType: file.type || 'application/octet-stream',
      updatedAt: new Date().toISOString()
    };

    await writeDb(db);

    return NextResponse.json({
      success: true,
      book: db.books[bookIndex]
    });
  } catch (error) {
    console.error('Book POST API error:', error);
    return NextResponse.json({ error: 'Internal server error during upload' }, { status: 500 });
  }
}
