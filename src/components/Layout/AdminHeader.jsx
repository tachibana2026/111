'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-8 bg-slate-900 text-white z-50">
      <Link href="/admin/hq" className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <span className="text-lg font-bold tracking-tight">凌雲本部管理</span>
      </Link>
      
      <nav className="flex items-center space-x-4">
        <Link 
          href="/admin/hq"
          className={`text-sm font-bold flex items-center space-x-2 transition-colors ${pathname.includes('hq') ? 'text-brand-400' : 'text-slate-400 hover:text-white'}`}
        >
          <LayoutDashboard size={18} />
          <span>管理パネル</span>
        </Link>
        <Link 
          href="/admin"
          className="text-sm font-bold text-slate-400 hover:text-white flex items-center space-x-2 transition-colors"
        >
          <LogOut size={18} />
          <span>ログアウト</span>
        </Link>
      </nav>
    </header>
  );
}
