import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Home, Users, Clock, PackageSearch, UserCog, 
  AlertTriangle, X, WifiOff, Info, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

const Layout = ({ children }) => {
  const router = useRouter();
  const pathname = router.pathname;

  const navItems = [
    { name: 'ホーム', path: '/', icon: Home },
    { name: '団体一覧', path: '/groups', icon: Users },
    { name: 'タイムテーブル', path: '/timetable', icon: Clock },
    { name: '落とし物', path: '/lost-found', icon: PackageSearch },
    { name: '管理', path: '/admin', icon: UserCog },
  ];

  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/Admin') || pathname.startsWith('/ryoun-hq-portal');

  // ページタイトルを決定
  const getPageTitle = () => {
    if (pathname === '/') return 'たちばな祭2026';
    
    // navItemsから検索
    const currentItem = navItems.find(item => item.path === pathname);
    if (currentItem) return `${currentItem.name} | たちばな祭2026`;

    // 管理画面のサブページ
    if (pathname === '/admin/hq') return '本部管理 | たちばな祭2026';
    if (pathname === '/admin/dashboard') return '団体管理 | たちばな祭2026';

    return 'たちばな祭2026';
  };

  const [isOnline, setIsOnline] = useState(true);
  const [showDarkModeWarning, setShowDarkModeWarning] = useState(false);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // オフライン検知
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ダークモード検知
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const checkDarkMode = (e) => {
      const dismissed = sessionStorage.getItem('dismissed-dark-mode-warning');
      if (e.matches && !dismissed) {
        setShowDarkModeWarning(true);
      } else {
        setShowDarkModeWarning(false);
      }
    };

    checkDarkMode(mediaQuery);
    mediaQuery.addEventListener('change', checkDarkMode);



    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);



  const dismissDarkModeWarning = () => {
    setShowDarkModeWarning(false);
    sessionStorage.setItem('dismissed-dark-mode-warning', 'true');
  };

  return (
    <div className="min-h-screen flex flex-col pb-28 md:pb-0 md:pt-20 bg-slate-50/30">
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="google-site-verification" content="vPtf7XF5A3UF7EC6PKbwyGE3bvmheVPGOQvMzfO1PqM" />
        {isAdminPage && <meta name="robots" content="noindex, nofollow" />}
        <meta name="description" content="令和8年度 千橋県立船橋高等学校 文化祭「たちばな祭2026」の公式サイト" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:site_name" content="たちばな祭2026 公式サイト" />
        <meta property="og:description" content="令和8年度 千葉県立船橋高等学校 文化祭「たちばな祭2026」の公式サイト" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:locale" content="ja_JP" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={getPageTitle()} />
        <meta property="twitter:description" content="令和8年度 千葉県立船橋高等学校 文化祭「たちばな祭2026」の公式サイト" />
        <meta property="twitter:image" content="/og-image.png" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-[320px]"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-5 shadow-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <WifiOff size={20} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-slate-900">オフライン</span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">キャッシュを表示中</span>
              </div>
            </div>
          </motion.div>
        )}
        {showDarkModeWarning && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: !isOnline ? 100 : 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[1001] w-[calc(100%-2rem)] max-w-[320px]"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-5 shadow-2xl flex items-center gap-4 relative">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col text-left pr-6">
                <span className="text-sm font-black text-slate-900">ダークモード非対応</span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5 leading-relaxed">ライトモードを推奨します</span>
              </div>
              <button 
                onClick={dismissDarkModeWarning}
                className="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Desktop Header */}

      <header className="fixed top-0 left-0 w-full h-20 hidden md:flex items-center justify-between px-10 bg-white/70 backdrop-blur-xl border-b border-white/50 z-50 shadow-sm">
        <Link href="/" className="flex items-center space-x-4 transition-transform active:scale-95 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-brand-500/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-bold text-slate-900 tracking-tight">たちばな祭2026</span>
          </div>
        </Link>
        <nav className="flex space-x-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/admin' && isAdminPage);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-100'
                }`}
              >
                <item.icon size={18} strokeWidth={2.5} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="container mx-auto px-4 py-8 md:py-12"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-24 md:hidden bg-white/90 backdrop-blur-xl border-t border-white/50 rounded-t-[2.5rem] flex justify-around items-center px-4 pb-6 z-50 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/admin' && isAdminPage);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-50'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] mt-1 font-black tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
              {isActive && (
                <motion.div 
                   layoutId="active-nav-glow"
                   className="absolute -bottom-1 w-12 h-1 bg-brand-600/20 blur-sm rounded-full" 
                />
              )}
            </Link>
          );
        })}
      </nav>
      {/* Footer */}
      <footer className="py-8 px-4 flex justify-center">
        <p className="text-[10px] md:text-[11px] font-bold text-slate-300 tracking-wider">
          © 2026 Nomura Yuma
        </p>
      </footer>
    </div>
  );
};

export default Layout;
