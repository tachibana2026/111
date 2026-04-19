import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle2, XCircle, LogOut, Lock, RefreshCw,
  Save, Check, User, Shield, Clock, Info, Utensils, ChevronDown, Edit2
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerRevalidate } from '../../lib/revalidate';
import Portal from '../../components/Portal';

const renderFormattedMessage = (message) => {
  if (!message) return null;
  const parts = message.split(/(【[^】]+】)/g);
  return parts.map((part, index) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      return (
        <span key={index} className="text-amber-600 px-0.5">
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
};

const GroupDashboard = () => {
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ステート管理
  const [editData, setEditData] = useState({
    reception_status: 'before_open',
    waiting_time: 0,
    ticket_status: 'none'
  });
  const [performances, setPerformances] = useState([]); // 編集用の状態
  const [publishedPerformances, setPublishedPerformances] = useState([]); // 現在公開中の情報 (DBから取得)
  const [lastClientUpdate, setLastClientUpdate] = useState(null);
  const [now, setNow] = useState(new Date());

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    confirmText: '実行する',
    onConfirm: null,
    icon: null
  });

  useEffect(() => {
    if (confirmDialog.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [confirmDialog.isOpen]);

  useEffect(() => {
    const groupId = localStorage.getItem('ryoun_group_id');
    const authType = localStorage.getItem('ryoun_auth_type');

    if (!groupId || authType !== 'group') {
      router.push('/admin');
      return;
    }

    fetchGroupData(groupId, true);

    // リアルタイム購読の設定
    const channels = [
      supabase.channel(`group_${groupId}`).on('postgres_changes', { event: '*', table: 'groups', filter: `id=eq.${groupId}` }, () => fetchGroupData(groupId)).subscribe(),
      supabase.channel(`perfs_${groupId}`).on('postgres_changes', { event: '*', table: 'performances', filter: `group_id=eq.${groupId}` }, () => fetchGroupData(groupId)).subscribe()
    ];

    const timer = setInterval(() => setNow(new Date()), 60000);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
      clearInterval(timer);
    };
  }, [router]);

  const fetchGroupData = async (groupId, isInitial = false) => {
    const id = groupId || localStorage.getItem('ryoun_group_id');
    if (!id) return;

    const { data, error } = await supabase
      .from('groups')
      .select('*, performances(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (isInitial) handleLogout();
      return;
    } else {
      const loginAt = localStorage.getItem('ryoun_login_at');
      if (data.last_reset_at && loginAt && new Date(data.last_reset_at) > new Date(loginAt)) {
        handleLogout();
        return;
      }
      setGroup(data);

      const sortedPerfs = data.performances?.sort((a, b) => {
        if (a.part_id !== b.part_id) return a.part_id - b.part_id;
        return a.start_time.localeCompare(b.start_time);
      }) || [];
      // 公開中の情報を更新
      setPublishedPerformances(sortedPerfs);

      // 初期ロード時、かつ更新中でない場合のみ編集用の状態を初期化
      if (isInitial && !updating) {
        setEditData({
          reception_status: data.reception_status || 'before_open',
          waiting_time: data.waiting_time || 0,
          ticket_status: data.ticket_status || 'none'
        });
        setPerformances(JSON.parse(JSON.stringify(sortedPerfs)));
      }
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (group.editing_locked || updating) return;
    setUpdating(true);

    const password = localStorage.getItem('ryoun_password');

    // 団体情報を更新
    const groupUpdate = supabase.from('groups').update({
      reception_status: editData.reception_status,
      waiting_time: editData.waiting_time,
      ticket_status: editData.ticket_status,
      updated_at: new Date().toISOString()
    }).eq('id', group.id);

    // 公演情報を更新
    const perfUpdates = performances.map(perf => {
      return supabase.rpc('update_performance_secure', {
        target_id: perf.id,
        provided_password: password,
        new_status: perf.status,
        new_reception_status: perf.reception_status || 'open'
      });
    });

    const results = await Promise.all([groupUpdate, ...perfUpdates]);
    const errors = results.filter(r => r.error).map(r => r.error);

    if (errors.length > 0) {
      console.error('Update Errors:', errors);
      const errMsg = errors[0]?.message || errors[0]?.details || '不明なエラー';
      alert(`情報の更新に失敗しました。\n詳細: ${errMsg}`);
    } else {
      setShowSuccess(true);
      setLastClientUpdate(new Date());
      setTimeout(() => setShowSuccess(false), 3000);
      // Supabaseのリアルタイム購読が未設定の場合に備え、手動で即座に再取得して画面を更新する
      await fetchGroupData(group.id);
      triggerRevalidate();
    }
    setUpdating(false);
  };

  const handleLocalStateUpdate = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const isPerformancePast = useCallback((perf) => {
    const festDate = perf.part_id === 3 ? '2026-06-14' : '2026-06-13';
    const endTime = perf.end_time || perf.start_time;
    return new Date(`${festDate}T${endTime}:00`) < new Date();
  }, []);

  const handleLocalPerformanceUpdate = (id, field, value) => {
    const perf = performances.find(p => p.id === id);
    if (perf && isPerformancePast(perf)) return;
    setPerformances(prev => prev.map(p => {
      if (p.id === id) {
        const updates = { [field]: value };
        if (field === 'reception_status' && value === 'closed' && p.status !== 'none') {
          updates.status = 'ended';
        }
        return { ...p, ...updates };
      }
      return p;
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('ryoun_group_id');
    localStorage.removeItem('ryoun_auth_type');
    localStorage.removeItem('ryoun_login_at');
    localStorage.removeItem('ryoun_password');
    router.push('/admin');
  };

  const confirmLogout = () => {
    setConfirmDialog({
      isOpen: true,
      message: '管理画面から\n【ログアウト】しますか？',
      confirmText: 'ログアウト',
      onConfirm: handleLogout,
      icon: <LogOut className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.5} />
    });
  };

  const lastUpdatedText = useMemo(() => {
    if (!group) return null;
    const dates = [
      group.updated_at,
      lastClientUpdate,
      ...publishedPerformances.map(p => p.updated_at)
    ]
      .filter(Boolean)
      .map(d => new Date(d).getTime());

    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates));
    const diffMs = now - latest;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 3) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffWeeks < 4) return `${diffWeeks}週間前`;
    if (diffMonths < 12) return `${diffMonths}か月前`;
    return `${diffYears}年前`;
  }, [group, publishedPerformances, now]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <RefreshCw className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-12 pt-6 px-4">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-0 right-0 mx-auto w-fit z-[100] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 font-black"
          >
            <Check size={24} strokeWidth={3} /><span>更新しました</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center space-x-5">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{group.name} 管理画面</h1>
          </div>
        </div>
        <button
          onClick={confirmLogout}
          className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl text-sm font-black transition-all hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 flex items-center justify-center gap-3"
        >
          <LogOut size={18} strokeWidth={2.5} />
          ログアウト
        </button>
      </div>

      <div className="space-y-8">
        {group.editing_locked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50 border border-rose-100 p-8 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-sm"
          >
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
              <Lock size={28} />
            </div>
            <div className="space-y-1">
              <h2 className="font-black text-rose-700 text-lg">編集権限なし</h2>
              <p className="text-rose-600/60 text-xs font-bold leading-relaxed">
                現在、本部より編集が制限されています。
              </p>
            </div>
          </motion.div>
        )}

        <section className="bg-white border border-slate-100 p-8 rounded-3xl space-y-6 shadow-sm">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-center">
              現在公開中の情報
            </span>
            {lastUpdatedText && (
              <div className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-slate-100">
                <RefreshCw size={8} />
                <span>更新: {lastUpdatedText}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {group.has_reception && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-black text-slate-500">{group.department || '運営状況'}</span>
                <span className={`text-xl font-black ${
                  group.reception_status === 'closed' || group.reception_status === 'ended' ? 'text-rose-500' : 
                  group.reception_status === 'before_open' ? 'text-slate-400' : 
                  group.reception_status === 'ticket_only' ? 'text-brand-500' :
                  'text-emerald-500'
                }`}>
                  {group.reception_status === 'closed' ? '受付終了' :
                    group.reception_status === 'before_open' ? '受付前' :
                    group.reception_status === 'ticket_only' ? '整理券のみ受付' :
                      (group.has_waiting_time && group.waiting_time > 0 ? `${group.waiting_time}分待ち` :
                        group.has_waiting_time && group.waiting_time === 0 ? '待ちなし' : '受付中')}
                </span>
              </div>
            )}
            {group.has_ticket_status && group.ticket_status !== 'none' && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-black text-slate-500">整理券状況</span>
                <span className={`text-xl font-black ${{ distributing: 'text-emerald-500', limited: 'text-amber-500', ended: 'text-rose-500' }[group.ticket_status]}`}>
                  {{ distributing: '配布中', limited: '残りわずか', ended: '配布終了' }[group.ticket_status]}
                </span>
              </div>
            )}
            {publishedPerformances.length > 0 && (
              <div className="pt-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">整理券配布状況</span>
                <div className="space-y-2">
                  {publishedPerformances.map(perf => {
                    const isOver = isPerformancePast(perf);
                    const displayStatus = (isOver && perf.status === 'distributing') ? 'ended' : perf.status;
                    const displayReception = isOver ? 'closed' : (perf.reception_status || 'open');
                    return (
                      <div key={perf.id} className="flex items-center justify-between px-4 py-2 bg-slate-50/50 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400">Part {perf.part_id} ({perf.start_time})</span>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-black ${displayReception === 'closed' ? 'text-rose-500' :
                            displayReception === 'before_open' ? 'text-slate-500' :
                              displayReception === 'ticket_only' ? 'text-brand-500' :
                                'text-emerald-500'
                            }`}>
                            {displayReception === 'closed' ? '受付終了' :
                              displayReception === 'before_open' ? '受付前' :
                                displayReception === 'ticket_only' ? '整理券のみ受付' :
                                  '受付中'}
                          </span>
                          <span className="text-[10px] font-black text-slate-400">
                            整理券{displayStatus === 'distributing' ? '配布中' : displayStatus === 'ended' ? '配布終了' : '配布なし'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
        <div className={`space-y-6 ${group.editing_locked ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                    <Edit2 size={24} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">情報編集</h2>
                </div>
              </div>

              {/* Status Toggle */}
              {group.has_reception && !group.has_performances && (
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">受付状況</label>
                  <div className={`grid ${editData.ticket_status === 'distributing' || editData.ticket_status === 'ended' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                    <button
                      onClick={() => handleLocalStateUpdate('reception_status', 'before_open')}
                      className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 ${editData.reception_status === 'before_open' ? 'bg-slate-50 border-slate-400 text-slate-700 shadow-lg shadow-slate-400/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                    >受付前</button>
                    <button
                      onClick={() => handleLocalStateUpdate('reception_status', 'open')}
                      className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 ${editData.reception_status === 'open' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                    >受付中</button>
                    {(editData.ticket_status === 'distributing' || editData.ticket_status === 'ended') && (
                      <button
                        onClick={() => handleLocalStateUpdate('reception_status', 'ticket_only')}
                        className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 ${editData.reception_status === 'ticket_only' ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-lg shadow-brand-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                      >整理券のみ受付</button>
                    )}
                    <button
                      onClick={() => handleLocalStateUpdate('reception_status', 'closed')}
                      className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 ${editData.reception_status === 'closed' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                    >受付終了</button>
                  </div>
                </div>
              )}

              {/* Waiting Time Management */}
              {group.has_waiting_time && !group.has_performances && (
                <div className="space-y-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">現在の待ち時間</label>
                  </div>
                  <div className="relative">
                    <select
                      value={editData.reception_status === 'closed' ? 'closed' : editData.waiting_time}
                      disabled={editData.reception_status === 'closed'}
                      onChange={(e) => handleLocalStateUpdate('waiting_time', parseInt(e.target.value))}
                      className={`w-full border-2 rounded-2xl py-5 px-6 font-black transition-all appearance-none focus:outline-none ${editData.reception_status === 'closed'
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-brand-500 cursor-pointer'
                        }`}
                    >
                      {editData.reception_status === 'closed' ? (
                        <option value="closed">選択不可</option>
                      ) : (
                        Array.from({ length: 25 }, (_, i) => i * 5).map((mins) => (
                          <option key={mins} value={mins}>
                            {mins === 0 ? 'なし' : `${mins}分待ち`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className={`absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none ${editData.reception_status === 'closed' ? 'text-slate-300' : 'text-slate-400'}`}>
                      <ChevronDown size={20} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Status Management */}
              {group.has_ticket_status && !group.has_performances && (
                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">整理券配布状況</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'なし', color: 'bg-white border-slate-200' },
                      { id: 'distributing', label: '配布中', color: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
                      { id: 'ended', label: '終了', color: 'bg-rose-50 border-rose-500 text-rose-700' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleLocalStateUpdate('ticket_status', s.id)}
                        className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 ${editData.ticket_status === s.id ? s.color : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Management */}
              {group.has_performances && (
                <div className="space-y-8">
                  {[1, 2, 3].map(partId => {
                    const partPerfs = performances.filter(p => p.part_id === partId);
                    if (partPerfs.length === 0) return null;

                    return (
                      <div key={partId} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-slate-50"></div>
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Part {partId}</span>
                          <div className="h-px flex-1 bg-slate-50"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {partPerfs.map(perf => (
                            <div key={perf.id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50 space-y-6">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Clock size={16} className="text-brand-600" />
                                  <span className="text-sm font-black text-slate-900">{perf.start_time}〜 の公演</span>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">公演受付状況</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      { id: 'before_open', label: '受付前' },
                                      { id: 'open', label: '受付中' },
                                      { id: 'ticket_only', label: '整理券のみ受付', hide: perf.status === 'none' },
                                      { id: 'closed', label: '受付終了' }
                                    ].filter(s => !s.hide).map(s => {
                                      const isPast = isPerformancePast(perf);
                                      const displayReception = isPast ? 'closed' : (perf.reception_status || 'open');
                                      const isActive = displayReception === s.id;
                                      return (
                                        <button
                                          key={s.id}
                                          onClick={() => handleLocalPerformanceUpdate(perf.id, 'reception_status', s.id)}
                                          disabled={isPast}
                                          className={`py-3 px-1 sm:px-2 rounded-2xl text-[9px] sm:text-[10px] font-black transition-all border-2 break-keep ${isActive
                                            ? s.id === 'open'
                                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10'
                                              : s.id === 'ticket_only'
                                                ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-md ring-2 ring-brand-500/10'
                                                : s.id === 'before_open'
                                                  ? 'bg-slate-50 border-slate-500 text-slate-700 shadow-md ring-2 ring-slate-500/10'
                                                  : 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10'
                                            : 'bg-white border-transparent text-slate-400 hover:border-slate-100'
                                            } ${isPast ? 'opacity-30 cursor-not-allowed filter grayscale' : ''}`}
                                        >
                                          {s.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">整理券配布状況</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      { id: 'none', label: 'なし' },
                                      { id: 'distributing', label: '配布中' },
                                      { id: 'ended', label: '終了' }
                                    ].map(s => {
                                      const isPast = isPerformancePast(perf);
                                      const displayStatus = isPast && perf.status !== 'none' ? 'ended' : perf.status;
                                      return (
                                        <button
                                          key={s.id}
                                          onClick={() => handleLocalPerformanceUpdate(perf.id, 'status', s.id)}
                                          disabled={isPast}
                                          className={`py-3 rounded-2xl text-[10px] font-black transition-all border-2 ${displayStatus === s.id
                                            ? 'bg-white border-brand-600 text-brand-700 shadow-md ring-4 ring-brand-500/5'
                                            : 'bg-white border-transparent text-slate-400'
                                            } ${isPast ? 'opacity-30 cursor-not-allowed filter grayscale' : 'hover:border-slate-100'}`}
                                        >
                                          {s.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!group.has_reception && !group.has_waiting_time && !group.has_ticket_status && !group.has_performances && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                    <Info size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">編集項目はありません</h3>
                    <p className="text-sm font-bold text-slate-400 mt-2 leading-relaxed">
                      この団体に設定された操作項目はありません。<br />
                      設定の変更が必要な場合は本部へお問い合わせください。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {(group.has_reception || group.has_waiting_time || group.has_ticket_status || group.has_performances) && (
              <button
                onClick={handleUpdate}
                disabled={updating || group.editing_locked}
                className={`w-full py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-brand-500/20 flex items-center justify-center space-x-3 transition-all active:scale-95 ${updating ? 'bg-slate-100 text-slate-400' : 'bg-brand-600 text-white hover:bg-brand-700 hover:translate-y-[-2px]'}`}
              >
                {updating ? (
                  <div className="flex items-center space-x-4">
                    <RefreshCw size={24} className="animate-spin" />
                    <span>更新中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Save size={24} />
                    <span>変更を保存する</span>
                  </div>
                )}
              </button>
            )}
        </div>
      </div>

      <AnimatePresence>
        {confirmDialog.isOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full text-center shadow-2xl border border-slate-100 text-slate-800"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
                  {confirmDialog.icon || <Shield size={32} strokeWidth={2.5} />}
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 mb-6 md:mb-8 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedMessage(confirmDialog.message)}
                </h2>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    className="order-2 md:order-1 flex-1 py-4 text-slate-400 font-black text-sm hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                      setConfirmDialog({ ...confirmDialog, isOpen: false });
                    }}
                    className="order-1 md:order-2 flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all"
                  >
                    {confirmDialog.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupDashboard;
