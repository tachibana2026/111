import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Map as MapIcon, PackageSearch, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: 'ホーム', path: '/', icon: Home },
    { name: '団体一覧', path: '/groups', icon: Users },
    { name: 'マップ', path: '/map', icon: MapIcon },
    { name: '落とし物', path: '/lost-found', icon: PackageSearch },
  ];

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/ryoun-hq-portal');

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-20">
      {/* Background clouds */}
      <div className="cloud-bg">
        <div className="cloud w-64 h-64 top-20 left-10 opacity-30"></div>
        <div className="cloud w-96 h-96 bottom-40 right-10 opacity-20"></div>
      </div>

      {/* Desktop Header */}
      <header className="fixed top-0 left-0 w-full h-20 hidden md:flex items-center justify-between px-10 glass-nav z-50">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-gradient tracking-widest">凌雲</span>
          <span className="text-sm font-medium text-white/60">たちのばな祭 2026</span>
        </Link>
        <nav className="flex space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                location.pathname === item.path ? 'text-ryoun-sky' : 'text-white/70 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </Link>
          ))}
          {!isAdminPage && (
            <Link to="/admin" className="text-white/40 hover:text-white transition-colors">
              <UserCog size={18} />
            </Link>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 md:px-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-16 md:hidden glass-nav flex justify-around items-center px-4 z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center space-y-1 transition-all ${
              location.pathname === item.path ? 'text-ryoun-sky' : 'text-white/50'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.name}</span>
            {location.pathname === item.path && (
              <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-ryoun-sky rounded-full" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
