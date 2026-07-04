import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import { readDb, writeDb, Target, PersonalityItem, Book, DiaryEntry, UPLOADS_DIR } from '@/lib/db';

// Helper to generate a random ID
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function GET() {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await readDb();
    
    // Return all collections, omit admin password
    return NextResponse.json({
      targets: db.targets || [],
      personality: db.personality || [],
      books: db.books || [],
      diary: db.diary || []
    });
  } catch (error) {
    console.error('Database GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, collection, item } = await request.json();

    if (!action || !collection || !item) {
      return NextResponse.json({ error: 'Missing parameters: action, collection, and item are required' }, { status: 400 });
    }

    const db = await readDb();
    const now = new Date().toISOString();

    if (collection === 'targets') {
      if (action === 'create') {
        const newItem: Target = {
          id: generateId(),
          type: item.type,
          title: item.title || 'Untitled Target',
          description: item.description || '',
          status: item.status || 'in_progress',
          createdAt: item.createdAt || now,
          updatedAt: now
        };
        db.targets = db.targets || [];
        db.targets.push(newItem);
      } else if (action === 'update') {
        db.targets = db.targets || [];
        const index = db.targets.findIndex(x => x.id === item.id);
        if (index === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        
        db.targets[index] = {
          ...db.targets[index],
          title: item.title !== undefined ? item.title : db.targets[index].title,
          description: item.description !== undefined ? item.description : db.targets[index].description,
          status: item.status !== undefined ? item.status : db.targets[index].status,
          type: item.type !== undefined ? item.type : db.targets[index].type,
          createdAt: item.createdAt !== undefined ? item.createdAt : db.targets[index].createdAt,
          updatedAt: now
        };
      } else if (action === 'delete') {
        db.targets = db.targets || [];
        db.targets = db.targets.filter(x => x.id !== item.id);
      }
    } 
    
    else if (collection === 'personality') {
      if (action === 'create') {
        const newItem: PersonalityItem = {
          id: generateId(),
          type: item.type,
          title: item.title || 'Untitled Focused Trait',
          description: item.description || '',
          status: item.status || 'in_progress',
          color: item.color || 'green',
          createdAt: item.createdAt || now,
          updatedAt: now
        };
        db.personality = db.personality || [];
        db.personality.push(newItem);
      } else if (action === 'update') {
        db.personality = db.personality || [];
        const index = db.personality.findIndex(x => x.id === item.id);
        if (index === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        
        db.personality[index] = {
          ...db.personality[index],
          title: item.title !== undefined ? item.title : db.personality[index].title,
          description: item.description !== undefined ? item.description : db.personality[index].description,
          status: item.status !== undefined ? item.status : db.personality[index].status,
          type: item.type !== undefined ? item.type : db.personality[index].type,
          color: item.color !== undefined ? item.color : db.personality[index].color,
          createdAt: item.createdAt !== undefined ? item.createdAt : db.personality[index].createdAt,
          updatedAt: now
        };
      } else if (action === 'delete') {
        db.personality = db.personality || [];
        db.personality = db.personality.filter(x => x.id !== item.id);
      }
    } 
    
    else if (collection === 'books') {
      if (action === 'create') {
        const newItem: Book = {
          id: generateId(),
          title: item.title || 'Untitled Book',
          author: item.author || 'Unknown Author',
          category: item.category || 'General',
          status: item.status || 'in_progress',
          fileName: item.fileName || null,
          fileMimeType: item.fileMimeType || null,
          createdAt: item.createdAt || now,
          updatedAt: now
        };
        db.books = db.books || [];
        db.books.push(newItem);
      } else if (action === 'update') {
        db.books = db.books || [];
        const index = db.books.findIndex(x => x.id === item.id);
        if (index === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        
        db.books[index] = {
          ...db.books[index],
          title: item.title !== undefined ? item.title : db.books[index].title,
          author: item.author !== undefined ? item.author : db.books[index].author,
          category: item.category !== undefined ? item.category : db.books[index].category,
          status: item.status !== undefined ? item.status : db.books[index].status,
          fileName: item.fileName !== undefined ? item.fileName : db.books[index].fileName,
          fileMimeType: item.fileMimeType !== undefined ? item.fileMimeType : db.books[index].fileMimeType,
          createdAt: item.createdAt !== undefined ? item.createdAt : db.books[index].createdAt,
          updatedAt: now
        };
      } else if (action === 'delete') {
        db.books = db.books || [];
        const bookToDelete = db.books.find(x => x.id === item.id);
        if (bookToDelete) {
          // If there is an encrypted file attached, delete it
          const filepath = path.join(UPLOADS_DIR, `${bookToDelete.id}.enc`);
          if (fs.existsSync(filepath)) {
            try {
              fs.unlinkSync(filepath);
            } catch (err) {
              console.error(`Failed to delete encrypted file for book ${bookToDelete.id}:`, err);
            }
          }
        }
        db.books = db.books.filter(x => x.id !== item.id);
      }
    } 
    
    else if (collection === 'diary') {
      if (action === 'create') {
        const newItem: DiaryEntry = {
          id: generateId(),
          title: item.title || 'Untitled Entry',
          content: item.content || '',
          date: item.date || now.split('T')[0],
          status: item.status || 'in_progress',
          createdAt: now,
          updatedAt: now
        };
        db.diary = db.diary || [];
        db.diary.push(newItem);
      } else if (action === 'update') {
        db.diary = db.diary || [];
        const index = db.diary.findIndex(x => x.id === item.id);
        if (index === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        
        db.diary[index] = {
          ...db.diary[index],
          title: item.title !== undefined ? item.title : db.diary[index].title,
          content: item.content !== undefined ? item.content : db.diary[index].content,
          date: item.date !== undefined ? item.date : db.diary[index].date,
          status: item.status !== undefined ? item.status : db.diary[index].status,
          updatedAt: now
        };
      } else if (action === 'delete') {
        db.diary = db.diary || [];
        db.diary = db.diary.filter(x => x.id !== item.id);
      }
    } 
    
    else {
      return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      targets: db.targets || [],
      personality: db.personality || [],
      books: db.books || [],
      diary: db.diary || []
    });
  } catch (error) {
    console.error('Database POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
