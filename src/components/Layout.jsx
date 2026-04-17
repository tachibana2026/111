import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Users, Clock, PackageSearch, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

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

  return (
    <div className="min-h-screen flex flex-col pb-28 md:pb-0 md:pt-20 bg-slate-50/30">
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="google-site-verification" content="vPtf7XF5A3UF7EC6PKbwyGE3bvmheVPGOQvMzfO1PqM" />
        {pathname !== '/' && <meta name="robots" content="noindex, nofollow" />}
        <meta name="description" content="千葉県立船橋高等学校 たちばな祭 2026 公式サイト。凌雲 - 雲よりも高く突き抜ける。団体の紹介、タイムテーブル、落とし物情報などを掲載しています。" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content="凌雲2026 - 千葉県立船橋高等学校たちばな祭公式サイト。開催日時や団体紹介、最新情報をお届けします。" />
        <meta property="og:image" content="/og-image.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={getPageTitle()} />
        <meta property="twitter:description" content="凌雲2026 - 千葉県立船橋高等学校たちばな祭公式サイト。開催日時や団体紹介、最新情報をお届けします。" />
        <meta property="twitter:image" content="/og-image.png" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      {/* Desktop Header */}

      <header className="fixed top-0 left-0 w-full h-20 hidden md:flex items-center justify-between px-10 bg-white/70 backdrop-blur-xl border-b border-white/50 z-50 shadow-sm">
        <Link href="/" className="flex items-center space-x-4 transition-transform active:scale-95 group">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:rotate-6 transition-transform">
            <span className="text-white font-black text-lg">凌</span>
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-bold text-slate-900 tracking-tight">凌雲たちばな祭 2026</span>
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
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
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
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-500'
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
