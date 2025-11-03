import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create user object and generate token
    const user = { email };
    const token = generateToken(user);

    const response = NextResponse.json({ token });

    // Add CORS headers for cross-portal communication
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:4000');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}