/**
 * クライアントサイド（管理画面）からOn-demand ISRをトリガーするためのユーティリティ
 */
export async function triggerRevalidate(paths = ['/', '/groups', '/lost-found', '/timetable']) {
  try {
    const response = await fetch('/api/revalidate?secret=tachibana2026-revalidate-secret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      console.error('Revalidation failed:', await response.text());
      return false;
    }

    const data = await response.json();
    return true;
  } catch (err) {
    console.error('Error triggering revalidation:', err);
    return false;
  }
}
