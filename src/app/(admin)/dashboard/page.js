'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (groupId, newStatus) => {
    setIsUpdating(true);
    try {
      // 1. Update Supabase data
      const { error } = await supabase
        .from('groups')
        .update({ status: newStatus })
        .eq('id', groupId);

      if (error) throw error;

      // 2. Trigger On-demand ISR to update public pages
      // This ensures 2,000 visitors see the change immediately without hitting Supabase
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: '/groups', 
          token: process.env.NEXT_PUBLIC_REVALIDATE_TOKEN // Set in environment
        }),
      });

      console.log('Update successful and cache revalidated.');
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">管理者ダッシュボード</h1>
      {/* 団体管理テーブル等のUI */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-500 mb-4">
          ここで更新したデータは、即座に一般公開ページ（CDNキャッシュ）へ反映されます。
        </p>
        {/* ...実装詳細... */}
      </div>
    </div>
  );
}
