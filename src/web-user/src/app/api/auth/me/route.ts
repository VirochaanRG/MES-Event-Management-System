import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookie, verifyToken } from '../../../../lib/auth';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'));

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const response = NextResponse.json({ user });

    // Add CORS headers for cross-portal communication
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:4000');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}