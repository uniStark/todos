import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/serverAuth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }
    
    const isValid = verifyPassword(password);
    
    if (isValid) {
      console.log('[Auth] User authenticated successfully');
      return NextResponse.json({ success: true });
    } else {
      console.log('[Auth] Invalid password attempt');
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[Auth] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
