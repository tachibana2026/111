import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Home, Users, Clock, PackageSearch, UserCog, WifiOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

const navItems = [
  { name: 'ホーム', path: '/', icon: Home },
  { name: '団体一覧', path: '/groups', icon: Users },
  { name: 'タイムテーブル', path: '/timetable', icon: Clock },
  { name: '落とし物', path: '/lost-found', icon: PackageSearch },
  { name: '管理', path: '/admin', icon: UserCog },
];

const Layout = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const pathname = router.pathname;

  useEffect(() => {
    setIsMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/Admin') || pathname.startsWith('/ryoun-hq-portal');
  const isProjectorPage = pathname === '/admin/hq/projector';

  // ページタイトルを決定
  const getPageTitle = () => {
    if (isProjectorPage) return '投影用ダッシュボード | たちばな祭2026';
    if (pathname === '/') return 'たちばな祭2026';
    
    // navItemsから検索
    const currentItem = navItems.find(item => item.path === pathname);
    if (currentItem) return `${currentItem.name} | たちばな祭2026`;

    // 管理画面のサブページ
    if (pathname === '/admin/hq') return '本部管理 | たちばな祭2026';
    if (pathname === '/admin/dashboard') return '団体管理 | たちばな祭2026';

    return 'たちばな祭2026';
  };

  if (isProjectorPage) {
    return (
      <div className="min-h-screen bg-slate-50 overflow-hidden">
        <Head>
          <title>{getPageTitle()}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <meta name="robots" content="noindex, nofollow" />
          <link rel="icon" href="/favicon.png" />
        </Head>
        <main className="w-full h-screen overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-28 md:pb-0 md:pt-20 bg-slate-50/30">
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="google-site-verification" content="vPtf7XF5A3UF7EC6PKbwyGE3bvmheVPGOQvMzfO1PqM" />
        {isAdminPage && <meta name="robots" content="noindex, nofollow" />}
        <meta name="description" content="令和8年度 千葉県立船橋高等学校 文化祭「たちばな祭2026」の公式サイト" />
        
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
      
      {/* Offline Indicator Badge */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -60, opacity: 0, x: '-50%' }}
            animate={{ y: 20, opacity: 1, x: '-50%' }}
            exit={{ y: -60, opacity: 0, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] md:top-24 pointer-events-none"
          >
            <div className="bg-rose-600/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-white/20 shadow-2xl">
              <WifiOff size={16} className="text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                オフライン表示中
              </span>
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
            
            // 管理タブの遷移先を動的に決定
            let href = item.path;
            if (item.path === '/admin' && isMounted) {
              const authType = localStorage.getItem('ryoun_auth_type');
              if (authType === 'hq') href = '/admin/hq';
              else if (authType === 'group') href = '/admin/dashboard';
            }

            return (
              <Link
                key={item.path}
                href={href}
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
      <main className="flex-grow overflow-hidden flex flex-col">
        <AnimatePresence initial={false} mode="wait">
          {isAdminPage && !isOnline ? (
            <motion.div
              key="offline-admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-grow flex flex-col items-center justify-center text-center px-6"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-rose-50 flex items-center justify-center text-rose-500 mb-8 shadow-inner">
                <WifiOff size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">管理画面は<br className="md:hidden" />オフラインでは利用できません</h2>
              <p className="text-slate-500 font-bold max-w-md leading-relaxed">
                管理操作を行うにはインターネット接続が必要です。<br />
                接続を確認してから再度お試しください。
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-10 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 transition-all active:scale-95 shadow-xl shadow-rose-200"
              >
                再試行する
              </button>
            </motion.div>
          ) : (
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
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-24 md:hidden bg-white/90 backdrop-blur-xl border-t border-white/50 rounded-t-[2.5rem] flex justify-around items-center px-4 pb-6 z-50 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/admin' && isAdminPage);

          // 管理タブの遷移先を動的に決定
          let href = item.path;
          if (item.path === '/admin' && isMounted) {
            const authType = localStorage.getItem('ryoun_auth_type');
            if (authType === 'hq') href = '/admin/hq';
            else if (authType === 'group') href = '/admin/dashboard';
          }

          return (
            <Link
              key={item.path}
              href={href}
              className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
                isActive ? 'text-brand-600' : 'text-slate-400 active:text-brand-600'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}>
                {isMounted && <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />}
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
