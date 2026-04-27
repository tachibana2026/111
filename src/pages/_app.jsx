import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import '../index.css';
import Layout from '../components/Layout';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import * as gtag from '../lib/gtag';


function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debug Time Mocking (Global) - Mock after hydration to avoid mismatch
    if (typeof window !== 'undefined' && localStorage.getItem('debug_time') && !window.__DATE_MOCKED__) {
      const debugTime = localStorage.getItem('debug_time');
      const OriginalDate = window.Date;
      const offset = new Date(debugTime).getTime() - OriginalDate.now();
      
      function MockDate(...args) {
        if (args.length === 0) return new OriginalDate(OriginalDate.now() + offset);
        return new OriginalDate(...args);
      }
      MockDate.prototype = OriginalDate.prototype;
      MockDate.now = () => OriginalDate.now() + offset;
      MockDate.parse = OriginalDate.parse;
      MockDate.UTC = OriginalDate.UTC;
      window.Date = MockDate;
      window.__DATE_MOCKED__ = true;
      console.warn(`[DEBUG] Global Date mocked to: ${new OriginalDate(OriginalDate.now() + offset).toLocaleString()}`);
    }

    // 5時間（5 * 60 * 60 * 1000 ミリ秒）経過していたらService Workerのキャッシュを削除
    const CACHE_EXPIRATION_MS = 5 * 60 * 60 * 1000;
    const now = Date.now();
    const lastCacheClear = localStorage.getItem('lastCacheClear');

    if (!lastCacheClear || (now - parseInt(lastCacheClear, 10) > CACHE_EXPIRATION_MS)) {
      if ('serviceWorker' in navigator && window.caches) {
        window.caches.keys().then((cacheNames) => {
          Promise.all(cacheNames.map((name) => window.caches.delete(name)))
            .then(() => {
              localStorage.setItem('lastCacheClear', now.toString());
              console.log('Service Worker caches cleared after 5 hours.');
            });
        });
      }
    }

    const handleStart = (url) => {
      if (url !== router.pathname) setLoading(true);
    };
    const handleComplete = (url) => {
      setLoading(false);
      gtag.pageview(url);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      {gtag.GA_TRACKING_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gtag.GA_TRACKING_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "70%" }}
            exit={{ width: "100%", opacity: 0 }}
            transition={{ 
              initial: { duration: 0 },
              animate: { duration: 8, ease: "easeOut" },
              exit: { duration: 0.3 }
            }}
            className="fixed top-0 left-0 h-[3px] bg-brand-600 z-[9999] shadow-[0_0_10px_rgba(2,132,199,0.5)]"
          />
        )}
      </AnimatePresence>
      <Layout>
        <Component {...pageProps} />
        <Analytics />
        <SpeedInsights />
      </Layout>
    </>
  );
}

export default MyApp;


