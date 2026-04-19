import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, MapPin, Ticket, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from '../components/Portal';

const PARTS = [
  { id: 1, name: 'Part 1', day: 1, range: ['08:45', '12:15'] },
  { id: 2, name: 'Part 2', day: 1, range: ['12:45', '16:15'] },
  { id: 3, name: 'Part 3', day: 2, range: ['08:45', '12:15'] }
];

const BUILDING_ORDER = ['仮校舎', '体育館', 'セミナー', '南館'];

const TIME_SLOTS_MAP = {
  1: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
  2: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  3: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']
};

const COLUMN_WIDTH = 100; // 30分あたりの幅

const Timetable = ({ initialPerformances }) => {
  const [performances, setPerformances] = useState(initialPerformances);
  const [activePart, setActivePart] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const scrollContainerRefs = useRef([]);
  const sidebarRef = useRef(null);
  const buildingRefs = useRef({});

  useEffect(() => {
    // Current time ticking
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (performances.length > 0 && scrollContainerRefs.current.length > 0) {
      const timer = setTimeout(() => {
        scrollToCurrentTime(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activePart, performances]);

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    scrollContainerRefs.current.forEach(ref => {
      if (ref && ref !== e.target) {
        ref.scrollLeft = scrollLeft;
      }
    });
  };

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
    const [h1, m1] = perf.start_time.split(':').map(Number);
    const diffMinutes = perf.end_time 
      ? (() => {
          const [h2, m2] = perf.end_time.split(':').map(Number);
          return (h2 * 60 + m2) - (h1 * 60 + m1);
        })()
      : 25; // デフォルト25分
    return (diffMinutes / currentPartInfo.duration) * 100;
  };

  const scrollToCurrentTime = (smooth = false) => {
    if (scrollContainerRefs.current.length === 0 || !sidebarRef.current) return;
    if (!currentTime.toISOString().startsWith('2026-06')) return;

    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const totalNow = h * 60 + m;

    if (totalNow >= currentPartInfo.startTotal && totalNow <= currentPartInfo.endTotal) {
      const diffMinutes = totalNow - currentPartInfo.startTotal;
      const ref = scrollContainerRefs.current.find(r => r);
      if (!ref) return;
      const sidebarWidth = sidebarRef.current.offsetWidth;
      const timelineWidth = ref.scrollWidth - sidebarWidth;
      const left = (diffMinutes / currentPartInfo.duration) * timelineWidth;

      scrollContainerRefs.current.forEach(r => {
        if (r) {
          r.scrollTo({
            left: Math.max(0, left - 40),
            behavior: smooth ? 'smooth' : 'auto'
          });
        }
      });
    }
  };

  const isPast = (perf) => {
    const festDate = perf.part_id === 3 ? '2026-06-14' : '2026-06-13';
    const timeToCompare = perf.end_time || perf.start_time;
    const perfEnd = new Date(`${festDate}T${timeToCompare}:00`);
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
    BUILDING_ORDER.forEach(b => map.set(b, []));

    performances.forEach(p => {
      if (!p.groups) return;
      if (!map.has(p.groups.building)) map.set(p.groups.building, []);
      
      const existingGroup = map.get(p.groups.building).find(g => g.id === p.group_id);
      if (existingGroup) {
        existingGroup.group_performances.push(p);
      } else {
        map.get(p.groups.building).push({ ...p.groups, group_performances: [p] });
      }
    });

    return BUILDING_ORDER.map(building => {
      const groups = map.get(building).sort((a, b) => {
        if (a.room !== b.room) return a.room.localeCompare(b.room, 'ja', { numeric: true });
        return a.name.localeCompare(b.name, 'ja', { numeric: true });
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
    if (status === 'ticket_only') return '整理券をお持ちの方のみ受付中';
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
                onClick={() => setActivePart(part.id)}
                className={`flex-1 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-black transition-all flex items-center justify-center gap-2 ${activePart === part.id ? 'bg-white text-brand-700 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                 <Clock size={14} className={activePart === part.id ? 'text-brand-600' : 'text-slate-400'} />
                {part.name}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">場所でジャンプ</p>
            <div className="flex w-full gap-2 md:gap-3 px-1">
              {BUILDING_ORDER.map(building => (
                <button
                  key={building}
                  onClick={() => {
                    buildingRefs.current[building]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex-1 px-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] md:text-[11px] font-black text-slate-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all shadow-sm active:scale-95"
                >
                  {building}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <p className="text-xs font-black text-slate-400">各公演回をタップすると詳細が表示されます</p>
      </div>

      <div className="space-y-12">
        {buildingsData.map((bInfo, idx) => (
          <div key={bInfo.building} ref={el => buildingRefs.current[bInfo.building] = el} className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-brand-600 rounded-full" />
                 <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{bInfo.building}</h2>
               </div>
            </div>

            <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div 
                className="overflow-x-auto no-scrollbar scroll-smooth" 
                ref={el => scrollContainerRefs.current[idx] = el}
                onScroll={handleScroll}
              >
                <div className="inline-block min-w-full">
                  <div className="flex border-b border-slate-200 bg-white sticky top-0 z-20">
                    <div ref={idx === 0 ? sidebarRef : null} className="w-24 md:w-32 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-30 flex items-center justify-start py-4 px-3">
                      <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-tighter text-left">タイトル / 団体名</span>
                    </div>
                    <div className="flex-1 flex min-w-[950px] lg:min-w-0 relative h-12 pr-6">
                      {timeSlots.map((time) => (
                        <div 
                          key={time} 
                          className="absolute top-0 bottom-0" 
                          style={{ left: `${getTimeLeft(time)}%` }}
                        >
                          <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white px-1 z-10 whitespace-nowrap">
                            {time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 pointer-events-none flex z-[15]">
                      <div className="w-24 md:w-32 flex-shrink-0" />
                      <div className="flex-1 relative min-w-[950px] lg:min-w-0 pr-6">
                        {renderCurrentTimeLine()}
                      </div>
                    </div>
                    
                    {bInfo.groups.map((group) => (
                      <div key={group.id} className="flex border-b border-slate-200 group hover:bg-slate-50/50 transition-colors">
                        <div className="w-24 md:w-32 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10 p-2 md:p-3 flex flex-col justify-center items-start gap-1 group-hover:bg-slate-50 transition-colors">
                          {group.title && group.title !== group.name && (
                            <h3 className="text-[10px] md:text-[11px] font-black text-slate-900 leading-tight break-words text-left">
                              {group.title}
                            </h3>
                          )}
                          <span className={`font-bold text-left leading-tight break-words ${group.title && group.title !== group.name ? 'text-[8px] md:text-[9px] text-slate-400' : 'text-[10px] md:text-[11px] text-slate-900'}`}>
                            {group.name}
                          </span>
                        </div>

                        <div className="flex-1 relative min-h-[110px] min-w-[950px] lg:min-w-0 pr-6">
                          {timeSlots.map((time) => (
                            <div 
                              key={time} 
                              className="absolute top-0 bottom-0 border-r border-slate-200" 
                              style={{ left: `${getTimeLeft(time)}%` }}
                            ></div>
                          ))}

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
                                  className={`absolute top-2.5 bottom-2.5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-center px-4 overflow-hidden ${isOver
                                    ? 'bg-slate-50 border-slate-100 text-slate-400'
                                    : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  style={{
                                    left: `calc( ${left}% + 6px )`,
                                    width: `calc( ${width}% - 12px )`,
                                    zIndex: 5
                                  }}
                                >
                                  <div className="flex-[4] px-2 text-center flex items-center justify-center overflow-hidden border-b border-slate-100">
                                    <span className={`whitespace-nowrap text-[11px] font-black leading-none tracking-tight ${isOver ? 'text-slate-400' : 'text-slate-700'}`}>{perf.start_time}{perf.end_time && ` ～ ${perf.end_time}`}</span>
                                  </div>
                                  <div className="flex-[6] flex flex-col justify-center gap-0.5 bg-white/50 backdrop-blur-sm py-1">
                                    <div className={`flex items-center justify-center gap-1.5 text-[9px] font-black px-1 whitespace-nowrap overflow-hidden ${
                                      currentReception === 'ticket_only' ? 'text-brand-600' : 
                                      ['closed', 'before_open'].includes(currentReception) ? 'text-slate-400' : 
                                      'text-emerald-500'
                                    }`}>
                                      <CheckCircle2 size={10} className="shrink-0" strokeWidth={3} />
                                      <span className="truncate">{currentReception === 'ticket_only' ? '整理券のみ' : getReceptionLabel(currentReception)}</span>
                                    </div>
                                    <div className={`flex items-center justify-center gap-1.5 text-[9px] font-black px-1 whitespace-nowrap overflow-hidden ${
                                      ['ended', 'none'].includes(computedTicket) ? 'text-slate-400' :
                                      'text-emerald-500'
                                    }`}>
                                      <Ticket size={10} className="shrink-0" strokeWidth={3} />
                                      <span className="truncate">{getStatusLabel(computedTicket).replace('整理券', '')}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
                  <div className="flex items-center justify-between">
                    <span className="text-base px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-black uppercase tracking-widest">
                      {selectedPerf.start_time}{selectedPerf.end_time && ` ～ ${selectedPerf.end_time}`}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedGroup.title || selectedGroup.name}</h2>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <MapPin size={14} />
                    <span>{selectedGroup.building} {selectedGroup.room}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[80px]">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CheckCircle2 size={10} strokeWidth={3} />
                        <span className="text-[8px] font-black uppercase tracking-widest">公演受付</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full">
                        <div className={`text-base font-black text-center leading-tight ${
                          selectedPerf.currentReception === 'ticket_only' ? 'text-brand-700' :
                          ['closed', 'ended', 'before_open'].includes(selectedPerf.currentReception) ? 'text-slate-500' :
                          'text-emerald-600'
                        }`}>
                          {getReceptionLabel(selectedPerf.currentReception || 'open')}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[80px]">
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
    .select('id, group_id, part_id, start_time, end_time, status, reception_status, groups(id, title, name, building, room)')
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
    revalidate: 3600,
  };
}

export default Timetable;
