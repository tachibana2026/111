import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Clock, CheckCircle2, Ticket, Info, Calendar, MapPin, RefreshCw, ChevronRight, ChevronLeft, Play, Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectorDashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const ITEMS_PER_PAGE = 18; 
  const ROWS_PER_PAGE = 12;

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    const interval = setInterval(() => setNow(new Date()), 1000);
    const channel = supabase.channel('public:groups_and_perfs_v_layout_refine_3')
      .on('postgres_changes', { event: '*', table: 'groups' }, () => fetchData())
      .on('postgres_changes', { event: '*', table: 'performances' }, () => fetchData())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*, performances(id, part_id, start_time, end_time, status, reception_status)')
      .not('id', 'eq', '8d112d95-14cb-4eee-8a5f-2580f502668a')
      .order('name', { ascending: true });
    if (!error && data) setGroups(data);
    setLoading(false);
  };

  const otherGroups = useMemo(() => groups.filter(g => g.id !== '8d112d95-14cb-4eee-8a5f-2580f502668a'), [groups]);

  const activePartInfo = useMemo(() => {
    const PARTS = [
      { id: 1, name: 'Part 1', day: '2026-06-13', range: ['08:45', '12:15'] },
      { id: 2, name: 'Part 2', day: '2026-06-13', range: ['12:45', '16:15'] },
      { id: 3, name: 'Part 3', day: '2026-06-14', range: ['08:45', '12:15'] }
    ];
    const dateStr = now.toLocaleDateString('sv-SE');
    const totalNow = now.getHours() * 60 + now.getMinutes();
    const isTestTime = dateStr !== '2026-06-13' && dateStr !== '2026-06-14';
    const isLateNight = totalNow >= 20 * 60 || totalNow <= 5 * 60;
    let simulatedTime = totalNow;
    let activePart = PARTS[0];
    if (!isTestTime) {
      if (dateStr === '2026-06-13') { if (totalNow >= 12 * 60 + 30) activePart = PARTS[1]; }
      else if (dateStr === '2026-06-14') { activePart = PARTS[2]; }
    } else if (isLateNight) { simulatedTime = 10 * 60 + 30; }
    const [sH, sM] = activePart.range[0].split(':').map(Number);
    const [eH, eM] = activePart.range[1].split(':').map(Number);
    return { ...activePart, startTimeNum: sH * 60 + sM, endTimeNum: eH * 60 + eM, currentTimeNum: simulatedTime, isDemo: isTestTime && isLateNight };
  }, [now]);

  const getDisplayPerformance = (group) => {
    if (!group.performances || group.performances.length === 0) return null;
    const tNow = activePartInfo.currentTimeNum;
    const sorted = [...group.performances].map(p => {
      const [sh, sm] = (p.start_time || '00:00').split(':').map(Number);
      const [eh, em] = (p.end_time || p.start_time || '23:59').split(':').map(Number);
      return { ...p, startNum: sh * 60 + sm, endNum: eh * 60 + em };
    }).sort((a, b) => a.startNum - b.startNum);
    const current = sorted.find(p => p.startNum <= tNow && p.endNum > tNow);
    if (current) return { ...current, label: '上演中' };
    const future = sorted.find(p => p.startNum > tNow);
    if (future) return { ...future, label: '次回の公演' };
    return null;
  };

  const pages = useMemo(() => {
    const gradeGroups = { '1学年': [], '2学年': [], '3学年': [] };
    const clubGroups = {};
    const performanceGroups = [];
    otherGroups.forEach(g => {
      const isPerf = g.has_performances || (g.department || '').includes('公演');
      const name = g.name || '';
      const isGrade = name.startsWith('1年') || name.startsWith('2年') || name.startsWith('3年');
      if (isGrade) {
        if (name.startsWith('1年')) gradeGroups['1学年'].push(g);
        else if (name.startsWith('2年')) gradeGroups['2学年'].push(g);
        else if (name.startsWith('3年')) gradeGroups['3学年'].push(g);
      } else if (!isPerf) {
        const dept = (g.department || 'その他').split(',')[0].trim();
        const label = `有志（${dept}）`;
        if (!clubGroups[label]) clubGroups[label] = [];
        clubGroups[label].push(g);
      }
      if (isPerf) performanceGroups.push(g);
    });
    const result = [];
    ['1学年', '2学年', '3学年'].forEach(label => {
      const items = gradeGroups[label];
      if (items?.length > 0) { for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) result.push({ type: 'groups', label, items: items.slice(i, i + ITEMS_PER_PAGE) }); }
    });
    Object.keys(clubGroups).sort().forEach(label => {
      const items = clubGroups[label];
      if (items?.length > 0) { for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) result.push({ type: 'groups', label, items: items.slice(i, i + ITEMS_PER_PAGE) }); }
    });
    const locationMap = {};
    performanceGroups.forEach(g => {
      const currentPerfs = (g.performances || []).filter(p => p.part_id === activePartInfo.id);
      if (currentPerfs.length > 0) {
        const loc = `${g.building} ${g.room}`;
        if (!locationMap[loc]) locationMap[loc] = [];
        locationMap[loc].push({ group: g, perfs: currentPerfs });
      }
    });
    Object.keys(locationMap).sort().forEach(loc => {
      const entries = locationMap[loc];
      for (let i = 0; i < entries.length; i += ROWS_PER_PAGE) result.push({ type: 'timetable', label: `タイムテーブル：${loc}`, items: entries.slice(i, i + ROWS_PER_PAGE), locationName: loc });
    });
    return result;
  }, [otherGroups, activePartInfo]);

  const totalPages = pages.length;
  useEffect(() => {
    if (totalPages <= 1) return;
    const pageTimer = setInterval(() => { if (!isPaused) setCurrentPage(prev => (prev + 1) % totalPages); }, 20000);
    return () => clearInterval(pageTimer);
  }, [totalPages, isPaused]);
  useEffect(() => { if (currentPage >= totalPages && totalPages > 0) setCurrentPage(0); }, [totalPages]);

  const currentPageData = pages[currentPage] || { type: 'groups', label: '読み込み中...', items: [] };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'データなし';
    const d = new Date(isoString);
    const diff = Math.floor((new Date() - d) / 60000);
    if (diff < 3) return 'たった今';
    if (diff < 60) return `${diff}分前`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}時間前`;
    return `${Math.floor(h / 24)}日前`;
  };

  const getTimeLeft = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m;
    const range = activePartInfo.endTimeNum - activePartInfo.startTimeNum;
    return ((total - activePartInfo.startTimeNum) / range) * 100;
  };

  if (!isMounted || loading) return (
    <div className="w-full h-screen bg-slate-50 flex items-center justify-center font-black text-slate-900">
      {loading ? '読み込み中...' : '準備中...'}
    </div>
  );

  return (
    <div className="w-full h-screen bg-slate-100 flex items-center justify-center p-0 overflow-hidden">
      <div className="aspect-[16/10] h-full max-h-[100vh] max-w-[160vh] bg-slate-50 text-slate-900 p-2 md:p-3 font-sans flex flex-col gap-2 md:gap-3 relative overflow-hidden">
        {/* Header - SITE STYLE */}
        <header className="bg-white px-8 py-4 rounded-[2.5rem] shadow-sm border border-slate-100 shrink-0 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-2 h-10 bg-brand-600 rounded-full"></div>
            <div className="flex flex-col">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 tabular-nums leading-none">
                {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
                <span className="text-xl text-slate-300 ml-1">{now.getSeconds().toString().padStart(2, '0')}</span>
              </h1>
              {activePartInfo.isDemo && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Simulation</span>}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-black text-brand-600 tracking-tighter uppercase leading-none">{currentPageData.label}</h2>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-1 rounded-full border border-slate-100 mt-1.5">
              <button onClick={() => setCurrentPage(prev => (prev - 1 + totalPages) % totalPages)} className="text-slate-400 hover:text-brand-600"><ChevronLeft size={18} /></button>
              <span className="text-xs font-black text-slate-900 tracking-widest uppercase">PAGE {currentPage + 1} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => (prev + 1) % totalPages)} className="text-slate-400 hover:text-brand-600"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setIsPaused(!isPaused)} className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-lg active:scale-90 ${isPaused ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-900 text-white shadow-slate-900/10'}`}>
              {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
            </button>
            <div className="flex items-center gap-4 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest leading-none mb-1">{activePartInfo.name}</span>
                <span className="text-lg font-black text-slate-900 leading-none tabular-nums">{activePartInfo.range[0]} - {activePartInfo.range[1]}</span>
              </div>
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                {(() => {
                  const progress = Math.max(0, Math.min(100, ((activePartInfo.currentTimeNum - activePartInfo.startTimeNum) / (activePartInfo.endTimeNum - activePartInfo.startTimeNum)) * 100));
                  return <div className="h-full bg-brand-600" style={{ width: `${progress}%` }} />;
                })()}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {currentPageData.type === 'groups' ? (
              <motion.div key={currentPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-3 h-full overflow-hidden" style={{ gridTemplateRows: `repeat(${Math.ceil(currentPageData.items.length / 3)}, 1fr)` }}>
                {currentPageData.items.map((g) => {
                  const displayPerf = getDisplayPerformance(g);
                  const isPerf = g.has_performances || (g.department || '').includes('公演');
                  const isSaturated = (isPerf && !displayPerf) || (!isPerf && (g.reception_status === 'closed' || g.reception_status === 'ended'));
                  return (
                    <div key={g.id} className={`relative bg-white border border-slate-100 rounded-[2rem] p-4 flex flex-col h-full shadow-sm transition-all overflow-hidden ${isSaturated ? 'opacity-60 saturate-50' : ''}`}>
                      {/* Top: Labels */}
                      <div className="flex items-center justify-between shrink-0 h-6">
                        <div className="flex items-center gap-1.5">
                          {(g.department || '').split(',').filter(Boolean).slice(0, 1).map(dept => (<span key={dept} className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider">{dept.trim()}</span>))}
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 font-black uppercase tracking-wider">{g.name}</span>
                        </div>
                        <div className="text-[8px] font-black text-slate-300 flex items-center gap-1"><RefreshCw size={7} />{formatRelativeTime(g.updated_at)}</div>
                      </div>

                      {/* Middle: Title and Location - Dynamic Sizing */}
                      <div className="flex-1 flex flex-col justify-center min-h-0 py-1">
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-[1.15] tracking-tighter line-clamp-2">
                          {g.title || g.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-bold flex items-center mt-1">
                          <MapPin size={11} className="mr-1 text-slate-300" />
                          {g.building} {g.room}
                        </p>
                      </div>

                      {/* Bottom: LARGE STATUS - Stabilized */}
                      <div className="mt-1 pt-2 border-t border-slate-50 shrink-0 h-[40%] flex flex-col justify-center">
                        <div className="flex items-stretch gap-2 h-full">
                          {isPerf ? (
                            displayPerf ? (
                              <div className={`flex-1 flex items-center justify-center gap-4 px-4 py-2 rounded-2xl border shadow-sm ${displayPerf.label === '上演中' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-brand-50 border-brand-100 text-brand-600'}`}>
                                <div className="flex flex-col items-center shrink-0">
                                  <Calendar size={18} strokeWidth={3} /><span className="text-[8px] font-black uppercase mt-1">{displayPerf.label}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-4xl md:text-5xl font-black tabular-nums leading-none">{displayPerf.start_time}</span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black border ${displayPerf.reception_status === 'closed' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>{{ open: '受中', closed: '終了', ticket_only: '整理', before_open: '受前' }[displayPerf.reception_status || 'open']}</div>
                                    {displayPerf.status !== 'none' && (<div className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black border ${displayPerf.status === 'ended' ? 'bg-rose-500 text-white' : 'bg-brand-500 text-white'}`}>{{ distributing: '配中', ended: '終了', limited: '僅少' }[displayPerf.status]}</div>)}
                                  </div>
                                </div>
                              </div>
                            ) : (<div className="flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded-2xl border shadow-sm bg-slate-50 border-slate-100 text-slate-400"><CheckCircle2 size={24} strokeWidth={3} /><span className="text-xl font-black tracking-tight uppercase">本日の公演はすべて終了しました</span></div>)
                          ) : g.has_waiting_time && !['closed', 'ended', 'before_open'].includes(g.reception_status) ? (
                            <div className={`flex-1 flex items-center justify-center gap-4 px-4 py-2 rounded-2xl border shadow-sm ${g.waiting_time <= 10 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : g.waiting_time <= 30 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                              <Clock size={20} strokeWidth={3} /><div className="flex items-baseline gap-1"><span className="text-5xl md:text-6xl font-black tabular-nums leading-none">{g.waiting_time}</span><span className="text-sm font-black uppercase tracking-widest ml-1">分待ち</span></div>
                            </div>
                          ) : (
                            <div className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded-2xl border shadow-sm ${g.reception_status === 'closed' || g.reception_status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' : g.reception_status === 'before_open' ? 'bg-slate-50 border-slate-100 text-slate-400' : g.reception_status === 'ticket_only' ? 'bg-brand-50 border-brand-100 text-brand-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                              <Info size={28} strokeWidth={3} /><span className="text-3xl md:text-4xl font-black tracking-tighter">{{ before_open: '受付前', open: '受付中', ticket_only: '整理券', closed: '受付終了', ended: '受付終了' }[g.reception_status] || '受付中'}</span>
                            </div>
                          )}
                          {!isPerf && g.has_ticket_status && (
                            <div className={`w-16 md:w-20 flex flex-col items-center justify-center px-1 rounded-2xl border shadow-sm ${g.ticket_status === 'distributing' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : g.ticket_status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' : g.ticket_status === 'limited' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                              <Ticket size={16} strokeWidth={3} /><span className="text-[8px] font-black mt-1 text-center leading-tight">{{ distributing: '配布中', ended: '終了', limited: '僅少', none: '配布なし' }[g.ticket_status]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key={currentPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-[200px_1fr] h-full">
                  <div className="bg-slate-50 border-r border-slate-100 flex flex-col pt-12">
                    {currentPageData.items.map((entry, idx) => (
                      <div key={idx} className="flex-1 px-8 border-b border-slate-100 flex flex-col justify-center bg-white transition-colors hover:bg-slate-50/50">
                        <h4 className="text-2xl font-black text-slate-900 leading-none tracking-tighter truncate">{entry.group.title || entry.group.name}</h4>
                        <p className="text-sm font-bold text-slate-400 truncate mt-2">{entry.group.name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col relative overflow-hidden">
                    <div className="h-16 border-b border-slate-100 flex items-center relative px-2 bg-slate-50">
                      {(() => {
                        const slots = [];
                        for (let h = 8; h <= 16; h++) { slots.push(`${h.toString().padStart(2, '0')}:00`); slots.push(`${h.toString().padStart(2, '0')}:30`); }
                        return slots.map(time => {
                          const left = getTimeLeft(time);
                          if (left < 0 || left > 100) return null;
                          return (<div key={time} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${left}%` }}><div className="h-full w-px bg-slate-200" /><span className="absolute top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 bg-slate-50 px-3">{time}</span></div>);
                        });
                      })()}
                    </div>
                    <div className="flex-1 flex flex-col relative bg-white">
                      {currentPageData.items.map((entry, rowIdx) => (
                        <div key={rowIdx} className="flex-1 border-b border-slate-100 relative group">
                          {entry.perfs.map((p) => {
                            const start = getTimeLeft(p.start_time);
                            const end = getTimeLeft(p.end_time || p.start_time);
                            const tNow = activePartInfo.currentTimeNum;
                            const [eh, em] = (p.end_time || p.start_time || '23:59').split(':').map(Number);
                            const isOver = tNow >= (eh * 60 + em);
                            const currentReception = isOver ? 'closed' : (p.reception_status || 'open');
                            return (
                              <div key={p.id} className="absolute top-3 bottom-3 px-2" style={{ left: `${start}%`, width: `${Math.max(12, end - start)}%` }}>
                                <div className={`h-full w-full rounded-2xl border transition-all flex flex-col justify-center items-center gap-1.5 overflow-hidden shadow-md ${isOver ? 'bg-slate-50 border-slate-100 opacity-60 text-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}>
                                  <span className="text-lg font-black tracking-tighter leading-none">{p.start_time}{p.end_time && ` - ${p.end_time}`}</span>
                                  <div className="flex gap-2 items-center">{entry.group.has_reception && (<div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1.5 ${isOver ? 'text-slate-400' : currentReception === 'ticket_only' ? 'text-brand-600' : ['closed', 'ended'].includes(currentReception) ? 'text-rose-600' : currentReception === 'before_open' ? 'text-slate-400' : 'text-emerald-600 border-emerald-100 bg-emerald-50'}`}><Info size={12} strokeWidth={3} />{{ before_open: '受前', open: '受付', ticket_only: '整理', closed: '終了', ended: '終了' }[currentReception]}</div>)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {(() => {
                        const progress = ((activePartInfo.currentTimeNum - activePartInfo.startTimeNum) / (activePartInfo.endTimeNum - activePartInfo.startTimeNum)) * 100;
                        if (progress >= 0 && progress <= 100) return (<div className="absolute top-0 bottom-0 w-0.5 bg-rose-500/60 z-10" style={{ left: `${progress}%` }}><div className="absolute top-0 -left-2.5 w-5 h-5 rounded-full bg-rose-500 shadow-lg animate-pulse" /></div>);
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ProjectorDashboard;
