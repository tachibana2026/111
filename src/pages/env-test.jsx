import { useState, useEffect } from 'react';

export default function EnvTest() {
  const [env, setEnv] = useState({ url: 'loading...', key: 'loading...' });

  useEffect(() => {
    setEnv({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT FOUND',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'FOUND (OMITTED)' : 'NOT FOUND'
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variable Test</h1>
      <p><strong>URL:</strong> {env.url}</p>
      <p><strong>Key:</strong> {env.key}</p>
      <hr />
      <p>もしここが NOT FOUND や placeholder になっている場合、Vercel側の設定が絶対に間違っています。</p>
    </div>
  );
}
