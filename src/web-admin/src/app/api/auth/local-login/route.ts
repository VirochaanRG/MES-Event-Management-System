import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'teamd-local-secret';

// Local TeamD users for development
const teamDUsers = [
  { id: 1, email: 'teamd@local.dev' },
  { id: 2, email: 'dev@teamd.local' },
  { id: 3, email: 'test@teamd.dev' },
  { id: 4, email: 'admin@teamd.local' },
  { id: 5, email: 'member@teamd.dev' }
];

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists in TeamD local users
    const user = teamDUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User not authorized for TeamD local development' }, { status: 401 });
    }

    // Generate token for local auth
    const token = jwt.sign({ user, source: 'teamd-local' }, JWT_SECRET, { expiresIn: '8h' });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      token,
      source: 'teamd-local'
    });
  } catch (error) {
    console.error('Local login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}