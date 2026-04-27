import { useState, useEffect, useMemo, forwardRef } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Users, PackageSearch, ShieldCheck,
  Lock, Unlock, Plus, RefreshCw, MapPin,
  LogOut, CheckCircle2, Clock, Edit2, XCircle, X, Trash2,
  AlertTriangle, Info, Ticket, Save, Filter, Loader2,
  ChevronDown, Search, Calendar, Bell, AlertCircle, MessageSquare, SortDesc,
  Monitor
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerRevalidate } from '../../../lib/revalidate';
import Portal from '../../../components/Portal';

const DEPARTMENTS = ['すべて', '体験', '食品', '公演', '展示', '冊子', '物販'];
const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const formatRelativeTime = (isoString) => {
  if (!isoString) return 'データなし';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
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
};

const normalizeString = (str) => {
  if (!str) return '';
  let result = str.normalize('NFKC').toLowerCase();
  result = result.replace(/[年組\-_\s　.,:;!"'()\[\]{}（）]/g, '');
  result = result.replace(/[\u30a1-\u30f6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
  return result;
};

const GRADES = ['すべて', '1年', '2年', '3年', '有志'];
const BUILDINGS = ['すべて', '仮校舎', '体育館', 'セミナー', '南館'];

const HQGroupCard = forwardRef(({
  g,
  selectedDept,
  setEditingGroup,
  setIsEditModalOpen,
  requireConfirm,
}, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const departments = useMemo(() => (g.department || '').split(',').filter(Boolean).map(d => d.trim()), [g.department]);
  const isPerformance = g.has_performances || (g.department || '').includes('公演');

  const getStatusColors = (status, type) => {
    if (type === 'reception') {
      if (status === 'closed' || status === 'ended') return 'text-rose-600';
      if (status === 'before_open') return 'text-slate-400';
      if (status === 'ticket_only') return 'text-brand-600';
      return 'text-emerald-600';
    } else {
      if (status === 'distributing') return 'text-emerald-600';
      return 'text-slate-400';
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      key={g.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="group bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {departments.sort((a, b) => DEPARTMENTS.indexOf(a) - DEPARTMENTS.indexOf(b)).map(dept => (
              <span key={dept} className="text-[9px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider">
                {dept}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-brand-600 transition-colors">
            {g.name}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-slate-400 font-bold flex items-center">
              <MapPin size={12} className="mr-1.5 opacity-50" />
              {g.building}
            </p>
            <span className="text-[11px] text-slate-400 font-bold">{g.room}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 scale-90 origin-top-right">
          <div className={`w-[110px] py-1.5 rounded-full text-[9px] font-black flex items-center justify-center gap-1.5 border shadow-sm ${g.editing_locked ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
            {g.editing_locked ? <Lock size={10} strokeWidth={3} /> : <Unlock size={10} strokeWidth={3} />}
            <span>{g.editing_locked ? 'ロック中' : '許可中'}</span>
          </div>
          {!isPerformance ? (
            <>
              {g.has_reception && (
                <div className={`w-[110px] py-1.5 rounded-full border shadow-sm text-[9px] font-black flex items-center justify-center gap-1.5 ${g.reception_status === 'closed' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                    g.reception_status === 'before_open' ? 'bg-slate-50 border-slate-100 text-slate-400' :
                      g.reception_status === 'ticket_only' ? 'bg-brand-50 border-brand-100 text-brand-600' :
                        'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}>
                  <Info size={10} strokeWidth={3} />
                  {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了' }[g.reception_status] || g.reception_status}
                </div>
              )}
              {g.has_ticket_status && (
                <div className={`w-[110px] py-1.5 rounded-full border shadow-sm text-[9px] font-black flex items-center justify-center gap-1.5 ${g.ticket_status === 'distributing' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    g.ticket_status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                      g.ticket_status === 'limited' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                        'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                  <Ticket size={10} strokeWidth={3} />
                  {{ distributing: '配布中', ended: '配布終了', limited: '残りわずか', none: '配布なし' }[g.ticket_status] || g.ticket_status}
                </div>
              )}
              {g.has_waiting_time && !['closed', 'ended', 'before_open'].includes(g.reception_status) && (
                <div className={`w-[110px] py-1.5 rounded-full border shadow-sm text-[9px] font-black flex items-center justify-center gap-1.5 ${g.waiting_time <= 10 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    g.waiting_time <= 30 ? 'bg-amber-50 border-amber-100 text-amber-600' :
                      'bg-rose-50 border-rose-100 text-rose-600'
                  }`}>
                  <Clock size={10} strokeWidth={3} />
                  {g.waiting_time === 0 ? '待ちなし' : `${g.waiting_time}分待ち`}
                </div>
              )}
            </>
          ) : (
            <div className="w-[110px] py-1.5 rounded-full text-[9px] font-black flex items-center justify-center gap-1.5 border shadow-sm bg-slate-50 border-slate-100 text-slate-400">
              <Info size={10} strokeWidth={3} />
              <span>公演情報</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-brand-600 truncate flex-1">
            {g.title || 'Official Program'}
          </span>
        </div>


        {isPerformance && (g.performances || []).length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 group/btn ${isExpanded
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-100 hover:border-brand-300 hover:bg-brand-50/10 shadow-sm hover:shadow-md'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-all duration-500 ${isExpanded ? 'bg-brand-600 text-white rotate-[360deg]' : 'bg-brand-50 text-brand-600 group-hover/btn:scale-110'}`}>
                  <Calendar size={14} strokeWidth={3} />
                </div>
                <div className="flex flex-col items-start translate-y-[-1px]">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">公演スケジュール</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {isExpanded ? 'タップで閉じる' : 'タップしてすべての回を表示'}
                  </span>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-brand-100 text-brand-600 shadow-inner' : 'bg-slate-50 text-slate-400 group-hover/btn:bg-brand-50 group-hover/btn:text-brand-600'}`}>
                <ChevronDown
                  size={18}
                  strokeWidth={3}
                  className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-6 pt-2 pb-2">
                    {[1, 2, 3].map(partId => {
                      const partPerfs = (g.performances || []).filter(p => p.part_id === partId).sort((a, b) => {
                        const timeA = (a.start_time || '').padStart(5, '0');
                        const timeB = (b.start_time || '').padStart(5, '0');
                        return timeA.localeCompare(timeB);
                      });
                      if (!partPerfs || partPerfs.length === 0) return null;

                      const nextPerf = (() => {
                        const now = new Date();
                        const sorted = (g.performances || [])
                          .map(p => {
                            const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
                            const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
                            const startTime = new Date(`${festDate}T${parseTime(p.start_time)}:00`);
                            const endTime = p.end_time ? new Date(`${festDate}T${parseTime(p.end_time)}:00`) : startTime;
                            return { ...p, startTime, endTime };
                          })
                          .filter(p => p.startTime > now)
                          .sort((a, b) => a.startTime - b.startTime);
                        return sorted[0] || null;
                      })();

                      return (
                        <div key={partId} className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <div className="w-1 h-3 bg-brand-500 rounded-full" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Part {partId} ({partId === 3 ? '6/14' : '6/13'})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {partPerfs.map(p => {
                              const isNext = nextPerf && p.id === nextPerf.id;
                              const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
                              const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
                              const startTime = new Date(`${festDate}T${parseTime(p.start_time)}:00`);
                              const endTime = p.end_time ? new Date(`${festDate}T${parseTime(p.end_time)}:00`) : startTime;
                              const isPast = endTime < new Date();
                              const isOngoing = !isPast && startTime <= new Date();
                              const isOver = isPast;
                              const actualTicket = (isOver && p.status !== 'none') ? 'ended' : p.status;

                              return (
                                <div key={p.id} className={`px-4 ${(!g.has_reception && !g.has_ticket_status) ? 'py-4' : 'py-3'} rounded-xl border transition-all flex flex-col justify-center gap-1 shadow-sm hover:shadow-md ${isPast ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-60 saturate-50' : (isNext || isOngoing) ? 'bg-brand-50 text-brand-700 border-brand-400' : 'bg-white text-slate-600 border-slate-200'}`}>
                                <div className={`flex justify-between items-center ${(!g.has_reception && !g.has_ticket_status) ? 'flex-1' : ''}`}>
                                  <span className="text-xs font-black">
                                    {p.start_time}{p.end_time && ` ～ ${p.end_time}`}
                                  </span>
                                  {(isNext || isOngoing) && (
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter animate-pulse ${isOngoing ? 'bg-rose-600 text-white' : 'bg-brand-600 text-white'}`}>
                                      {isOngoing ? 'Now' : 'Next'}
                                    </span>
                                  )}
                                </div>
                                {(g.has_reception || g.has_ticket_status) && (
                                  <div className="flex flex-col gap-1.5 mt-2">
                                    {g.has_reception && (
                                      <div className={`flex items-center justify-start gap-1.5 text-[8px] font-black ${isOver ? 'text-slate-400' : (isOver ? 'closed' : p.reception_status) === 'ticket_only' ? 'text-brand-600' :
                                          (isOver ? 'closed' : p.reception_status) === 'before_open' ? 'text-slate-400' :
                                            ['closed', 'ended'].includes(isOver ? 'closed' : p.reception_status) ? 'text-rose-600' :
                                              'text-emerald-600'
                                        }`}>
                                        <CheckCircle2 size={8} strokeWidth={3} className="shrink-0 -translate-y-[0.5px]" />
                                        {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了' }[isOver ? 'closed' : (p.reception_status || 'open')]}
                                      </div>
                                    )}
                                    {g.has_ticket_status && (
                                      <div className={`flex items-center justify-start gap-1.5 text-[8px] font-black ${isOver ? 'text-slate-400' : actualTicket === 'ended' ? 'text-rose-600' :
                                          actualTicket === 'none' ? 'text-slate-400' :
                                            'text-emerald-600'
                                        }`}>
                                        <Ticket size={8} strokeWidth={3} className="shrink-0 -translate-y-[0.5px]" />
                                        {{ distributing: '配布中', ended: '配布終了', none: '配布なし' }[actualTicket]}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300">
          <RefreshCw size={8} />
          <span>更新: {formatRelativeTime(g.updated_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              requireConfirm('セッションを\n【強制終了】させますか？', async () => {
                await supabase.from('groups').update({ last_reset_at: new Date().toISOString() }).eq('id', g.id);
                await fetchData();
              }, '強制終了');
            }}
            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
          >
            <LogOut size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingGroup(g);
              setIsEditModalOpen(true);
            }}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 active:scale-95"
          >
            編集
          </button>
        </div>
      </div>
    </motion.div>
  );
});
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
const HQDashboard = () => {
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedDept, setSelectedDept] = useState('すべて');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null, confirmText: '実行', icon: null });
  const [editingGroup, setEditingGroup] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [editingLostFound, setEditingLostFound] = useState(null);
  const [isLostFoundModalOpen, setIsLostFoundModalOpen] = useState(false);


  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterGrade, setFilterGrade] = useState('すべて');
  const [filterBuilding, setFilterBuilding] = useState('すべて');
  const [isRestored, setIsRestored] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // フィルター・検索状態の復元
  useEffect(() => {
    const saved = sessionStorage.getItem('ryoun_hq_filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.activeTab) setActiveTab(filters.activeTab);
        if (filters.selectedDept) setSelectedDept(filters.selectedDept);
        if (filters.searchQuery) setSearchQuery(filters.searchQuery);
        if (filters.filterGrade) setFilterGrade(filters.filterGrade);
        if (filters.filterBuilding) setFilterBuilding(filters.filterBuilding);
        if (filters.sortBy) setSortBy(filters.sortBy);
        if (filters.isFilterOpen !== undefined) setIsFilterOpen(filters.isFilterOpen);
        if (filters.isBulkOpen !== undefined) setIsBulkOpen(filters.isBulkOpen);
      } catch (e) {
        console.error('Failed to parse saved filters', e);
      }
    }
    setIsRestored(true);
  }, []);

  // フィルター・検索状態の保存
  useEffect(() => {
    if (!isRestored) return;
    const state = { activeTab, selectedDept, searchQuery, filterGrade, filterBuilding, isFilterOpen, isBulkOpen, sortBy };
    sessionStorage.setItem('ryoun_hq_filters', JSON.stringify(state));
  }, [activeTab, selectedDept, searchQuery, filterGrade, filterBuilding, isFilterOpen, isBulkOpen, sortBy, isRestored]);

  const filteredAndSortedGroups = useMemo(() => {
    return groups
      .filter(g => {
        if (g.id === '8d112d95-14cb-4eee-8a5f-2580f502668a') return false;
        const matchesDept = selectedDept === 'すべて' || (g.department || '').split(',').filter(Boolean).map(d => d.trim()).includes(selectedDept);
        const matchesGrade = filterGrade === 'すべて' || (filterGrade === '有志' ? !['1年', '2年', '3年'].some(year => g.name.startsWith(year)) : g.name.startsWith(filterGrade));
        const matchesBuilding = filterBuilding === 'すべて' || g.building === filterBuilding;

        if (!matchesDept || !matchesGrade || !matchesBuilding) return false;
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const normalizedQuery = normalizeString(searchQuery);

        return (
          g.name?.toLowerCase().includes(query) ||
          normalizeString(g.name).includes(normalizedQuery) ||
          (g.name_kana && normalizeString(g.name_kana).includes(normalizedQuery)) ||
          g.title?.toLowerCase().includes(query) ||
          normalizeString(g.title).includes(normalizedQuery) ||
          (g.title_kana && normalizeString(g.title_kana).includes(normalizedQuery)) ||
          g.building?.toLowerCase().includes(query) ||
          normalizeString(g.building).includes(normalizedQuery) ||
          g.room?.toLowerCase().includes(query) ||
          normalizeString(g.room).includes(normalizedQuery)
        );
      })
      .sort((a, b) => {
        let result = 0;
        if (sortBy === 'time-asc') {
          result = (a.waiting_time || 0) - (b.waiting_time || 0);
        } else if (sortBy === 'time-desc') {
          result = (b.waiting_time || 0) - (a.waiting_time || 0);
        } else if (sortBy === 'title') {
          const keyA = a.title_kana || a.title || a.name || '';
          const keyB = b.title_kana || b.title || b.name || '';
          result = keyA.localeCompare(keyB, 'ja', { numeric: true });
        }

        if (result !== 0) return result;

        const getPriority = (name) => {
          if (!name) return 4;
          if (name.startsWith('1年')) return 1;
          if (name.startsWith('2年')) return 2;
          if (name.startsWith('3年')) return 3;
          return 4;
        };

        const priorityA = getPriority(a.name);
        const priorityB = getPriority(b.name);
        if (priorityA !== priorityB) return priorityA - priorityB;

        const getSortKey = (g, priority) => {
          if (priority < 4) return g.name || '';
          if (g.name_kana) return g.name_kana;
          if (g.title_kana) return g.title_kana;
          return g.name || '';
        };
        return getSortKey(a, priorityA).localeCompare(getSortKey(b, priorityB), 'ja', { numeric: true });
      });
  }, [groups, selectedDept, filterGrade, filterBuilding, searchQuery, sortBy]);

  useEffect(() => {
    if (confirmDialog.isOpen || isEditModalOpen || isLostFoundModalOpen || loading || isBulkUpdating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [confirmDialog.isOpen, isEditModalOpen, isLostFoundModalOpen, loading, isBulkUpdating]);
  const router = useRouter();
  const requireConfirm = (message, onConfirm, confirmText = '実行する', icon = null) => {
    setConfirmDialog({ isOpen: true, message, onConfirm, confirmText, icon });
  };
  const handleLogout = async () => {
    requireConfirm(
      '本部管理画面から\n【ログアウト】しますか？',
      async () => {
        try {
          // 手動ログアウトフラグを先にセットしてリダイレクト時の誤検知を防ぐ
          sessionStorage.setItem('ryoun_manual_logout', 'true');
          
          localStorage.removeItem('ryoun_auth_type');
          localStorage.removeItem('ryoun_group_id');
          localStorage.removeItem('ryoun_password');
          localStorage.removeItem('ryoun_login_at');
          sessionStorage.removeItem('ryoun_hq_filters');

          await supabase.auth.signOut();
        } catch (e) {
          console.error('Logout error:', e);
        } finally {
          router.push('/admin');
        }
      },
      'ログアウト',
      <LogOut className="w-7 h-7 md:w-8 md:h-8" />
    );
  };
  useEffect(() => {
    const authType = localStorage.getItem('ryoun_auth_type');
    const isManualLogout = sessionStorage.getItem('ryoun_manual_logout');
    if (authType !== 'hq' && router.pathname.startsWith('/admin/hq')) { 
      localStorage.removeItem('ryoun_auth_type');
      localStorage.removeItem('ryoun_group_id');
      if (isManualLogout) {
        sessionStorage.removeItem('ryoun_manual_logout');
        router.replace('/admin');
      } else {
        router.replace('/admin?message=timeout');
      }
      return; 
    }
    if (isManualLogout) sessionStorage.removeItem('ryoun_manual_logout');

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const isManual = sessionStorage.getItem('ryoun_manual_logout');
        if (isManual) {
          sessionStorage.removeItem('ryoun_manual_logout');
          router.replace('/admin');
        } else {
          localStorage.removeItem('ryoun_auth_type');
          localStorage.removeItem('ryoun_group_id');
          router.replace('/admin?message=timeout');
        }
      }
    };
    checkSession();

    fetchData();
    const channels = [
      supabase.channel('hq_realtime')
        .on('postgres_changes', { event: '*', table: 'groups' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'performances' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'lost_found' }, fetchData).subscribe()
    ];
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, [router]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gData, error: gError } = await supabase
        .from('groups')
        .select('id, name, title, building, room, department, password, updated_at, last_reset_at, editing_locked, reception_status, waiting_time, ticket_status, has_reception, has_waiting_time, has_ticket_status, has_performances, name_kana, title_kana, performances(id, group_id, part_id, start_time, end_time, status, reception_status)')
        .order('name');
      if (gError) throw gError;
      if (gData) setGroups(gData);
      const { data: lData, error: lError } = await supabase.from('lost_found').select('*').order('found_at', { ascending: false });
      if (lError) throw lError;
      if (lData) setLostFound(lData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleBulkStatusUpdate = async (status) => {
    setIsBulkUpdating(true);
    try {
      const EXCLUDED_ID = '8d112d95-14cb-4eee-8a5f-2580f502668a';
      const targetGroups = groups.filter(g =>
        g.id !== EXCLUDED_ID &&
        !((g.department || '').split(',').map(d => d.trim()).includes('公演'))
      );

      console.log('Bulk updating groups:', targetGroups.map(g => g.name));

      if (targetGroups.length > 0) {
        const groupIds = targetGroups.map(g => g.id);
        const { data, error } = await supabase.from('groups')
          .update({
            reception_status: status,
            updated_at: new Date().toISOString()
          })
          .in('id', groupIds)
          .select();

        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('更新対象が見つかりません。権限がないか、セッションが切れている可能性があります。');
        }

        // alert(`一括更新を完了しました。（${data.length}件）`);
      } else {
        alert('対象となる団体（公演団体を除く）が見つかりませんでした。');
      }

      await fetchData();
      triggerRevalidate();
    } catch (error) {
      console.error('Bulk update error:', error);
      alert(`エラーが発生しました: ${error.message}\n(一度ログアウトして再ログインを試してください)`);
    } finally {
      setIsBulkUpdating(false);
    }
  };
  const handleBulkLockUpdate = async (locked) => {
    setIsBulkUpdating(true);
    try {
      const EXCLUDED_ID = '8d112d95-14cb-4eee-8a5f-2580f502668a';
      const targetGroups = groups.filter(g =>
        g.id !== EXCLUDED_ID &&
        !((g.department || '').split(',').map(d => d.trim()).includes('公演'))
      );

      if (targetGroups.length > 0) {
        const groupIds = targetGroups.map(g => g.id);
        const { data, error } = await supabase.from('groups')
          .update({
            editing_locked: locked,
            updated_at: new Date().toISOString()
          })
          .in('id', groupIds)
          .select();

        if (error) throw error;
        // alert(`${data?.length || 0}件の編集権限を一括更新しました。`);
      } else {
        alert('対象となる団体が見つかりませんでした。');
      }

      await fetchData();
      triggerRevalidate();
    } catch (error) {
      console.error('Bulk lock error:', error);
      alert(`一括ロック更新に失敗しました: ${error.message}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };
  const handleBulkLogout = async () => {
    setIsBulkUpdating(true);
    try {
      const EXCLUDED_ID = '8d112d95-14cb-4eee-8a5f-2580f502668a';
      const targetGroups = groups.filter(g =>
        g.id !== EXCLUDED_ID &&
        !((g.department || '').split(',').map(d => d.trim()).includes('公演'))
      );

      if (targetGroups.length > 0) {
        const groupIds = targetGroups.map(g => g.id);
        const { data, error } = await supabase.from('groups')
          .update({
            last_reset_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', groupIds)
          .select();

        if (error) throw error;
        // alert(`${data?.length || 0}件を一括ログアウトさせました。`);
      } else {
        alert('対象となる団体が見つかりませんでした。');
      }

      await fetchData();
      triggerRevalidate();
    } catch (error) {
      console.error('Bulk logout error:', error);
      alert(`一括ログアウトに失敗しました: ${error.message}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };
  const handleDeleteLostFound = async (id) => {
    requireConfirm('この落とし物情報を\n【削除】しますか？', async () => {
      await supabase.from('lost_found').delete().eq('id', id);
      fetchData();
      triggerRevalidate();
    }, '削除');
  };


  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-slate-100 border-t-brand-600 rounded-full"
          />
        </div>
        <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
          初期化中...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 md:space-y-10 pb-12 pt-4 px-4">
      {/* HQ Header */}
      <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10">
        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-brand-600 text-white rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-500/30 shrink-0">
            <ShieldCheck className="w-8 h-8 md:w-12 md:h-12" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter">本部管理画面</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.open('/admin/hq/projector', '_blank')}
            className="w-full md:w-auto px-6 md:px-10 py-4 md:py-5 bg-brand-50 text-brand-600 rounded-2xl md:rounded-3xl text-sm md:text-base font-black transition-all hover:bg-brand-600 hover:text-white border border-transparent hover:border-brand-100 flex items-center justify-center gap-3 md:gap-4 shadow-sm"
          >
            <Monitor className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" strokeWidth={2.5} />
            投影用画面
          </button>
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-6 md:px-10 py-4 md:py-5 bg-slate-50 text-slate-500 rounded-2xl md:rounded-3xl text-sm md:text-base font-black transition-all hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 flex items-center justify-center gap-3 md:gap-4 shadow-sm"
          >
            <LogOut className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" strokeWidth={2.5} />
            ログアウト
          </button>
        </div>
      </div>
      {/* HQ Status Control */}
      {(() => {
        const hqGroup = groups.find(g => g.name === '文化委員会');
        if (!hqGroup) return null;

        const handleHQStatusUpdate = async (status) => {
          try {
            const { error } = await supabase.from('groups').update({
              reception_status: status
            }).eq('id', hqGroup.id);
            if (error) throw error;
            fetchData();
          } catch (e) {
            console.error(e);
          }
        };
        return (
          <div className="bg-white border border-brand-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-brand-500/5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
            <div className="flex items-center gap-5 md:gap-7 relative z-10">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-5">
                  <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">文化委員会本部 受付状況</h2>
                  <div className={`w-fit px-4 py-1.5 rounded-full text-[11px] font-black flex items-center gap-2 border-2 transition-all cursor-default ${hqGroup.reception_status === 'open' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10' :
                    hqGroup.reception_status === 'before_open' ? 'bg-slate-50 border-slate-100 text-slate-400' :
                      hqGroup.reception_status === 'ticket_only' ? 'bg-brand-50 border-brand-100 text-brand-600 shadow-sm shadow-brand-500/10' :
                        'bg-rose-50 border-rose-100 text-rose-600 shadow-sm shadow-rose-500/10'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hqGroup.reception_status === 'open' ? 'bg-emerald-500 animate-pulse' : hqGroup.reception_status === 'before_open' ? 'bg-slate-300' : hqGroup.reception_status === 'ticket_only' ? 'bg-brand-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    {{ open: '受付中', before_open: '受付前', ticket_only: '整理券のみ', closed: '受付終了' }[hqGroup.reception_status]}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto relative z-10">
              {[
                { id: 'before_open', label: '受付前', color: 'hover:bg-slate-600 hover:text-white bg-slate-50 text-slate-500', icon: <Clock size={14} /> },
                { id: 'open', label: '受付中', color: 'hover:bg-emerald-600 hover:text-white bg-emerald-50 text-emerald-600', icon: <CheckCircle2 size={14} /> },
                { id: 'closed', label: '受付終了', color: 'hover:bg-rose-600 hover:text-white bg-rose-50 text-rose-600', icon: <XCircle size={14} /> }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => requireConfirm(`本部受付状況を\n【${s.label}】に変更しますか？`, () => handleHQStatusUpdate(s.id), s.label)}
                  className={`flex-1 md:flex-none px-4 md:px-8 py-4 md:py-5 rounded-2xl text-[10px] md:text-[11px] font-black transition-all border border-transparent whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 ${hqGroup.reception_status === s.id ? 'opacity-30 cursor-not-allowed pointer-events-none' : s.color}`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Header sections moved to activeTab === 'groups' */}

      {/* Tabs / Navigation */}
      <div className="flex w-full overflow-hidden py-2 md:py-4">
        <div className="flex w-full p-1 md:p-2 bg-slate-100/80 backdrop-blur-md rounded-2xl md:rounded-[2.5rem] border border-slate-200/50 shadow-inner">
          {[
            { id: 'groups', label: '団体管理', icon: <Users className="w-4 h-4 md:w-[18px] md:h-[18px]" /> },
            { id: 'lost_found', label: '落とし物', icon: <PackageSearch className="w-4 h-4 md:w-[18px] md:h-[18px]" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 justify-center px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-black transition-all flex items-center gap-2 md:gap-3 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-brand-700 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === 'groups' && (
        <div className="space-y-6 md:space-y-10 pt-2 md:pt-4">
          {/* Bulk Management (Permanently Visible) */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="w-full px-8 py-6 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <RefreshCw className={`w-5 h-5 ${isBulkUpdating ? 'animate-spin' : ''}`} />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-800 tracking-tight text-lg">全団体一括操作</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">※本部･公演団体を除く</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                {/* Group 1: Reception */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">受付状況</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => requireConfirm(`全団体の受付状況を\n【受付前】にしますか？`, () => handleBulkStatusUpdate('before_open'), '受付前')}
                      disabled={isBulkUpdating}
                      className="py-4 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black border border-slate-100 hover:bg-slate-600 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    >
                      <Clock size={14} />
                      <span>受付前</span>
                    </button>
                    <button
                      onClick={() => requireConfirm(`全団体の受付状況を\n【受付中】にしますか？`, () => handleBulkStatusUpdate('open'), '受付開始')}
                      disabled={isBulkUpdating}
                      className="py-4 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>受付開始</span>
                    </button>
                    <button
                      onClick={() => requireConfirm(`全団体の受付状況を\n【受付終了】にしますか？`, () => handleBulkStatusUpdate('closed'), '受付終了')}
                      disabled={isBulkUpdating}
                      className="py-4 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-100 hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    >
                      <XCircle size={14} />
                      <span>受付終了</span>
                    </button>
                  </div>
                </div>
                {/* Group 2: Lock Control */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">編集権限</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => requireConfirm(`全団体の編集権限を\n【剥奪】しますか？`, () => handleBulkLockUpdate(true), '権限剥奪')}
                      disabled={isBulkUpdating}
                      className="py-4 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-100 hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    >
                      <Lock size={14} />
                      <span>権限剥奪</span>
                    </button>
                    <button
                      onClick={() => requireConfirm(`全団体の編集権限を\n【付与】しますか？`, () => handleBulkLockUpdate(false), '権限付与')}
                      disabled={isBulkUpdating}
                      className="py-4 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black border border-slate-100 hover:bg-slate-600 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    >
                      <Unlock size={14} />
                      <span>権限付与</span>
                    </button>
                  </div>
                </div>
                {/* Group 3: Session Management */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">セッション管理</span>
                  <button
                    onClick={() => requireConfirm(`全団体のセッションを\n【強制終了】させますか？`, () => handleBulkLogout(), '強制終了')}
                    disabled={isBulkUpdating}
                    className="py-4 h-full rounded-xl bg-slate-900 text-white text-[10px] font-black shadow-lg shadow-slate-900/10 hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <LogOut size={14} />
                    <span>強制終了</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar (Moved here) */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={22} className="text-slate-300 group-focus-within:text-brand-500 transition-colors" strokeWidth={3} />
            </div>
            <input
              type="text"
              placeholder="団体を検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-[2rem] md:rounded-3xl py-4 md:py-6 pl-14 md:pl-16 pr-14 md:pr-16 text-base md:text-lg font-bold text-slate-700 placeholder:text-slate-300 outline-none transition-all focus:border-brand-500 focus:ring-8 focus:ring-brand-500/5 shadow-sm hover:shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-6 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={22} strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-5 md:p-8 shadow-sm overflow-hidden">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-4 text-slate-900">
                <div className={`p-3 rounded-2xl transition-all duration-500 ${isFilterOpen ? 'bg-brand-600 text-white rotate-[360deg]' : 'bg-brand-50 text-brand-600 shadow-sm transition-transform group-hover:scale-110'}`}>
                  <Filter size={20} strokeWidth={2.5} />
                </div>
                <div className="text-left flex flex-col gap-0.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black tracking-tight">絞り込み</h2>
                    {!isFilterOpen && (selectedDept !== 'すべて' || filterGrade !== 'すべて' || filterBuilding !== 'すべて') && (
                      <div className="flex flex-wrap gap-1.5">
                        {[filterGrade, selectedDept, filterBuilding].filter(f => f !== 'すべて').map(f => (
                          <span key={f} className="px-2 py-0.5 bg-brand-600 text-white text-[10px] rounded-lg font-black shadow-sm shadow-brand-500/20 animate-in fade-in zoom-in duration-300">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">タップして 学年・部門・場所 で団体を絞り込む</p>
                </div>
              </div>
              <div className={`p-2 rounded-full transition-all duration-300 ${isFilterOpen ? 'bg-brand-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                <ChevronDown size={20} />
              </div>
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col space-y-8 pt-8 pb-4">
                    <div className="flex flex-col space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                        <div className="w-1 h-3 bg-brand-600 rounded-full"></div> 学年・有志
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {GRADES.map(g => (
                          <button
                            key={g}
                            onClick={() => setFilterGrade(g)}
                            className={`min-w-[5rem] px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${filterGrade === g ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                        <div className="w-1 h-3 bg-brand-600 rounded-full"></div> 部門
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {DEPARTMENTS.map(d => (
                          <button
                            key={d}
                            onClick={() => setSelectedDept(d)}
                            className={`min-w-[5rem] px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${selectedDept === d ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                        <div className="w-1 h-3 bg-brand-600 rounded-full"></div> 場所
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {BUILDINGS.map(b => (
                          <button
                            key={b}
                            onClick={() => setFilterBuilding(b)}
                            className={`min-w-[5rem] px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${filterBuilding === b ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>



          {/* Sort Controls */}
          <div className="flex justify-end px-2">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <SortDesc size={14} className="text-brand-600/50" /> 並び替え
              </span>
              <div className="relative group">
                <select
                  className="w-full min-w-[180px] bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-5 pr-12 text-xs font-black text-slate-700 outline-none transition-all focus:border-brand-500 focus:bg-white appearance-none cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">団体名順</option>
                  <option value="title">タイトル順</option>
                  <option value="time-asc">待ち時間 (短い順)</option>
                  <option value="time-desc">待ち時間 (長い順)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-brand-600 transition-colors">
                  <ChevronDown size={14} strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedGroups
                .map(g => (
                  <HQGroupCard
                    key={g.id}
                    g={g}
                    selectedDept={selectedDept}
                    setEditingGroup={setEditingGroup}
                    setIsEditModalOpen={setIsEditModalOpen}
                    requireConfirm={requireConfirm}
                    fetchData={fetchData}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))
              }
            </AnimatePresence>
          </div>
        </div>
      )}


      {activeTab === 'lost_found' && (
        <div className="space-y-6 md:space-y-8 pt-2 md:pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">落とし物管理</h3>
            <button
              onClick={() => {
                setEditingLostFound({ name: '', location: '', features: '', found_at: new Date().toISOString(), is_returned: false });
                setIsLostFoundModalOpen(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-brand-600 text-white rounded-2xl md:rounded-[1.5rem] font-black text-sm shadow-2xl shadow-brand-500/30 hover:bg-brand-700 active:scale-95 transition-all">
              <Plus size={20} className="md:w-5.5 md:h-5.5" strokeWidth={3} />
              新規追加
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lostFound.map(item => (
              <div key={item.id} className={`relative bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 group flex flex-col items-start gap-6 transition-all duration-300 ${item.is_returned ? 'shadow-none border-slate-100' : 'shadow-md shadow-slate-200/30 hover:shadow-xl hover:shadow-brand-900/5'}`}>
                {item.is_returned ? (
                  <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center justify-center gap-1.5 px-3 py-1 min-w-[80px] bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300 z-10">
                    <CheckCircle2 size={12} strokeWidth={3} />
                    <span>返却済み</span>
                  </div>
                ) : (
                  <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center justify-center gap-1.5 px-3 py-1 min-w-[80px] bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black border border-brand-100 shadow-sm animate-in fade-in zoom-in duration-300 z-10">
                    <AlertCircle size={12} strokeWidth={3} />
                    <span>未返却</span>
                  </div>
                )}
                
                <div className={`w-full space-y-6 ${item.is_returned ? 'opacity-60 saturate-50' : ''}`}>
                  <div className="flex justify-between items-start w-full gap-4">
                    <div>
                      <h3 className={`font-black text-xl leading-tight ${item.is_returned ? 'text-slate-500' : 'text-brand-600'}`}>{item.name}</h3>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center text-[10px] font-bold text-slate-400">
                          <Clock size={12} className="mr-1" />
                          拾得日時: {formatDateTime(item.found_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="p-4 md:p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-black block mb-2 uppercase tracking-widest">拾得場所</span>
                      <p className="text-slate-700 text-sm font-bold leading-tight">{item.location}</p>
                    </div>

                    <div className="p-4 md:p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-black block mb-2 uppercase tracking-widest">特徴・詳細</span>
                      <p className="text-slate-700 text-sm font-bold leading-tight whitespace-pre-wrap">{item.features || 'なし'}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditingLostFound(item);
                      setIsLostFoundModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 active:scale-95 flex items-center gap-2"
                  >
                    <Edit2 size={14} strokeWidth={3} />
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteLostFound(item.id)}
                    className="px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[11px] font-black transition-all hover:bg-rose-600 hover:text-white active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 size={14} strokeWidth={3} />
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
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
                onClick={e => e.stopPropagation()}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
                  {confirmDialog.icon || <AlertTriangle className="w-7 h-7 md:w-8 md:h-8" />}
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 md:mb-8 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedMessage(confirmDialog.message)}
                </h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    className="order-2 md:order-1 flex-1 py-4 text-slate-400 font-black text-sm hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={async () => {
                      const action = confirmDialog.onConfirm;
                      // 先にダイアログを閉じることでフリーズ感を防ぐ
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                      if (action) await action();
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
      {/* Edit Group Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingGroup && (
          <Portal>
            <EditGroupModal
              group={editingGroup}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingGroup(null);
              }}
              onSave={fetchData}
            />
          </Portal>
        )}
      </AnimatePresence>
      {/* Lost & Found Modal */}
      <AnimatePresence>
        {isLostFoundModalOpen && editingLostFound && (
          <Portal>
            <EditLostFoundModal
              item={editingLostFound}
              onClose={() => {
                setIsLostFoundModalOpen(false);
                setEditingLostFound(null);
              }}
              onSave={fetchData}
            />
          </Portal>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <Portal>
        <AnimatePresence>
          {(loading || isBulkUpdating) && (
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
                {isBulkUpdating ? '更新中...' : '読み込み中...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div >
  );
};
const EditGroupModal = ({ group, onClose, onSave }) => {
  const [editData, setEditData] = useState({
    reception_status: group.reception_status || 'before_open',
    waiting_time: group.waiting_time || 0,
    ticket_status: group.ticket_status || 'none'
  });
  const [performances, setPerformances] = useState(JSON.parse(JSON.stringify(group.performances || [])));
  const [editingLocked, setEditingLocked] = useState(group.editing_locked);
  const [isSaving, setIsSaving] = useState(false);

  const nextPerf = useMemo(() => {
    const now = new Date();
    const sorted = [...performances]
      .map(p => {
        const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
        const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
        return { ...p, fullDate: new Date(`${festDate}T${parseTime(p.start_time)}:00`) };
      })
      .filter(p => p.fullDate && !isNaN(p.fullDate.getTime()) && p.fullDate > now)
      .sort((a, b) => a.fullDate - b.fullDate);
    return sorted[0] || null;
  }, [performances]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const password = group.password;

      // 1. Update group general settings & status (Secure RPC)
      const { error: groupError } = await supabase.rpc('update_group_secure', {
        target_id: group.id,
        provided_password: password,
        new_reception_status: editData.reception_status,
        new_waiting_time: editData.waiting_time,
        new_ticket_status: editData.ticket_status,
        // editing_locked は現時点のRPCには含まれていない可能性があるため、もし必要なら後で直接updateも試行
      });

      if (groupError) throw groupError;

      // HQ独自の編集ロック機能（もしRPCに含まれていない場合は直接更新）
      if (editingLocked !== group.editing_locked) {
        await supabase.from('groups').update({ editing_locked: editingLocked }).eq('id', group.id);
      }

      // 2. Update performances (Secure RPC)
      const perfUpdates = performances.map(perf => {
        return supabase.rpc('update_performance_secure', {
          target_id: perf.id,
          provided_password: password,
          new_status: perf.status,
          new_reception_status: perf.reception_status || 'open'
        });
      });

      const perfResults = await Promise.all(perfUpdates);
      const firstPerfError = perfResults.find(r => r.error)?.error;
      if (firstPerfError) throw firstPerfError;

      await onSave();
      triggerRevalidate();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setIsSaving(false);
    }
  };
  const handleForceLogout = async () => {
    if (!window.confirm('この団体のセッションを\n【強制終了】させますか？')) return;
    setIsSaving(true);
    try {
      await supabase.from('groups').update({
        last_reset_at: new Date().toISOString()
      }).eq('id', group.id);
      alert('セッションを強制終了しました');
      await onSave();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] mb-1">
              <MapPin size={12} className="text-slate-300" />
              <span>{group.building} {group.room}</span>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{group.name}</h2>
            </div>
            <p className="text-sm font-bold text-slate-400">{group.title || 'Official Program'}</p>
          </div>
        </div>
        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 custom-scrollbar">
          {/* Admin Management Section - ALWAYS AT TOP */}
          <div className="bg-rose-50/50 rounded-3xl p-6 border border-rose-100/50 space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-black text-rose-900 tracking-tight">本部用設定</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setEditingLocked(!editingLocked)}
                className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${editingLocked
                  ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-md ring-2 ring-rose-500/10'
                  : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {editingLocked ? <Lock size={20} strokeWidth={2.5} /> : <Unlock size={20} strokeWidth={2.5} />}
                  <span className="text-[12px] font-black uppercase tracking-widest">{editingLocked ? '編集ロック' : '編集許可'}</span>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${editingLocked ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editingLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {(!(group.has_performances || (group.department || '').includes('公演')) && (group.has_reception || group.has_waiting_time || group.has_ticket_status)) ? (
              <>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">運営状況 管理</h3>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {group.has_reception && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">受付状況</label>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1 overflow-x-auto scrollbar-hide">
                        {(() => {
                          const options = ['before_open', 'open', 'closed'];
                          if (editData.ticket_status === 'distributing' || editData.ticket_status === 'ended') {
                            options.splice(2, 0, 'ticket_only');
                          }
                          return options.map(s => (
                            <button
                              key={s}
                              onClick={() => setEditData(prev => ({ ...prev, reception_status: s }))}
                              className={`flex-1 min-w-fit px-3 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${editData.reception_status === s ?
                                (s === 'open' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' :
                                  s === 'ticket_only' ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-md ring-2 ring-brand-500/10' :
                                    s === 'before_open' ? 'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10' :
                                      'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10')
                                : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                            >
                              {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了' }[s]}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                  {group.has_waiting_time && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">待ち時間</label>
                      <select
                        value={['before_open', 'closed', 'ended'].includes(editData.reception_status) ? 'disabled' : editData.waiting_time}
                        disabled={['before_open', 'closed', 'ended'].includes(editData.reception_status)}
                        onChange={(e) => setEditData(prev => ({ ...prev, waiting_time: parseInt(e.target.value) }))}
                        className={`w-full border-2 rounded-2xl py-4 px-6 text-sm font-black transition-all outline-none ${['before_open', 'closed', 'ended'].includes(editData.reception_status)
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-50 border-transparent text-slate-700 focus:border-brand-500'
                          }`}
                      >
                        {['before_open', 'closed', 'ended'].includes(editData.reception_status) ? (
                          <option value="disabled">選択不可</option>
                        ) : (
                          Array.from({ length: 25 }, (_, i) => i * 5).map(t => (
                            <option key={t} value={t}>{t === 0 ? '待ちなし' : `${t}分待ち`}</option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                  {group.has_ticket_status && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">整理券配布状況</label>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
                        {['none', 'distributing', 'ended'].map(s => (
                          <button
                            key={s}
                            onClick={() => setEditData(prev => ({ ...prev, ticket_status: s }))}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${editData.ticket_status === s ?
                              (s === 'distributing' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' :
                                s === 'ended' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10' :
                                  'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10')
                              : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                          >
                            {{ none: '配布なし', distributing: '配布中', ended: '配布終了' }[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </>
            ) : !(group.has_performances || (group.department || '').includes('公演')) && (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center shrink-0">
                    <Info size={24} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">編集項目はありません</h3>
                </div>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  この団体に設定されている編集可能項目ありません
                </p>
              </div>
            )}
            {(group.has_performances || (group.department || '').includes('公演')) && (
              <div className="space-y-10">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">公演スケジュール 管理</h3>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                {[1, 2, 3].map(partId => {
                  const partPerfs = performances
                    .filter(p => p.part_id === partId)
                    .sort((a, b) => {
                      const timeA = (a.start_time || '').padStart(5, '0');
                      const timeB = (b.start_time || '').padStart(5, '0');
                      return timeA.localeCompare(timeB);
                    });

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
                          const isNext = nextPerf && perf.id === nextPerf.id;
                          const festDate = perf.part_id === 3 ? '2026-06-14' : '2026-06-13';
                          const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
                          const isPast = perf.end_time
                            ? new Date(`${festDate}T${parseTime(perf.end_time)}:00`) < new Date()
                            : new Date(`${festDate}T${parseTime(perf.start_time)}:00`) < new Date();

                          return (
                            <div key={perf.id} className={`p-6 rounded-[2rem] border transition-all space-y-6 ${isPast ? 'opacity-60 saturate-50 bg-slate-50 border-slate-100' :
                                isNext ? 'bg-brand-50/50 border-brand-200 ring-4 ring-brand-500/5' :
                                  'bg-slate-50/50 border-slate-100 shadow-sm'
                              }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                                  <Clock className={`w-4 h-4 ${isNext ? 'text-brand-600' : isPast ? 'text-slate-300' : 'text-slate-400'}`} />
                                  {perf.start_time}{perf.end_time && ` ～ ${perf.end_time}`}
                                  {isNext && <span className="ml-2 bg-brand-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter animate-pulse">Next</span>}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {group.has_reception && (
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">受付状況</label>
                                    <div className="flex bg-white/50 p-1 rounded-xl border border-slate-100 gap-1">
                                      {(() => {
                                        const options = ['before_open', 'open', 'closed'];
                                        if (perf.status === 'distributing' || perf.status === 'ended') {
                                          options.splice(2, 0, 'ticket_only');
                                        }
                                        return options.map(s => (
                                          <button
                                            key={s}
                                            onClick={() => setPerformances(prev => prev.map(p => p.id === perf.id ? { ...p, reception_status: s } : p))}
                                            className={`flex-1 py-2.5 rounded-lg text-[8px] font-black whitespace-nowrap transition-all border-2 ${perf.reception_status === s ?
                                              (s === 'open' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' :
                                                s === 'ticket_only' ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-md ring-2 ring-brand-500/10' :
                                                  s === 'before_open' ? 'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10' :
                                                    'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10')
                                              : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                                          >
                                            {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了' }[s]}
                                          </button>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {group.has_ticket_status && (
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">整理券配布状況</label>
                                    <div className="flex bg-white/50 p-1 rounded-xl border border-slate-100 gap-1">
                                      {['none', 'distributing', 'ended'].map(s => (
                                        <button
                                          key={s}
                                          onClick={() => setPerformances(prev => prev.map(p => p.id === perf.id ? { ...p, status: s } : p))}
                                          className={`flex-1 py-2.5 rounded-lg text-[8px] font-black transition-all border-2 ${perf.status === s ?
                                            (s === 'distributing' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' :
                                              s === 'ended' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/10' :
                                                'bg-slate-50 border-slate-400 text-slate-700 shadow-md ring-2 ring-slate-400/10')
                                            : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                                        >
                                          {{ none: '配布なし', distributing: '配布中', ended: '配布終了' }[s]}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
        {/* Modal Footer */}
        <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/30 flex gap-4 shrink-0">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 py-5 text-slate-400 font-black text-sm hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
          >
            キャンセル
          </button>
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex-[2] py-5 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
            <span>更新する</span>
          </button>
        </div>
      </motion.div>
      <AnimatePresence>
        {isSaving && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-auto"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-slate-100 border-t-brand-600 rounded-full"
                />
              </div>
              <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                更新中...
              </p>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};
const EditLostFoundModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Remove id from formData if it exists for insert
      const { id, ...saveData } = formData;
      let res;
      if (item.id) {
        res = await supabase.from('lost_found').update({
          ...saveData
        }).eq('id', item.id);
      } else {
        res = await supabase.from('lost_found').insert([
          { ...saveData }
        ]);
      }
      if (res.error) throw res.error;
      await onSave();
      triggerRevalidate();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-xl">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-white w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">落とし物登録・編集</h2>
          </div>
          <div className="px-6 md:px-8 py-4 md:py-6 space-y-4 overflow-y-auto">
            <div className="pb-2">
              <button
                onClick={() => setFormData({ ...formData, is_returned: !formData.is_returned })}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${formData.is_returned
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-md ring-2 ring-emerald-500/10'
                  : 'bg-brand-50 border-brand-500 text-brand-600 shadow-md ring-2 ring-brand-500/10'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {formData.is_returned ? (
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                  ) : (
                    <AlertCircle size={20} strokeWidth={2.5} />
                  )}
                  <span className="text-[12px] font-black uppercase tracking-widest">{formData.is_returned ? '返却済み' : '未返却'}</span>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.is_returned ? 'bg-emerald-500' : 'bg-brand-500'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.is_returned ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">品名</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-3 px-6 text-sm font-black outline-none transition-all"
                placeholder="品名を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">拾得場所</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-3 px-6 text-sm font-black outline-none transition-all"
                placeholder="拾得場所を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">特徴・詳細</label>
              <textarea
                value={formData.features || ''}
                onChange={e => setFormData({ ...formData, features: e.target.value })}
                rows={2}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-3 px-6 text-sm font-black outline-none transition-all resize-none"
                placeholder="特徴･詳細を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">拾得日時</label>
              <input
                type="datetime-local"
                value={formData.found_at ? new Date(new Date(formData.found_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    setFormData({ ...formData, found_at: null });
                    return;
                  }
                  const date = new Date(val);
                  if (!isNaN(date.getTime())) {
                    setFormData({ ...formData, found_at: date.toISOString() });
                  }
                }}
                className="w-full block bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-3 px-6 text-sm font-black outline-none transition-all text-left appearance-none"
              />
            </div>
          </div>
          <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/30 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button>
            <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              {isSaving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              保存する
            </button>
          </div>
        </motion.div>
        <AnimatePresence>
          {isSaving && (
            <Portal>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-auto"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-slate-100 border-t-brand-600 rounded-full"
                  />
                </div>
                <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                  更新中...
                </p>
              </motion.div>
            </Portal>
          )}
        </AnimatePresence>
      </div>
    </Portal>
  );
};


export default HQDashboard;
