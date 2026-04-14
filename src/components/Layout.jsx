import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Clock, PackageSearch, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: 'ホーム', path: '/', icon: Home },
    { name: '団体一覧', path: '/groups', icon: Users },
    { name: 'タイムテーブル', path: '/timetable', icon: Clock },
    { name: '落とし物', path: '/lost-found', icon: PackageSearch },
    { name: '管理', path: '/admin', icon: UserCog },
  ];

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/ryoun-hq-portal');

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16">
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 w-full h-16 hidden md:flex items-center justify-between px-8 bg-white/90 backdrop-blur-md border-b border-slate-100 z-50">
        <Link to="/" className="flex items-center space-x-3 transition-transform active:scale-95">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">凌</span>
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-lg font-bold text-slate-900 tracking-tight">凌雲たちばな祭</span>
          </div>
        </Link>
        <nav className="flex space-x-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/admin' && isAdminPage);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-brand-600 hover:bg-slate-50'
                }`}
              >
                <item.icon size={16} />
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
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="container mx-auto px-4 py-6 md:py-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t border-slate-100 flex justify-around items-center px-2 z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/admin' && isAdminPage);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
                isActive ? 'text-brand-600' : 'text-slate-400'
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-nav-dot"
                  className="absolute top-1 w-1 h-1 bg-brand-600 rounded-full" 
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
