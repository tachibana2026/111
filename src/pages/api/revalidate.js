import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  // 1. Check for secret in query (for backward compatibility/internal)
  let isAuthorized = req.query.secret === process.env.REVALIDATE_SECRET;

  const { paths, groupId, password, authType } = req.body;

  // 2. If not authorized by secret, check by credentials or session
  if (!isAuthorized) {
    if (authType === 'hq') {
      // HQ user check: Verify Supabase Auth session
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        req.headers.authorization?.replace('Bearer ', '') || ''
      );
      if (!authError && user) isAuthorized = true;
    } else if (authType === 'group' && groupId && password) {
      // Group user check: Verify password against database
      const { data, error } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .eq('password', password)
        .single();
      
      if (!error && data) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json({ message: 'Paths array is required' });
    }

    // Revalidate each path
    const results = [];
    const errors = [];

    for (const path of paths) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Development mode: skipping revalidation for path "${path}"`);
          results.push({ path, success: true, message: 'Skipped in development' });
          continue;
        }

        await res.revalidate(path);
        results.push({ path, success: true });
      } catch (err) {
        console.error(`Error revalidating path "${path}":`, err);
        errors.push({ path, error: err.message || String(err) });
        results.push({ path, success: false, error: err.message || String(err) });
      }
    }

    if (errors.length > 0) {
      return res.status(500).json({ 
        message: 'Partial or total revalidation failure', 
        results,
        errors 
      });
    }

    return res.json({ revalidated: true, results });
  } catch (err) {
    console.error('Global revalidation error:', err);
    return res.status(500).json({ message: 'Error revalidating', error: err.message });
  }
}

