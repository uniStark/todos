import { NextResponse } from 'next/server';

// 预设密码，可通过环境变量 AUTH_PASSWORD 配置
// 默认密码: stark123
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'stark123';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }
    
    const isValid = password === AUTH_PASSWORD;
    
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
