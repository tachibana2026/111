import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { path, token } = await request.json();

    // Verify revalidation token (set this in Vercel environment variables)
    if (token !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (path) {
      // Revalidate a specific path (e.g., "/", "/groups")
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path, now: Date.now() });
    } else {
      // Revalidate all public pages if no path specified
      revalidatePath('/', 'layout');
      return NextResponse.json({ revalidated: true, all: true, now: Date.now() });
    }
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}
