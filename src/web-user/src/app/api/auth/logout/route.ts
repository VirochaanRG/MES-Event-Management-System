import { NextResponse } from 'next/server';
import { clearAuthCookie } from '../../../../lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // Clear the authentication cookie
    response.headers.set('Set-Cookie', clearAuthCookie());

    // Add CORS headers for cross-portal communication
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:4000');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}