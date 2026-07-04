import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { readDb, writeDb } from '@/lib/db';

export async function GET() {
  const username = await getSession();
  if (!username) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  
  const db = await readDb();
  const isDefaultPassword = bcrypt.compareSync('version', db.admin.passwordHash);

  return NextResponse.json({ authenticated: true, username, isDefaultPassword });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, newUsername } = await request.json();

    if (!currentPassword || (!newPassword && !newUsername)) {
      return NextResponse.json(
        { error: 'Current password and either a new password or username are required' },
        { status: 400 }
      );
    }

    const db = await readDb();

    // Verify current password
    const isPasswordValid = bcrypt.compareSync(currentPassword, db.admin.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect current password' },
        { status: 400 }
      );
    }

    // Update username if provided
    if (newUsername && newUsername.trim()) {
      db.admin.username = newUsername.trim();
    }

    // Update password if provided
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: 'New password must be at least 4 characters long' },
          { status: 400 }
        );
      }
      const salt = bcrypt.genSaltSync(10);
      db.admin.passwordHash = bcrypt.hashSync(newPassword.trim(), salt);
    }

    await writeDb(db);

    return NextResponse.json({ success: true, username: db.admin.username });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
