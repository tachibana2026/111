import { supabase } from './supabase';

/**
 * クライアントサイド（管理画面）からOn-demand ISRをトリガーするためのユーティリティ
 */
export async function triggerRevalidate(paths = ['/', '/groups', '/lost-found', '/timetable']) {
  const groupId = typeof window !== 'undefined' ? localStorage.getItem('ryoun_group_id') : null;
  const password = typeof window !== 'undefined' ? localStorage.getItem('ryoun_password') : null;
  const authType = typeof window !== 'undefined' ? localStorage.getItem('ryoun_auth_type') : null;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // HQログインの場合はアクセストークンを付与
    if (authType === 'hq') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        paths,
        groupId,
        password,
        authType
      }),
    });


    const data = await response.json();

    if (!response.ok) {
      console.error('Revalidation failed:', data);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error triggering revalidation:', err);
    return false;
  }
}

