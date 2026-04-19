import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, SortDesc, Instagram, ExternalLink, MapPin, ChevronDown, RefreshCw } from 'lucide-react';
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

// サブコンポーネントをメインコンポーネントの外に移動して再描画ごとの再生成を回避
const PerformanceList = ({ schedule, dayLabel, partId, currentNextPerf, groups, setSelectedGroup, setSelectedPerf }) => {
  const partSchedule = useMemo(() => schedule.filter(p => p.part_id === partId), [schedule, partId]);
  if (partSchedule.length === 0) return null;

  const now = new Date();
  const festDate = partId === 3 ? '2026-06-14' : '2026-06-13';

  const getPerfStatusText = (perf) => {
    const isOver = perf.end_time ? new Date(`${festDate}T${perf.end_time}:00`) < now : new Date(`${festDate}T${perf.start_time}:00`) < now;
    let ticketStatus = '';
    const actualTicket = (isOver && perf.status !== 'none') ? 'ended' : perf.status;
    if (actualTicket === 'distributing') ticketStatus = '整理券配布中';
    else if (actualTicket === 'ended') ticketStatus = '整理券配布終了';
    else ticketStatus = '整理券配布なし';

    const currentReception = isOver ? 'closed' : (perf.reception_status || 'open');
    let receptionStatus = '受付中';
    if (currentReception === 'closed') receptionStatus = '受付終了';
    else if (currentReception === 'ticket_only') receptionStatus = '整理券のみ受付中';
    else if (currentReception === 'before_open') receptionStatus = '受付前';

    return { ticketStatus, receptionStatus, currentReception };
  };

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        {dayLabel}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {partSchedule.map((p, i) => {
          const isPast = p.end_time ? new Date(`${festDate}T${p.end_time}:00`) < now : new Date(`${festDate}T${p.start_time}:00`) < now;
          const isNext = currentNextPerf && p.id === currentNextPerf.id;
          const { ticketStatus, receptionStatus, currentReception } = getPerfStatusText(p);
          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                const targetGroup = groups.find(g => g.id === p.group_id);
                if (targetGroup) {
                  setSelectedGroup(targetGroup);
                  setSelectedPerf({ ...p, currentReception, computedTicket: (isPast && p.status !== 'none') ? 'ended' : p.status });
                }
              }}
              className={`px-4 py-3 rounded-xl border flex flex-col justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${isPast ? 'bg-slate-50 text-slate-300 border-slate-100' : isNext ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-500/10' : 'bg-white text-slate-600 border-slate-100'}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-black">
                  {p.start_time}{p.end_time && ` - ${p.end_time}`}
                </span>
                {isNext && <span className="bg-brand-600 text-white px-1.5 py-0.5 rounded text-[7px] uppercase tracking-tighter animate-pulse">次</span>}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className={`text-[9px] font-black ${currentReception === 'closed' ? 'text-rose-500' : currentReception === 'ticket_only' ? 'text-amber-600' : currentReception === 'before_open' ? 'text-slate-400' : 'text-emerald-500'}`}>{receptionStatus}</div>
                <div className="text-[9px] font-black text-slate-400">{ticketStatus}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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

const Groups = ({ initialGroups }) => {
  const [groups, setGroups] = useState(initialGroups);
  const [activeTab, setActiveTab] = useState('groups');
  const [filterDept, setFilterDept] = useState('すべて');
  const [filterGrade, setFilterGrade] = useState('すべて');
  const [filterBuilding, setFilterBuilding] = useState('すべて');
  const [sortBy, setSortBy] = useState('name');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

    // 受付終了・受付前
    if (reception_status === 'closed' || reception_status === 'ended' || reception_status === 'before_open') {
      return 'bg-slate-50 border-slate-200 text-slate-400';
    }

    // 整理券のみ受付（青）
    if (reception_status === 'ticket_only') {
      return 'bg-brand-50 border-brand-200 text-brand-600';
    }

    // 全てFALSEの場合はエラー表示（赤）
    if (!has_performances && !has_ticket_status && !has_waiting_time && !has_reception) {
      return 'bg-rose-50 border-rose-200 text-rose-600';
    }

    // 公演情報はスレート
    if (has_performances) return 'bg-slate-50 border-slate-200 text-slate-400';

    // 残りわずかはアンバー
    if (has_ticket_status && ticket_status === 'limited') {
      return 'bg-amber-50 border-amber-200 text-amber-600';
    }

    if (has_ticket_status || departments.includes('展示')) {
      return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    }

    if (!has_waiting_time) return 'bg-emerald-50 border-emerald-200 text-emerald-600';

    if (waiting_time <= 10) return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    if (waiting_time <= 30) return 'bg-amber-50 border-amber-200 text-amber-600';
    return 'bg-rose-50 border-rose-200 text-rose-600';
  };

  const getStatusText = (group) => {
    const { reception_status, waiting_time, ticket_status, department, has_waiting_time, has_performances, has_ticket_status, has_reception } = group;
    const departments = department?.split(',').map(d => d.trim()) || [];

    if (reception_status === 'closed' || reception_status === 'ended') return '受付終了';
    if (reception_status === 'before_open') return '受付前';
    if (reception_status === 'ticket_only') return '整理券のみ受付';

    if (has_performances) return '公演情報';

    if (has_ticket_status) {
      if (ticket_status === 'ended') return '配布終了';
      if (ticket_status === 'limited') return '残りわずか';
      return '整理券配布中';
    }

    if (has_waiting_time) {
      if (waiting_time === 0) return '待ちなし';
      return `${waiting_time}分待ち`;
    }

    if (has_reception) {
      return '受付中';
    }

    return 'エラー';
  };

  const getStatusLabel = (status) => {
    if (status === 'distributing') return '整理券配布中';
    if (status === 'ended') return '整理券配布終了';
    return '整理券配布なし';
  };

  const getReceptionLabel = (status) => {
    if (status === 'before_open') return '受付前';
    if (status === 'ticket_only') return '整理券をお持ちの方のみ受付中';
    return status === 'closed' ? '受付終了' : '受付中';
  };

  const getNextPerformance = (group) => {
    const now = new Date();
    const sorted = (group.performances || [])
      .map(p => {
        const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
        return { ...p, fullDate: new Date(`${festDate}T${p.start_time}:00`) };
      })
      .filter(p => p.fullDate > now)
      .sort((a, b) => a.fullDate - b.fullDate);

    return sorted[0] || null;
  };

  // フィルタリングとソートを useMemo でラップして負荷を抑制
  const filteredGroups = useMemo(() => {
    return groups
      .filter(g =>
        (filterDept === 'すべて' || (g.department?.split(',').map(d => d.trim()).includes(filterDept))) &&
        (filterGrade === 'すべて' ||
          (filterGrade === '有志'
            ? !['1年', '2年', '3年'].some(year => g.name.startsWith(year))
            : g.name.startsWith(filterGrade)
          )
        ) &&
        (filterBuilding === 'すべて' || g.building === filterBuilding)
      )
      .sort((a, b) => {
        if (sortBy === 'time-asc') {
          return (a.waiting_time || 0) - (b.waiting_time || 0);
        }
        if (sortBy === 'time-desc') {
          return (b.waiting_time || 0) - (a.waiting_time || 0);
        }
        if (sortBy === 'area') {
          if (a.building !== b.building) return a.building.localeCompare(b.building, 'ja');
          return a.room.localeCompare(b.room, 'ja');
        }

        // 名前順（よみがな先頭文字があれば優先、次いでクラス名・タイトルでソート）
        const getSortKey = (g) => {
          // よみがな先頭文字（1文字）があれば、それを基準にする
          if (g.name_initial) return g.name_initial + (g.name || '');
          
          const isYearGroup = ['1年', '2年', '3年'].some(year => g.name.startsWith(year));
          return isYearGroup ? g.name : (g.title || g.name);
        };

        return getSortKey(a).localeCompare(getSortKey(b), 'ja', { numeric: true });
      });
  }, [groups, filterDept, filterGrade, filterBuilding, sortBy]);

  const filteredGroupsCount = useMemo(() => filteredGroups.length, [filteredGroups]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center space-x-4 text-slate-900">
          <div className="w-2 h-10 bg-brand-600 rounded-full shadow-lg shadow-brand-500/20"></div>
          <h1 className="text-4xl font-black tracking-tight">発表団体</h1>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm overflow-hidden">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 text-slate-900">
              <div className="bg-brand-50 p-3 rounded-2xl text-brand-600 shadow-sm transition-transform group-hover:scale-110">
                <Filter size={20} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-black tracking-tight">絞り込み</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">学年・部門・場所で絞り込む</p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-all duration-300 ${isFilterOpen ? 'bg-brand-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
              <ChevronDown size={20} />
            </div>
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 32 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col space-y-8 pb-4">
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
                <option value="name">名前順</option>
                <option value="area">エリア順</option>
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
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`bg-white border border-slate-100 rounded-3xl p-8 flex flex-col h-full shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 ${group.reception_status === 'closed' || group.reception_status === 'ended' ? 'opacity-60 saturate-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    {group.department?.split(',').map(d => d.trim()).sort((a, b) => DEPARTMENTS.indexOf(a) - DEPARTMENTS.indexOf(b)).map(dept => (
                      <span key={dept} className="text-[9px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider whitespace-nowrap">
                        {dept}
                      </span>
                    ))}
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">
                      {group.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-1.5">
                    {group.title || group.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold flex items-center shrink-0">
                    <MapPin size={12} className="mr-1.5 text-slate-300" />
                    {group.building} {group.room}
                  </p>
                </div>
                <div className="flex flex-col gap-2 scale-90 origin-top-right">
                  <div className={`status-badge border shadow-sm ${getStatusColor(group)}`}>
                    {getStatusText(group)}
                  </div>
                </div>
              </div>

              <div className="flex-grow space-y-6">
                <p className="text-sm text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">
                  {group.description}
                </p>

                {group.has_performances && (group.performances || []).length > 0 && (() => {
                  const nextPerf = getNextPerformance(group);
                  return (
                    <div className="pt-6 border-t border-slate-50 space-y-6">
                      <div className="flex items-center gap-2 px-1 pb-1">
                        <p className="text-[10px] font-bold text-slate-400">各公演回をタップすると詳細が表示されます</p>
                      </div>
                      <PerformanceList
                        schedule={group.performances || []}
                        dayLabel="Part 1 (6/13)"
                        partId={1}
                        currentNextPerf={nextPerf}
                        groups={groups}
                        setSelectedGroup={setSelectedGroup}
                        setSelectedPerf={setSelectedPerf}
                      />
                      <PerformanceList
                        schedule={group.performances || []}
                        dayLabel="Part 2 (6/13)"
                        partId={2}
                        currentNextPerf={nextPerf}
                        groups={groups}
                        setSelectedGroup={setSelectedGroup}
                        setSelectedPerf={setSelectedPerf}
                      />
                      <PerformanceList
                        schedule={group.performances || []}
                        dayLabel="Part 3 (6/14)"
                        partId={3}
                        currentNextPerf={nextPerf}
                        groups={groups}
                        setSelectedGroup={setSelectedGroup}
                        setSelectedPerf={setSelectedPerf}
                      />
                    </div>
                  );
                })()}
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
                </div>
                <div className={`flex items-center gap-1 text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 ${!group.updated_at ? 'opacity-50' : ''}`}>
                  {group.updated_at && <RefreshCw size={8} />}
                  <span>更新: {formatRelativeTime(group.updated_at)}</span>
                </div>
              </div>
            </motion.div>
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedPerf(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] p-10 max-w-sm w-full shadow-2xl border border-slate-100 space-y-8"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-black uppercase tracking-widest">
                      {selectedPerf.start_time} 公演
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedGroup.title || selectedGroup.name}</h2>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <MapPin size={14} className="text-slate-300" />
                    <span>{selectedGroup.building} {selectedGroup.room}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">公演受付</span>
                      <span className={`text-sm font-black text-center ${selectedPerf.currentReception === 'closed' ? 'text-rose-500' : selectedPerf.currentReception === 'ticket_only' ? 'text-amber-600' : selectedPerf.currentReception === 'before_open' ? 'text-slate-400' : 'text-emerald-500'}`}>
                        {getReceptionLabel(selectedPerf.currentReception || 'open')}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">整理券</span>
                      <span className="text-sm font-black text-slate-400">
                        {getStatusLabel(selectedPerf.computedTicket || selectedPerf.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed text-center">
                    整理券は紙での配布となります。<br />
                    詳細は各団体にご確認ください。
                  </p>
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
    .select('id, title, name, description, building, room, social_links, updated_at, department, reception_status, waiting_time, ticket_status, has_reception, has_waiting_time, has_ticket_status, has_performances, name_initial, performances(id, group_id, part_id, start_time, end_time, status, reception_status)');

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
