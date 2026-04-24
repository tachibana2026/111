import { useState, useEffect, useMemo, useCallback, forwardRef } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, SortDesc, Instagram, Youtube, ExternalLink, MapPin, ChevronDown, RefreshCw, Calendar, Search, X, Ticket, CheckCircle2, XCircle, Clock, Info, Image, BookOpen, Utensils, ShoppingBag, Star, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from '../components/Portal';

const DEPARTMENTS = ['すべて', '体験', '食品', '公演', '展示', '冊子', '物販'];
const GRADES = ['すべて', '1年', '2年', '3年', '有志'];
const BUILDINGS = ['すべて', '仮校舎', '体育館', 'セミナー', '南館'];

const XIcon = ({ size = 18, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z" />
  </svg>
);

const normalizeString = (str) => {
  if (!str) return '';
  // Unicode NFKC正規化で全角英数字を半角に、半角カタカナを全角に統一
  let result = str.normalize('NFKC').toLowerCase();
  
  // 年、組、ハイフン、スペース、記号などを除去して比較しやすくする
  result = result.replace(/[年組\-_\s　.,:;!"'()\[\]{}（）]/g, '');
  
  // カタカナをひらがなに統一 (0x30A1-0x30F6 -> 0x3041-0x3096)
  result = result.replace(/[\u30a1-\u30f6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
  
  return result;
};

// サブコンポーネントをメインコンポーネントの外に移動して再描画ごとの再生成を回避
const PerformanceList = ({ schedule, dayLabel, partId, currentNextPerf, groups, setSelectedGroup, setSelectedPerf, hasReception, hasTicketStatus }) => {
  const partSchedule = useMemo(() => 
    [...schedule]
      .filter(p => p.part_id === partId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')),
    [schedule, partId]
  );
  if (partSchedule.length === 0) return null;

  const now = new Date();
  const festDate = partId === 3 ? '2026-06-14' : '2026-06-13';

  const getPerfStatusText = (perf) => {
    const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
    const isOver = perf.end_time 
      ? new Date(`${festDate}T${parseTime(perf.end_time)}:00`) < now 
      : new Date(`${festDate}T${parseTime(perf.start_time)}:00`) < now;
    let ticketStatus = '';
    const actualTicket = (isOver && perf.status !== 'none') ? 'ended' : perf.status;
    if (actualTicket === 'distributing') ticketStatus = '整理券配布中';
    else if (actualTicket === 'ended') ticketStatus = '整理券配布終了';
    else ticketStatus = '整理券配布なし';

    const currentReception = isOver ? 'closed' : (perf.reception_status || 'open');
    let receptionStatus = '受付中';
    if (currentReception === 'closed') receptionStatus = '受付終了';
    else if (currentReception === 'ticket_only') receptionStatus = '整理券のみ';
    else if (currentReception === 'before_open') receptionStatus = '受付前';

    return { ticketStatus, receptionStatus, currentReception, actualTicket };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <div className="w-1 h-3 bg-brand-500 rounded-full" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {dayLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {partSchedule.map((p, i) => {
          const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
          const isPast = p.end_time 
            ? new Date(`${festDate}T${parseTime(p.end_time)}:00`) < now 
            : new Date(`${festDate}T${parseTime(p.start_time)}:00`) < now;
          const isNext = currentNextPerf && p.id === currentNextPerf.id;
          const { ticketStatus, receptionStatus, currentReception, actualTicket } = getPerfStatusText(p);
          return (
            <div
              key={p.id}
              onClick={(e) => {
                e.stopPropagation();
                const targetGroup = groups.find(g => g.id === p.group_id);
                if (targetGroup) {
                  setSelectedGroup(targetGroup);
                  setSelectedPerf({ ...p, currentReception, computedTicket: actualTicket });
                }
              }}
              className={`px-4 py-3 rounded-xl border flex flex-col justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${isPast ? 'bg-slate-50 text-slate-300 border-slate-100' : isNext ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-500/10' : 'bg-white text-slate-600 border-slate-100'}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-black">
                  {p.start_time}{p.end_time && ` ～ ${p.end_time}`}
                </span>
                {isNext && <span className="bg-brand-600 text-white px-1.5 py-0.5 rounded text-[7px] uppercase tracking-tighter animate-pulse">次</span>}
              </div>
              <div className="flex flex-col gap-1 mt-1.5">
                {hasReception && (
                  <div className={`flex items-center justify-start gap-1.5 text-[9px] font-black ${
                    currentReception === 'ticket_only' ? 'text-brand-600' : 
                    ['closed', 'ended'].includes(currentReception) ? 'text-rose-600' : 
                    currentReception === 'before_open' ? 'text-slate-400' : 
                    'text-emerald-600'
                  }`}>
                    <Info size={10} strokeWidth={3} />
                    {receptionStatus}
                  </div>
                )}
                {hasTicketStatus && (
                  <div className={`flex items-center justify-start gap-1.5 text-[9px] font-black ${
                    actualTicket === 'ended' ? 'text-rose-600' :
                    actualTicket === 'none' ? 'text-slate-400' :
                    'text-emerald-600'
                  }`}>
                    <Ticket size={10} strokeWidth={3} />
                    {ticketStatus.replace('整理券', '')}
                  </div>
                )}
                {!hasReception && !hasTicketStatus && (
                  <div className="text-[9px] font-black text-slate-400 leading-tight">
                    公演開始時間に合わせて<br />直接会場へお越しください
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GroupCard = forwardRef(({ 
  group, 
  groups, 
  setSelectedGroup, 
  setSelectedPerf, 
  getStatusColor, 
  getStatusText, 
  getNextPerformance, 
  formatRelativeTime 
}, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const departments = useMemo(() => (group.department || '').split(',').filter(Boolean).map(d => d.trim()), [group.department]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border border-slate-100 rounded-[2rem] md:rounded-3xl p-5 md:p-8 flex flex-col h-full shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 ${group.reception_status === 'closed' || group.reception_status === 'ended' ? 'opacity-60 saturate-50' : ''}`}
    >
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(group.department || '').split(',').filter(Boolean).map(d => d.trim()).sort((a, b) => DEPARTMENTS.indexOf(a) - DEPARTMENTS.indexOf(b)).map(dept => (
              <span key={dept} className="text-[9px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider whitespace-nowrap">
                {dept}
              </span>
            ))}
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">
              {group.name}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            {!(group.has_performances || departments.includes('公演')) ? (
              <>
                {group.has_reception && (
                  <div className={`px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-black whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    group.reception_status === 'closed' || group.reception_status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                    group.reception_status === 'before_open' ? 'bg-slate-50 border-slate-100 text-slate-400' :
                    group.reception_status === 'ticket_only' ? 'bg-brand-50 border-brand-100 text-brand-600' :
                    'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}>
                    <Info size={11} strokeWidth={3} />
                    {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ', closed: '受付終了', ended: '受付終了' }[group.reception_status] || group.reception_status}
                  </div>
                )}
                {group.has_ticket_status && (
                  <div className={`px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-black whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    group.ticket_status === 'distributing' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    group.ticket_status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                    group.ticket_status === 'limited' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                    'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <Ticket size={11} strokeWidth={3} />
                    {{ distributing: '配布中', ended: '配布終了', limited: '残りわずか', none: '配布なし' }[group.ticket_status] || group.ticket_status}
                  </div>
                )}
                {group.has_waiting_time && !['closed', 'ended', 'before_open'].includes(group.reception_status) && (
                  <div className={`px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-black whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    group.waiting_time <= 10 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    group.waiting_time <= 30 ? 'bg-amber-50 border-amber-100 text-amber-600' :
                    'bg-rose-50 border-rose-100 text-rose-600'
                  }`}>
                    <Clock size={11} strokeWidth={3} />
                    {group.waiting_time === 0 ? '待ちなし' : `${group.waiting_time}分待ち`}
                  </div>
                )}
              </>
            ) : (
              <div className="px-3 py-1.5 rounded-full text-[10px] font-black flex items-center justify-center gap-1.5 border shadow-sm bg-slate-50 border-slate-100 text-slate-400">
                <Info size={11} strokeWidth={3} />
                <span>公演情報</span>
              </div>
            )}
            {!group.has_reception && !group.has_ticket_status && !group.has_waiting_time && !group.has_performances && !departments.includes('公演') && (
              <div className="px-3 py-1.5 rounded-full text-[10px] font-black flex items-center justify-center gap-1.5 border shadow-sm bg-slate-50 border-slate-100 text-slate-400">
                <Info size={11} strokeWidth={3} />
                <span>団体情報</span>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <h3 className="text-xl font-black text-slate-900 leading-tight whitespace-pre-wrap">
            {group.title || group.name}
          </h3>
          <p className="text-[11px] text-slate-400 font-bold flex items-center">
            <MapPin size={12} className="mr-1.5 text-slate-300" />
            {group.building} {group.room}
          </p>
        </div>
      </div>

      <div className="flex-grow space-y-6">
        <p className="text-sm text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">
          {group.description}
        </p>

        {(group.has_performances || departments.includes('公演')) && (group.performances || []).length > 0 && (
          <div className="pt-6 border-t border-slate-50 space-y-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 group/btn ${
                isExpanded 
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
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <p className="text-[10px] font-bold text-slate-400">
                      {(group.has_performances || departments.includes('公演')) && !group.has_reception && !group.has_ticket_status 
                        ? "整理券はありません。直接会場へお越しください。" 
                        : "各公演回をタップすると詳細が表示されます"}
                    </p>
                  </div>
                  {(() => {
                    const nextPerf = getNextPerformance(group);
                    return (
                      <>
                        <PerformanceList
                          schedule={group.performances || []}
                          dayLabel="Part 1 (6/13)"
                          partId={1}
                          currentNextPerf={nextPerf}
                          groups={groups}
                          setSelectedGroup={setSelectedGroup}
                          setSelectedPerf={setSelectedPerf}
                          hasReception={group.has_reception}
                          hasTicketStatus={group.has_ticket_status}
                        />
                        <PerformanceList
                          schedule={group.performances || []}
                          dayLabel="Part 2 (6/13)"
                          partId={2}
                          currentNextPerf={nextPerf}
                          groups={groups}
                          setSelectedGroup={setSelectedGroup}
                          setSelectedPerf={setSelectedPerf}
                          hasReception={group.has_reception}
                          hasTicketStatus={group.has_ticket_status}
                        />
                        <PerformanceList
                          schedule={group.performances || []}
                          dayLabel="Part 3 (6/14)"
                          partId={3}
                          currentNextPerf={nextPerf}
                          groups={groups}
                          setSelectedGroup={setSelectedGroup}
                          setSelectedPerf={setSelectedPerf}
                          hasReception={group.has_reception}
                          hasTicketStatus={group.has_ticket_status}
                        />
                      </>
                    );
                  })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-5 mt-auto border-t border-slate-50">
        <div className="flex space-x-4">
          {group.social_links?.instagram && (
            <a href={group.social_links.instagram} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-pink-500 transition-colors">
              <Instagram size={18} />
            </a>
          )}
          {(group.social_links?.X || group.social_links?.x) && (
            <a href={group.social_links.X || group.social_links.x} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-slate-900 transition-colors">
              <XIcon size={16} />
            </a>
          )}
          {group.social_links?.HP && (
            <a href={group.social_links.HP} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-brand-600 transition-colors">
              <ExternalLink size={18} />
            </a>
          )}
          {group.social_links?.youtube && (
            <a href={group.social_links.youtube} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-red-600 transition-colors">
              <Youtube size={18} />
            </a>
          )}
        </div>
        <div className={`flex items-center gap-1 text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 ${!group.updated_at ? 'opacity-50' : ''}`}>
          {group.updated_at && <RefreshCw size={8} />}
          <span>更新: {formatRelativeTime(group.updated_at)}</span>
        </div>
      </div>
    </motion.div>
  );
});

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

const Groups = ({ initialGroups }) => {
  const [groups, setGroups] = useState(initialGroups);
  const [activeTab, setActiveTab] = useState('groups');
  const [filterDept, setFilterDept] = useState('すべて');
  const [filterGrade, setFilterGrade] = useState('すべて');
  const [filterBuilding, setFilterBuilding] = useState('すべて');
  const [sortBy, setSortBy] = useState('name');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // フィルター・検索状態の復元
  useEffect(() => {
    const saved = sessionStorage.getItem('ryoun_groups_filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.filterDept) setFilterDept(filters.filterDept);
        if (filters.filterGrade) setFilterGrade(filters.filterGrade);
        if (filters.filterBuilding) setFilterBuilding(filters.filterBuilding);
        if (filters.sortBy) setSortBy(filters.sortBy);
        if (filters.searchQuery) setSearchQuery(filters.searchQuery);
        if (filters.isFilterOpen !== undefined) setIsFilterOpen(filters.isFilterOpen);
      } catch (e) {
        console.error('Failed to parse saved filters', e);
      }
    }
  }, []);

  // フィルター・検索状態の保存
  useEffect(() => {
    const state = { filterDept, filterGrade, filterBuilding, sortBy, searchQuery, isFilterOpen };
    sessionStorage.setItem('ryoun_groups_filters', JSON.stringify(state));
  }, [filterDept, filterGrade, filterBuilding, sortBy, searchQuery, isFilterOpen]);

  useEffect(() => {
    if (selectedPerf) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPerf]);

  // Note: Client-side fetching and Realtime subscriptions are disabled 
  // to protect the free tier from heavy traffic.
  // Data is updated via On-demand ISR triggered by admin actions.
  const getStatusColor = (group) => {
    const { reception_status, waiting_time, has_waiting_time, has_performances, has_ticket_status, has_reception, ticket_status, department } = group;
    const departments = department?.split(',').map(d => d.trim()) || [];

    // 受付終了
    if (reception_status === 'closed' || reception_status === 'ended') {
      return 'bg-rose-50 border-rose-100 text-rose-600';
    }

    // 受付前
    if (reception_status === 'before_open') {
      return 'bg-slate-50 border-slate-100 text-slate-400';
    }

    // 整理券のみ（青）
    if (reception_status === 'ticket_only') {
      return 'bg-brand-50 border-brand-100 text-brand-600';
    }

    // 全てFALSEの場合は「団体情報」（グレー）
    if (!has_performances && !has_ticket_status && !has_waiting_time && !has_reception) {
      return 'bg-slate-50 border-slate-100 text-slate-400';
    }

    // 公演情報はスレート
    if (has_performances || departments.includes('公演')) return 'bg-slate-50 border-slate-100 text-slate-400';

    // 残りわずかはアンバー
    if (has_ticket_status && ticket_status === 'limited') {
      return 'bg-amber-50 border-amber-100 text-amber-600';
    }

    if (has_ticket_status || departments.includes('展示')) {
      return 'bg-emerald-50 border-emerald-100 text-emerald-600';
    }

    if (!has_waiting_time) return 'bg-emerald-50 border-emerald-100 text-emerald-600';

    if (waiting_time <= 10) return 'bg-emerald-50 border-emerald-100 text-emerald-600';
    if (waiting_time <= 30) return 'bg-amber-50 border-amber-100 text-amber-600';
    return 'bg-rose-50 border-rose-100 text-rose-600';
  };

  const getStatusText = (group) => {
    const { reception_status, waiting_time, ticket_status, department, has_waiting_time, has_performances, has_ticket_status, has_reception } = group;
    const departments = department?.split(',').map(d => d.trim()) || [];

    if (reception_status === 'closed' || reception_status === 'ended') return '受付終了';
    if (reception_status === 'before_open') return '受付前';
    if (reception_status === 'ticket_only') return '整理券のみ';

    if (has_performances || departments.includes('公演')) return '公演情報';

    if (has_ticket_status) {
      if (ticket_status === 'ended') return '配布終了';
      return '整理券配布中';
    }

    if (has_waiting_time) {
      if (waiting_time === 0) return '待ちなし';
      return `${waiting_time}分待ち`;
    }

    if (has_reception) {
      return '受付中';
    }
    
    return '団体情報';
  };

  const getStatusLabel = (status) => {
    if (status === 'distributing') return '整理券配布中';
    if (status === 'ended') return '整理券配布終了';
    return '整理券配布なし';
  };

  const getReceptionLabel = (status) => {
    if (status === 'before_open') return '受付前';
    if (status === 'ticket_only') return '整理券をお持ちの方のみ案内中';
    return status === 'closed' || status === 'ended' ? '受付終了' : '受付中';
  };

  const getNextPerformance = (group) => {
    const now = new Date();
    const sorted = (group.performances || [])
      .map(p => {
        const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
        const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
        return { ...p, fullDate: new Date(`${festDate}T${parseTime(p.start_time)}:00`) };
      })
      .filter(p => p.fullDate && !isNaN(p.fullDate.getTime()) && p.fullDate > now)
      .sort((a, b) => a.fullDate - b.fullDate);

    return sorted[0] || null;
  };

  // フィルタリングとソートを useMemo でラップして負荷を抑制
  const filteredGroups = useMemo(() => {
    return groups
      .filter(g => {
        const matchesFilter = (filterDept === 'すべて' || (g.department?.split(',').map(d => d.trim()).includes(filterDept))) &&
          (filterGrade === 'すべて' ||
            (filterGrade === '有志'
              ? !['1年', '2年', '3年'].some(year => g.name.startsWith(year))
              : g.name.startsWith(filterGrade)
            )
          ) &&
          (filterBuilding === 'すべて' || g.building === filterBuilding);

        if (!matchesFilter) return false;

        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const normalizedQuery = normalizeString(searchQuery);

        return (
          g.name?.toLowerCase().includes(query) ||
          normalizeString(g.name).includes(normalizedQuery) ||
          (g.name_kana && normalizeString(g.name_kana).includes(normalizedQuery)) || // 団体名の読み（ひらがな）
          g.title?.toLowerCase().includes(query) ||
          normalizeString(g.title).includes(normalizedQuery) ||
          (g.title_kana && normalizeString(g.title_kana).includes(normalizedQuery)) || // 企画名の読み
          g.description?.toLowerCase().includes(query) ||
          normalizeString(g.description).includes(normalizedQuery) ||
          g.building?.toLowerCase().includes(query) ||
          normalizeString(g.building).includes(normalizedQuery) ||
          g.room?.toLowerCase().includes(query) ||
          normalizeString(g.room).includes(normalizedQuery) ||
          (g.performances || []).some(p => 
            p.start_time?.includes(query) || 
            p.end_time?.includes(query)
          )
        );
      })
      .sort((a, b) => {
        if (sortBy === 'time-asc') {
          return (a.waiting_time || 0) - (b.waiting_time || 0);
        }
        if (sortBy === 'time-desc') {
          return (b.waiting_time || 0) - (a.waiting_time || 0);
        }
        if (sortBy === 'title') {
          const keyA = a.title_kana || a.title || a.name || '';
          const keyB = b.title_kana || b.title || b.name || '';
          return keyA.localeCompare(keyB, 'ja', { numeric: true });
        }

        // 優先度判定: クラス（1年->2年->3年） > 有志
        const getPriority = (name) => {
          if (!name) return 4;
          if (name.startsWith('1年')) return 1;
          if (name.startsWith('2年')) return 2;
          if (name.startsWith('3年')) return 3;
          return 4; // 有志
        };

        const priorityA = getPriority(a.name);
        const priorityB = getPriority(b.name);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // クラス同士、または有志同士の場合のソートキー
        const getSortKey = (g) => {
          // クラス（1年, 2年, 3年）は名称（1年A組, 1年B組...）でA-Z順にソート
          if (priorityA < 4) return g.name || '';
          
          // 有志団体などは読み仮名（name_kana / title_kana）を優先して五十音順
          if (g.name_kana) return g.name_kana;
          if (g.title_kana) return g.title_kana;
          return g.name || '';
        };

        return getSortKey(a).localeCompare(getSortKey(b), 'ja', { numeric: true });
      });
  }, [groups, filterDept, filterGrade, filterBuilding, sortBy, searchQuery]);

  const filteredGroupsCount = useMemo(() => filteredGroups.length, [filteredGroups]);

  return (
    <div className="space-y-6 md:space-y-10 pb-12">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center space-x-4 text-slate-900">
          <div className="w-2 h-10 bg-brand-600 rounded-full shadow-lg shadow-brand-500/20"></div>
          <h1 className="text-4xl font-black tracking-tight">団体一覧</h1>
        </div>

        {/* Search Bar */}
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

        {/* Filters */}
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
                  {!isFilterOpen && (filterDept !== 'すべて' || filterGrade !== 'すべて' || filterBuilding !== 'すべて') && (
                    <div className="flex flex-wrap gap-1.5">
                      {[filterGrade, filterDept, filterBuilding].filter(f => f !== 'すべて').map(f => (
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
                          onClick={() => setFilterDept(d)}
                          className={`min-w-[5rem] px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${filterDept === d ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
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
        <div className="flex justify-end px-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredGroups.map((group) => (
            <GroupCard 
              key={group.id} 
              group={group} 
              groups={groups} 
              setSelectedGroup={setSelectedGroup} 
              setSelectedPerf={setSelectedPerf}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              getNextPerformance={getNextPerformance}
              formatRelativeTime={formatRelativeTime}
            />
          ))}
        </AnimatePresence>
      </div>
      {filteredGroups.length === 0 && (
        <div className="text-center py-32 text-slate-300 font-bold tracking-widest uppercase">
          検索結果が見つかりませんでした
        </div>
      )}

      {/* Performance Detail Modal */}
      <Portal>
        <AnimatePresence>
          {selectedPerf && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedPerf(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] p-6 md:p-10 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6 md:space-y-8"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-black uppercase tracking-widest shrink-0">
                      {selectedPerf.start_time}{selectedPerf.end_time && ` ～ ${selectedPerf.end_time}`}
                    </span>
                    {selectedGroup.title && selectedGroup.title !== selectedGroup.name && (
                      <span className="text-base font-black text-brand-600 uppercase tracking-[0.1em] text-right">
                        {selectedGroup.name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight whitespace-pre-wrap">
                    {selectedGroup.title || selectedGroup.name}
                  </h2>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <MapPin size={14} className="text-slate-300" />
                    <span>{selectedGroup.building} {selectedGroup.room}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {(selectedGroup.has_performances || (selectedGroup.department || '').includes('公演')) && !selectedGroup.has_reception && !selectedGroup.has_ticket_status ? (
                    <div className="py-8 bg-slate-50/50 rounded-3xl border border-slate-100/50 flex items-center justify-center">
                      <p className="text-xl font-black text-slate-900 leading-relaxed text-center">
                        公演開始時間に合わせて<br />
                        直接会場へお越しください
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Info size={10} strokeWidth={3} />
                            <span className="text-[8px] font-black uppercase tracking-widest">公演受付</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center w-full">
                            <div className={`font-black text-center leading-[1.2] ${
                              selectedPerf.currentReception === 'ticket_only' ? 'text-brand-700 text-sm' :
                              ['closed', 'ended'].includes(selectedPerf.currentReception) ? 'text-rose-600 text-base' :
                              selectedPerf.currentReception === 'before_open' ? 'text-slate-500 text-base' :
                              'text-emerald-600 text-base'
                            }`}>
                              {selectedPerf.currentReception === 'ticket_only' ? (
                                <>整理券を<br />お持ちの方のみ<br />案内中</>
                              ) : getReceptionLabel(selectedPerf.currentReception || 'open')}
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Ticket size={10} strokeWidth={3} />
                            <span className="text-[8px] font-black uppercase tracking-widest">整理券</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center w-full">
                            <div className={`text-base font-black text-center leading-tight ${
                              ['ended', 'none'].includes(selectedPerf.computedTicket || selectedPerf.status) ? 'text-slate-500' :
                              'text-emerald-600'
                            }`}>
                              {getStatusLabel(selectedPerf.computedTicket || selectedPerf.status).replace('整理券', '')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-center">
                        整理券は紙での配布となります。<br />
                        詳細は各団体にご確認ください。
                      </p>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setSelectedPerf(null)}
                  className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95"
                >
                  閉じる
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};

export async function getStaticProps() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, title, name, name_kana, description, building, room, social_links, updated_at, department, reception_status, waiting_time, ticket_status, has_reception, has_waiting_time, has_ticket_status, has_performances, title_kana, performances(id, group_id, part_id, start_time, end_time, status, reception_status)');

  if (error) {
    console.error('getStaticProps fetch error:', error);
    return { props: { initialGroups: [] }, revalidate: 60 };
  }

  return {
    props: {
      initialGroups: data || [],
    },
    // On-demand revalidation is used, but a fallback revalidation 
    // every hour is a good safety measure.
    revalidate: 3600,
  };
}

export default Groups;
