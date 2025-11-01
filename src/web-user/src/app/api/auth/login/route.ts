import { NextRequest, NextResponse } from 'next/server';
import { generateToken, createAuthCookie } from '../../../../lib/auth';

// Valid team D users - in production this should be in a database
const validTeamDUsers = [
  { email: 'teamd@large-event.com' },
  { email: 'admin@teamd.local' },
  { email: 'member@teamd.local' }
];

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate user is authorized for Team D
    const isValidUser = validTeamDUsers.some(
      user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (!isValidUser) {
      return NextResponse.json({
        error: 'User not authorized for Team D portal'
      }, { status: 403 });
    }

    // Create user object
    const user = { email };

    // Generate token
    const token = generateToken(user);

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user,
      token
    });

    // Set HTTP-only cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    // Add CORS headers for cross-portal communication
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:4000');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}