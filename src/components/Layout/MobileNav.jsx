'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Users, Clock, PackageSearch, UserCog } from 'lucide-react';

const navItems = [
  { name: 'ホーム', path: '/', icon: Home },
  { name: '団体一覧', path: '/groups', icon: Users },
  { name: 'タイムテーブル', path: '/timetable', icon: Clock },
  { name: '落とし物', path: '/lost-found', icon: PackageSearch },
  { name: '管理', path: '/admin', icon: UserCog },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t border-slate-100 flex justify-around items-center px-2 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
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
  );
}
