import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readDb } from '@/lib/db';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const db = await readDb();

    // Verify username case-insensitively or exactly. The requirement says: username is Abhimanyu
    if (db.admin.username.toLowerCase() !== username.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password hash
    const isPasswordValid = bcrypt.compareSync(password, db.admin.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session cookie
    await createSession(db.admin.username);

    return NextResponse.json({
      success: true,
      username: db.admin.username,
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
