import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import '../index.css';
import Layout from '../components/Layout';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = (url) => {
      if (url !== router.pathname) setLoading(true);
    };
    const handleComplete = () => setLoading(false);

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


