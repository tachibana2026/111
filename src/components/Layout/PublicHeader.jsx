'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Clock, PackageSearch, UserCog } from 'lucide-react';

const navItems = [
  { name: 'ホーム', path: '/', icon: Home },
  { name: '団体一覧', path: '/groups', icon: Users },
  { name: 'タイムテーブル', path: '/timetable', icon: Clock },
  { name: '落とし物', path: '/lost-found', icon: PackageSearch },
  { name: '管理', path: '/admin', icon: UserCog },
];

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 w-full h-16 hidden md:flex items-center justify-between px-8 bg-white/90 backdrop-blur-md border-b border-slate-100 z-50">
      <Link href="/" className="flex items-center space-x-3 transition-transform active:scale-95">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-sm">凌</span>
        </div>
        <div className="flex flex-col -space-y-1">
          <span className="text-lg font-bold text-slate-900 tracking-tight">凌雲たちばな祭 2026</span>
        </div>
      </Link>
      <nav className="flex space-x-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
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
  );
}
