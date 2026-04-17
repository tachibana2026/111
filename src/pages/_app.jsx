import '../index.css';
import Layout from '../components/Layout';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

function MyApp({ Component, pageProps }) {
  // 管理画面（/admin など）ではデフォルトのLayoutを使わない場合などの分岐
  const isAdminPath = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/ryoun-hq-portal'));

  return (
    <Layout>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </Layout>
  );
}

export default MyApp;


