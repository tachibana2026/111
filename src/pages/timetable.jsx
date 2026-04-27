import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, MapPin, Ticket, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from '../components/Portal';

const PARTS = [
  { id: 1, name: 'Part 1 (6/13)', day: 1, range: ['08:45', '12:15'] },
  { id: 2, name: 'Part 2 (6/13)', day: 1, range: ['12:45', '16:15'] },
  { id: 3, name: 'Part 3 (6/14)', day: 2, range: ['08:45', '12:15'] }
];

const BUILDING_ORDER = ['仮校舎', '体育館', 'セミナー', '南館'];

const TIME_SLOTS_MAP = {
  1: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
  2: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  3: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']
};

const Timetable = ({ initialPerformances }) => {
  const [performances, setPerformances] = useState(initialPerformances);
  const [activePart, setActivePart] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasManuallySwitched, setHasManuallySwitched] = useState(false);

  // ページロード時および時間経過時に適切なPartを自動選択する
  useEffect(() => {
    if (hasManuallySwitched) return;

    const now = currentTime;
    const dateStr = now.toLocaleDateString('sv-SE'); // "YYYY-MM-DD"
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMinutes = h * 60 + m;

    if (dateStr === '2026-06-13') {
      if (totalMinutes >= 12 * 60 + 30) {
        if (activePart !== 2) setActivePart(2);
      } else {
        if (activePart !== 1) setActivePart(1);
      }
    } else if (dateStr === '2026-06-14') {
      if (activePart !== 3) setActivePart(3);
    } else {
      // 当日以外はPart 1を選択
      if (activePart !== 1) setActivePart(1);
    }
  }, [currentTime, hasManuallySwitched]);

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

  const mainScrollRef = useRef(null);
  const sidebarRef = useRef(null);
  const buildingRefs = useRef({});

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (performances.length > 0 && mainScrollRef.current) {
      const timer = setTimeout(() => {
        scrollToCurrentTime(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activePart, performances]);

  const currentPartInfo = useMemo(() => {
    const info = PARTS.find(p => p.id === activePart);
    const [sH, sM] = info.range[0].split(':').map(Number);
    const [eH, eM] = info.range[1].split(':').map(Number);
    return {
      startTotal: sH * 60 + sM,
      endTotal: eH * 60 + eM,
      duration: (eH * 60 + eM) - (sH * 60 + sM)
    };
  }, [activePart]);

  const getTimeLeft = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const diffMinutes = (h * 60 + m) - currentPartInfo.startTotal;
    return (diffMinutes / currentPartInfo.duration) * 100;
  };

  const getPerfWidth = (perf) => {
    if (!perf.start_time) return 0;
    const [h1, m1] = perf.start_time.split(':').map(Number);
    const diffMinutes = perf.end_time 
      ? (() => {
          const [h2, m2] = perf.end_time.split(':').map(Number);
          return (h2 * 60 + m2) - (h1 * 60 + m1);
        })()
      : 25;
    return (diffMinutes / currentPartInfo.duration) * 100;
  };

  const scrollToCurrentTime = (smooth = false) => {
    if (!mainScrollRef.current || !sidebarRef.current) return;
    if (!currentTime.toISOString().startsWith('2026-06')) return;

    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const totalNow = h * 60 + m;

    if (totalNow >= currentPartInfo.startTotal && totalNow <= currentPartInfo.endTotal) {
      const diffMinutes = totalNow - currentPartInfo.startTotal;
      const sidebarWidth = sidebarRef.current.offsetWidth;
      const timelineWidth = mainScrollRef.current.scrollWidth - sidebarWidth;
      const left = (diffMinutes / currentPartInfo.duration) * timelineWidth;

      mainScrollRef.current.scrollTo({
        left: Math.max(0, left - 40),
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const isPast = (perf) => {
    const festDate = perf.part_id === 3 ? '2026-06-14' : '2026-06-13';
    const timeToCompare = perf.end_time || perf.start_time;
    const parseTime = (t) => t?.includes(':') ? t.split(':').map(s => s.padStart(2, '0')).join(':') : t;
    const perfEnd = new Date(`${festDate}T${parseTime(timeToCompare)}:00`);
    if (!perf.end_time) perfEnd.setMinutes(perfEnd.getMinutes() + 20);
    return currentTime > perfEnd;
  };

  const renderCurrentTimeLine = () => {
    const festDate = activePart === 3 ? '2026-06-14' : '2026-06-13';
    const isSameDay = currentTime.toISOString().split('T')[0] === festDate;
    if (!isSameDay) return null;

    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const totalNow = h * 60 + m;

    if (totalNow < currentPartInfo.startTotal || totalNow > currentPartInfo.endTotal) return null;

    const diffMinutes = totalNow - currentPartInfo.startTotal;
    const leftPercentage = (diffMinutes / currentPartInfo.duration) * 100;

    return (
      <div
        className="absolute top-0 bottom-0 z-[15] pointer-events-none"
        style={{ left: `${leftPercentage}%` }}
      >
        <div className="w-0.5 h-full bg-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]"></div>
      </div>
    );
  };

  const buildingsData = useMemo(() => {
    const map = new Map();
    // 存在する全ての建物を収集する
    const allBuildings = new Set(BUILDING_ORDER);
    performances.forEach(p => {
      if (p.groups?.building) {
        allBuildings.add(p.groups.building);
      }
    });

    // 順序を決定（BUILDING_ORDERの順 + それ以外の建物）
    const sortedBuildingList = Array.from(allBuildings).sort((a, b) => {
      const indexA = BUILDING_ORDER.indexOf(a);
      const indexB = BUILDING_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b, 'ja');
    });

    sortedBuildingList.forEach(b => map.set(b, []));

    performances.forEach(p => {
      if (!p.groups) return;
      const bName = p.groups.building || 'その他';
      if (!map.has(bName)) map.set(bName, []);
      
      const existingGroup = map.get(bName).find(g => g.id === p.group_id);
      if (existingGroup) {
        existingGroup.group_performances.push(p);
      } else {
        map.get(bName).push({ ...p.groups, group_performances: [p] });
      }
    });

    return sortedBuildingList.map(building => {
      const groups = (map.get(building) || []).sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '', 'ja', { numeric: true });
      });
      return { building, groups };
    }).filter(b => b.groups.length > 0);
  }, [performances]);

  const getStatusLabel = (status) => {
    if (status === 'distributing') return '整理券配布中';
    if (status === 'ended') return '整理券配布終了';
    return '整理券配布なし';
  };

  const getReceptionLabel = (status) => {
    if (status === 'before_open') return '受付前';
    if (status === 'ticket_only') return '整理券のみ案内中';
    return status === 'closed' ? '受付終了' : '受付中';
  };

  const timeSlots = TIME_SLOTS_MAP[activePart];

  return (
    <div className="space-y-8 md:space-y-12 pb-32">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center space-x-4 text-slate-900">
            <div className="w-2 h-10 bg-brand-600 rounded-full shadow-lg shadow-brand-500/20"></div>
            <h1 className="text-4xl font-black tracking-tight">タイムテーブル</h1>
          </div>

          <div className="flex w-full p-1 md:p-2 bg-slate-100/80 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-slate-200/50 shadow-inner">
            {PARTS.map(part => (
              <button
                key={part.id}
                onClick={() => {
                  setActivePart(part.id);
                  setHasManuallySwitched(true);
                }}
                className={`flex-1 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-black transition-all flex items-center justify-center gap-2 ${activePart === part.id ? 'bg-white text-brand-700 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                 <Clock size={14} className={activePart === part.id ? 'text-brand-600' : 'text-slate-400'} />
                {part.name}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">場所でジャンプ</p>
            <div className="flex w-full gap-2 md:gap-3 px-1 overflow-x-auto no-scrollbar">
              {buildingsData.map(b => b.building).map(building => (
                <button
                  key={building}
                  onClick={() => {
                    buildingRefs.current[building]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex-shrink-0 px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] md:text-[11px] font-black text-slate-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all shadow-sm active:scale-95"
                >
                  {building}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <p className="text-xs font-black text-slate-400">各公演回をタップすると詳細が表示されます。</p>
      </div>

      <div 
        className="relative overflow-x-auto no-scrollbar scroll-momentum pb-8"
        ref={mainScrollRef}
      >
        <div className="inline-block min-w-full space-y-12">
            {buildingsData.map((bInfo, bIndex) => (
              <div key={bInfo.building} ref={el => buildingRefs.current[bInfo.building] = el} className="w-full">
                {/* Building Title */}
                <div className="pb-4 pt-4 w-full bg-transparent">
                  <div className="sticky left-0 z-20 px-2 flex items-center gap-3 w-max">
                    <div className="w-1.5 h-6 bg-brand-600 rounded-full shadow-[0_0_8px_rgba(2,132,199,0.3)]" />
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{bInfo.building}</h2>
                  </div>
                </div>

                {/* Table Container for this building */}
                <div className="border border-slate-200 rounded-none bg-white shadow-sm relative">
                  
                  {/* Header row with time slots */}
                  <div className="flex border-b border-slate-200 bg-slate-50/90 backdrop-blur-sm sticky top-0 z-30 rounded-none">
                    <div ref={bIndex === 0 ? sidebarRef : null} className="w-24 md:w-32 flex-shrink-0 border-r border-slate-200 bg-slate-50 sticky left-0 z-40 flex items-center justify-start py-4 px-3 rounded-none shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]">
                      <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-tighter">タイトル / 団体名</span>
                    </div>
                    <div className="flex-1 flex min-w-[1300px] lg:min-w-0 relative h-12 pr-6">
                      {timeSlots.map((time) => (
                        <div 
                          key={time} 
                          className="absolute top-0 bottom-0" 
                          style={{ left: `${getTimeLeft(time)}%` }}
                        >
                          <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-50 px-1 z-10 whitespace-nowrap">
                            {time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    {/* Current time line for this building */}
                    <div className="absolute inset-0 pointer-events-none flex z-[15]">
                      <div className="w-24 md:w-32 flex-shrink-0" />
                      <div className="flex-1 relative min-w-[1300px] lg:min-w-0 pr-6">
                        {renderCurrentTimeLine()}
                      </div>
                    </div>

                    {bInfo.groups.map((group, index) => {
                      const isLast = index === bInfo.groups.length - 1;
                      return (
                      <div key={group.id} className={`flex border-b border-slate-200 last:border-b-0 group hover:bg-slate-50/50 transition-colors ${isLast ? 'rounded-none' : ''}`}>
                        {/* Sticky Sidebar Cell */}
                        <div className={`w-24 md:w-32 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-30 p-2 md:p-3 flex flex-col justify-center items-start gap-1 group-hover:bg-slate-50 transition-colors ${isLast ? 'rounded-none' : ''} shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]`}>
                      {group.title && group.title !== group.name && (
                        <h3 className="text-[10px] md:text-[11px] font-black text-slate-900 leading-tight break-words text-left whitespace-pre-wrap">
                          {group.title}
                        </h3>
                      )}
                      <span className={`font-bold text-left leading-tight break-words whitespace-pre-wrap ${group.title && group.title !== group.name ? 'text-[8px] md:text-[9px] text-slate-400' : 'text-[10px] md:text-[11px] text-slate-900'}`}>
                        {group.name}
                      </span>
                    </div>

                    {/* Timeline Cell */}
                    <div className="flex-1 relative min-h-[110px] min-w-[1300px] lg:min-w-0 pr-6">
                      {/* Grid Lines */}
                      {timeSlots.map((time) => (
                        <div 
                          key={time} 
                          className="absolute top-0 bottom-0 border-r border-slate-200/50" 
                          style={{ left: `${getTimeLeft(time)}%` }}
                        ></div>
                      ))}

                      {/* Performance Boxes */}
                      {group.group_performances
                        .filter(perf => perf.part_id === activePart)
                        .map((perf) => {
                          const left = getTimeLeft(perf.start_time);
                          const width = getPerfWidth(perf);
                          const isOver = isPast(perf);
                          const currentReception = isOver ? 'closed' : (perf.reception_status || 'open');
                          const computedTicket = (isOver && perf.status !== 'none') ? 'ended' : perf.status;
                          return (
                            <motion.div
                              key={perf.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1 - (isOver ? 0.6 : 0), y: 0 }}
                              onClick={() => {
                                setSelectedGroup(group);
                                setSelectedPerf({ ...perf, currentReception, computedTicket });
                              }}
                              className={`absolute top-2.5 bottom-2.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-center overflow-hidden gpu-accelerated ${isOver
                                ? 'bg-slate-50 border-slate-100 text-slate-400 shadow-none'
                                : 'bg-white border-slate-200 text-slate-700 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:border-brand-300 hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.02]'
                                }`}
                              style={{
                                left: `calc( ${left}% + 6px )`,
                                width: `calc( ${width}% - 12px )`,
                                zIndex: 5
                              }}
                            >
                              <div className="flex-[4] px-1 text-center flex items-center justify-center overflow-hidden border-b border-slate-100">
                                <div 
                                  className="min-w-max origin-center transition-all"
                                  style={{ transform: `scale(${Math.max(0.45, Math.min(1, width / 8))})` }}
                                >
                                  <span className={`whitespace-nowrap text-[11px] font-black leading-none tracking-tight ${isOver ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {perf.start_time}{perf.end_time && ` ～ ${perf.end_time}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-[6] flex flex-col justify-center gap-0.5 bg-white/50 backdrop-blur-sm py-1">
                                {group.has_reception && (
                                  <div className={`flex items-center justify-center gap-1.5 text-[9px] font-black px-1 whitespace-nowrap overflow-hidden ${
                                    currentReception === 'ticket_only' ? 'text-brand-600' : 
                                    ['closed', 'ended'].includes(currentReception) ? 'text-rose-600' : 
                                    currentReception === 'before_open' ? 'text-slate-400' : 
                                    'text-emerald-600'
                                  }`}>
                                    <Info size={10} className="shrink-0" strokeWidth={3} />
                                    <span className="truncate">{currentReception === 'ticket_only' ? '整理券のみ' : getReceptionLabel(currentReception)}</span>
                                  </div>
                                )}
                                {group.has_ticket_status && (
                                  <div className={`flex items-center justify-center gap-1.5 text-[9px] font-black px-1 whitespace-nowrap overflow-hidden ${
                                    computedTicket === 'ended' ? 'text-rose-600' :
                                    computedTicket === 'none' ? 'text-slate-400' :
                                    'text-emerald-600'
                                  }`}>
                                    <Ticket size={10} className="shrink-0" strokeWidth={3} />
                                    <span className="truncate">{getStatusLabel(computedTicket).replace('整理券', '')}</span>
                                  </div>
                                )}
                                {!group.has_reception && !group.has_ticket_status && (
                                  <div className="flex flex-col items-center justify-center w-full h-full px-0.5 overflow-hidden">
                                    <div 
                                      className="flex flex-col items-center justify-center min-w-max origin-center"
                                      style={{ transform: `scale(${Math.max(0.25, Math.min(1, width / 12))})` }}
                                    >
                                      <span className="font-black text-slate-400 whitespace-nowrap text-[11px] tracking-tighter leading-none">
                                        公演開始時間に合わせて
                                      </span>
                                      <span className="font-black text-slate-400 whitespace-nowrap text-[11px] tracking-tighter leading-none mt-1.5">
                                        直接会場へお越しください
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      }
                    </div>
                  </div>
                ); })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

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
                    <span className="text-sm px-3 py-1 rounded-full bg-brand-50 text-brand-600 font-black uppercase tracking-widest shrink-0">
                      {selectedPerf.start_time}{selectedPerf.end_time && ` ～ ${selectedPerf.end_time}`}
                    </span>
                    {selectedGroup.title && selectedGroup.title !== selectedGroup.name && (
                      <span className="text-sm font-black text-brand-600 uppercase tracking-[0.1em] text-right">
                        {selectedGroup.name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight whitespace-pre-wrap">
                    {selectedGroup.title || selectedGroup.name}
                  </h2>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <MapPin size={14} />
                    <span>{selectedGroup.building} {selectedGroup.room}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedGroup && !selectedGroup.has_reception && !selectedGroup.has_ticket_status ? (
                    <div className="py-8 bg-slate-50/50 rounded-3xl border border-slate-100/50 flex items-center justify-center">
                      <p className="text-xl font-black text-slate-900 leading-relaxed text-center">
                        公演開始時間に合わせて<br />
                        直接会場へお越しください
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className={`grid gap-3 ${(selectedPerf.groups?.has_reception && selectedPerf.groups?.has_ticket_status) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {selectedPerf.groups?.has_reception && (
                          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Info size={10} strokeWidth={3} />
                              <span className="text-[8px] font-black uppercase tracking-widest">公演受付</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center w-full">
                              <div className={`font-black text-center leading-[1.2] ${
                                selectedPerf.currentReception === 'ticket_only' ? 'text-brand-700' :
                                ['closed', 'ended'].includes(selectedPerf.currentReception) ? 'text-rose-600' :
                                selectedPerf.currentReception === 'before_open' ? 'text-slate-500' :
                                'text-emerald-600'
                              }`}>
                                {selectedPerf.currentReception === 'ticket_only' ? (
                                  <>整理券を<br />お持ちの方のみ<br />案内中</>
                                ) : getReceptionLabel(selectedPerf.currentReception || 'open')}
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedPerf.groups?.has_ticket_status && (
                          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Ticket size={10} strokeWidth={3} />
                              <span className="text-[8px] font-black uppercase tracking-widest">整理券</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center w-full">
                              <div className={`text-base font-black text-center leading-tight ${
                                (selectedPerf.computedTicket || selectedPerf.status) === 'ended' ? 'text-rose-600' :
                                (selectedPerf.computedTicket || selectedPerf.status) === 'none' ? 'text-slate-500' :
                                'text-emerald-600'
                              }`}>
                                {getStatusLabel(selectedPerf.computedTicket || selectedPerf.status).replace('整理券', '')}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedPerf.groups?.has_ticket_status && (
                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-center">
                          整理券は紙での配布となります。<br />
                          詳細は各団体にご確認ください。
                        </p>
                      )}
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
    .from('performances')
    .select('id, group_id, part_id, start_time, end_time, status, reception_status, groups(id, title, name, building, room, has_reception, has_ticket_status)')
    .order('part_id', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('getStaticProps fetch error:', error);
    return { props: { initialPerformances: [] }, revalidate: 60 };
  }

  return {
    props: {
      initialPerformances: data || [],
    },
    revalidate: 10,
  };
}

export default Timetable;
