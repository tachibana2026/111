import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle2, XCircle, LogOut, Lock, Save, Check, User, Shield, Clock, Info, Utensils, ChevronDown, Edit2, Loader2, RefreshCw, Ticket
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
  const [expandedPerformances, setExpandedPerformances] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const nextPerf = useMemo(() => {
    if (!performances.length) return null;
    const nowLocal = new Date();
    const sorted = [...performances]
      .map(p => {
        const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
        return { ...p, fullDate: new Date(`${festDate}T${p.start_time}:00`) };
      })
      .filter(p => {
        const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
        const endTime = p.end_time || p.start_time;
        const fullEndDate = new Date(`${festDate}T${endTime}:00`);
        return fullEndDate > nowLocal;
      })
      .sort((a, b) => a.fullDate - b.fullDate);
    return sorted[0] || null;
  }, [performances]);

  useEffect(() => {
    if (nextPerf && expandedPerformances.length === 0) {
      setExpandedPerformances([nextPerf.id]);
    }
  }, [nextPerf]);

  const togglePerformance = (id) => {
    setExpandedPerformances(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    confirmText: '実行する',
    onConfirm: null,
    icon: null
  });

  useEffect(() => {
    if (confirmDialog.isOpen || loading || updating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [confirmDialog.isOpen, loading, updating]);

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

    const groupUpdate = supabase.from('groups').update({
      reception_status: editData.reception_status,
      waiting_time: editData.waiting_time,
      ticket_status: editData.ticket_status,
      updated_at: new Date().toISOString()
    }).eq('id', group.id);

    // 公演情報を更新
    const perfUpdates = (performances || []).map(perf => {
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
      const errMsg = errors.map(e => e.message || e.details || '不明なエラー').join('\n');
      alert(`情報の更新に失敗しました。\n詳細:\n${errMsg}`);
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

  const getStatusColors = (status, type) => {
    if (status === 'closed' || status === 'ended') return 'text-slate-400';
    if (status === 'before_open' || status === 'none') return 'text-slate-400';
    if (status === 'ticket_only') return 'text-brand-500';
    return 'text-emerald-600';
  };

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

  if (!isMounted || (loading && !group)) {
    return (
      <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-white backdrop-blur-sm">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-slate-100 border-t-brand-600 rounded-full"
          />
        </div>
        <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
        {loading ? '読み込み中...' : '初期化中...'}
        </p>
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
          <button
            onClick={() => fetchGroupData(group.id)}
            disabled={loading || updating}
            className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            title="最新の情報に更新"
          >
            <RefreshCw className={`w-6 h-6 ${(loading && !group) || updating ? 'animate-spin' : ''}`} />
          </button>
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
                <span className={`text-xl font-black ${getStatusColors(group.reception_status, 'reception')}`}>
                  {group.reception_status === 'closed' ? '受付終了' :
                    group.reception_status === 'before_open' ? '受付前' :
                    group.reception_status === 'ticket_only' ? '整理券のみ' :
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
                <div className="space-y-4">
                  {[1, 2, 3].map(partId => {
                    const partPerfs = publishedPerformances.filter(p => p.part_id === partId);
                    if (partPerfs.length === 0) return null;
                    return (
                      <div key={partId} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                              Part {partId} ({partId === 3 ? '6/14' : '6/13'})
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {partPerfs.map(perf => {
                            const isNext = nextPerf && perf.id === nextPerf.id;
                            const isOver = isPerformancePast(perf);
                            const displayStatus = (isOver && perf.status === 'distributing') ? 'ended' : perf.status;
                            const displayReception = isOver ? 'closed' : (perf.reception_status || 'open');

                            return (
                              <div key={perf.id} className={`px-4 py-3 rounded-xl border transition-all flex flex-col justify-center gap-1 ${
                                isOver ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-60' : 
                                isNext ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-500/10' : 
                                'bg-white text-slate-600 border-slate-100'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-black">
                                    {perf.start_time}{perf.end_time && ` ～ ${perf.end_time}`}
                                  </span>
                                  {isNext && <span className="bg-brand-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter animate-pulse">Next</span>}
                                </div>
                                <div className="flex flex-col gap-1 mt-1.5">
                                  <div className={`flex items-center justify-start gap-1.5 text-[9px] font-black ${getStatusColors(displayReception, 'reception')}`}>
                                    {displayReception === 'closed' ? <XCircle size={10} strokeWidth={3} /> :
                                      displayReception === 'before_open' ? <Clock size={10} strokeWidth={3} /> :
                                      <CheckCircle2 size={10} strokeWidth={3} />}
                                    {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了' }[displayReception]}
                                  </div>
                                  <div className={`flex items-center justify-start gap-1.5 text-[9px] font-black ${getStatusColors(displayStatus, 'ticket')}`}>
                                    <Ticket size={10} strokeWidth={3} />
                                    {{ none: '配布なし', distributing: '配布中', ended: '配布終了' }[displayStatus]}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                      className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 active:scale-95 ${editData.reception_status === 'before_open' ? 'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                    >受付前</button>
                    <button
                      onClick={() => handleLocalStateUpdate('reception_status', 'open')}
                      className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 active:scale-95 ${editData.reception_status === 'open' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                    >受付中</button>
                    {(editData.ticket_status === 'distributing' || editData.ticket_status === 'ended') && (
                      <button
                        onClick={() => handleLocalStateUpdate('reception_status', 'ticket_only')}
                        className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 active:scale-95 ${editData.reception_status === 'ticket_only' ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-lg shadow-brand-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                      >整理券のみ</button>
                    )}
                    <button
                      onClick={() => handleLocalStateUpdate('reception_status', 'closed')}
                      className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 active:scale-95 ${editData.reception_status === 'closed' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
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
                      value={['before_open', 'closed', 'ended'].includes(editData.reception_status) ? 'disabled' : editData.waiting_time}
                      disabled={['before_open', 'closed', 'ended'].includes(editData.reception_status)}
                      onChange={(e) => handleLocalStateUpdate('waiting_time', parseInt(e.target.value))}
                      className={`w-full border-2 rounded-2xl py-5 px-6 font-black transition-all appearance-none focus:outline-none ${['before_open', 'closed', 'ended'].includes(editData.reception_status)
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-brand-500 cursor-pointer'
                        }`}
                    >
                      {['before_open', 'closed', 'ended'].includes(editData.reception_status) ? (
                        <option value="disabled">選択不可</option>
                      ) : (
                        Array.from({ length: 25 }, (_, i) => i * 5).map((mins) => (
                          <option key={mins} value={mins}>
                            {mins === 0 ? 'なし' : `${mins}分待ち`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className={`absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none ${['before_open', 'closed', 'ended'].includes(editData.reception_status) ? 'text-slate-300' : 'text-slate-400'}`}>
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
                      { id: 'none', label: 'なし', color: 'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10' },
                      { id: 'distributing', label: '配布中', color: 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' },
                      { id: 'ended', label: '終了', color: 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleLocalStateUpdate('ticket_status', s.id)}
                        className={`py-4 rounded-2xl text-[11px] font-black transition-all border-2 active:scale-95 ${editData.ticket_status === s.id ? s.color : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Management */}
              {group.has_performances && (
                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">公演スケジュール 管理</h3>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>

                  {[1, 2, 3].map(partId => {
                    const partPerfs = performances.filter(p => p.part_id === partId);
                    if (partPerfs.length === 0) return null;

                    return (
                      <div key={partId} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                              Part {partId} ({partId === 3 ? '6/14' : '6/13'})
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-slate-50"></div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {partPerfs.map(perf => {
                            const isExpanded = expandedPerformances.includes(perf.id);
                            const isNext = nextPerf && perf.id === nextPerf.id;
                            const isPast = isPerformancePast(perf);

                            return (
                              <div key={perf.id} className={`rounded-[2.5rem] border transition-all duration-500 shadow-sm overflow-hidden ${
                                isPast ? 'bg-slate-50/30 border-slate-100 opacity-60' :
                                isExpanded ? 'bg-white border-brand-200 ring-4 ring-brand-500/5' :
                                'bg-slate-50/50 border-slate-100 hover:bg-slate-100/50'
                              }`}>
                                <button
                                  onClick={() => togglePerformance(perf.id)}
                                  className="w-full p-6 flex items-center justify-between group/btn text-left transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 rotate-[360deg]' : 'bg-brand-50 text-brand-600 group-hover/btn:scale-110'}`}>
                                      <Clock size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[15px] font-black text-slate-900 tracking-tight">
                                          {perf.start_time}{perf.end_time && ` ～ ${perf.end_time}`}
                                        </span>
                                        {isNext && <span className="bg-brand-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter animate-pulse">Next</span>}
                                      </div>
                                      {!isExpanded && (
                                        <div className="flex items-center gap-3">
                                          <span className={`text-[10px] font-black ${getStatusColors(perf.reception_status, 'reception')}`}>
                                            {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了' }[perf.reception_status]}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-300">
                                            整理券{perf.status === 'distributing' ? '配布中' : perf.status === 'ended' ? '終了' : 'なし'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-brand-100 text-brand-600 rotate-180' : 'bg-white text-slate-400 shadow-sm group-hover/btn:bg-brand-50 group-hover/btn:text-brand-600'}`}>
                                    <ChevronDown size={20} strokeWidth={3} />
                                  </div>
                                </button>
                                
                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-6 pb-8 pt-2 space-y-8 border-t border-slate-50/50 mx-4">
                                        <div className="pt-6 space-y-8">
                                          <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">公演受付状況</label>
                                            <div className="grid grid-cols-3 gap-2">
                                              {[
                                                { id: 'before_open', label: '受付前' },
                                                { id: 'open', label: '受付中' },
                                                { id: 'ticket_only', label: '整理券のみ', hide: perf.status === 'none' },
                                                { id: 'closed', label: '受付終了' }
                                              ].filter(s => !s.hide).map(s => {
                                                const isPastLocal = isPerformancePast(perf);
                                                const displayReception = isPastLocal ? 'closed' : (perf.reception_status || 'open');
                                                const isActive = displayReception === s.id;
                                                return (
                                                  <button
                                                    key={s.id}
                                                    onClick={() => handleLocalPerformanceUpdate(perf.id, 'reception_status', s.id)}
                                                    disabled={isPastLocal}
                                                    className={`py-4 px-1 sm:px-2 rounded-2xl text-[10px] font-black transition-all border-2 break-keep ${isActive
                                                      ? s.id === 'open'
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10'
                                                        : s.id === 'ticket_only'
                                                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-md ring-2 ring-brand-500/10'
                                                          : s.id === 'before_open'
                                                            ? 'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10'
                                                            : 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10'
                                                      : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100 hover:bg-slate-50'
                                                      } ${isPastLocal ? 'opacity-30 cursor-not-allowed filter grayscale' : ''}`}
                                                  >
                                                    {s.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">整理券配布状況</label>
                                            <div className="grid grid-cols-3 gap-2">
                                              {[
                                                { id: 'none', label: 'なし' },
                                                { id: 'distributing', label: '配布中' },
                                                { id: 'ended', label: '終了' }
                                              ].map(s => {
                                                const isPastLocal = isPerformancePast(perf);
                                                const displayStatus = isPastLocal && perf.status !== 'none' ? 'ended' : perf.status;
                                                return (
                                                  <button
                                                    key={s.id}
                                                    onClick={() => handleLocalPerformanceUpdate(perf.id, 'status', s.id)}
                                                    disabled={isPastLocal}
                                                    className={`py-4 rounded-2xl text-[10px] font-black transition-all border-2 ${displayStatus === s.id
                                                      ? s.id === 'distributing' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' :
                                                        s.id === 'ended' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10' :
                                                        'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10'
                                                      : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100 hover:bg-slate-50'
                                                      } ${isPastLocal ? 'opacity-30 cursor-not-allowed filter grayscale' : ''}`}
                                                  >
                                                    {s.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
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

      <Portal>
        <AnimatePresence>
          {confirmDialog.isOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
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
                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    className="order-2 md:order-1 flex-1 py-4 text-slate-400 font-black text-sm hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="order-1 md:order-2 flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all"
                  >
                    {confirmDialog.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
      <Portal>
        <AnimatePresence>
          {(loading || updating) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-auto"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-slate-100 border-t-brand-600 rounded-full"
                />
              </div>
              <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                {updating ? '更新中...' : '読み込み中...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};

export default GroupDashboard;
