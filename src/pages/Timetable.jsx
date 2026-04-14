import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight,
  Info, Calendar, Filter, Users, SortDesc, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PARTS = [
  { id: 1, name: 'Part 1', day: 1, range: ['09:00', '12:00'] },
  { id: 2, name: 'Part 2', day: 1, range: ['13:00', '16:00'] },
  { id: 3, name: 'Part 3', day: 2, range: ['09:00', '12:00'] }
];

const TIME_SLOTS_MAP = {
  1: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
  2: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  3: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']
};

const COLUMN_WIDTH = 100; // 30分あたりの幅

const Timetable = () => {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePart, setActivePart] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchPerformances();
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);

    const sub = supabase
      .channel('timetable_changes')
      .on('postgres_changes', { event: '*', table: 'performances' }, fetchPerformances)
      .on('postgres_changes', { event: '*', table: 'groups' }, fetchPerformances)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, []);

  useEffect(() => {
    if (!loading && performances.length > 0 && scrollContainerRef.current) {
      // 描画を確実にするため少し遅延させてスクロール
      const timer = setTimeout(() => {
        scrollToCurrentTime(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, activePart]);

  const scrollToCurrentTime = (smooth = false) => {
    const festDate = activePart === 3 ? '2026-06-14' : '2026-06-13';
    const isSameDay = currentTime.toISOString().split('T')[0] === festDate;
    if (!isSameDay) return;

    const range = PARTS.find(p => p.id === activePart).range;
    const [startH, startM] = range[0].split(':').map(Number);
    const [endH, endM] = range[1].split(':').map(Number);

    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const totalNow = h * 60 + m;
    const totalStart = startH * 60 + startM;
    const totalEnd = endH * 60 + endM;

    if (totalNow >= totalStart && totalNow <= totalEnd) {
      const diffMinutes = totalNow - totalStart;
      const left = (diffMinutes / 30) * COLUMN_WIDTH;

      // 少し余裕（40pxほど）を持たせてスクロール
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, left - 40),
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  };

  const fetchPerformances = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('performances')
      .select('*, groups(*)')
      .order('part_id', { ascending: true })
      .order('start_time', { ascending: true });

    if (data) setPerformances(data);
    setLoading(false);
  };

  const getTimeLeft = (timeStr, partId) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startHour = partId === 2 ? 13 : 9;
    const diffMinutes = (h * 60 + m) - (startHour * 60);
    return (diffMinutes / 30) * COLUMN_WIDTH;
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
    const range = PARTS.find(p => p.id === activePart).range;
    const [startH, startM] = range[0].split(':').map(Number);
    const [endH, endM] = range[1].split(':').map(Number);

    const totalNow = h * 60 + m;
    const totalStart = startH * 60 + startM;
    const totalEnd = endH * 60 + endM;

    if (totalNow < totalStart || totalNow > totalEnd) return null;

    const diffMinutes = totalNow - totalStart;
    const left = (diffMinutes / 30) * COLUMN_WIDTH;

    return (
      <div
        className="absolute top-0 bottom-0 z-[15] pointer-events-none"
        style={{ left: left + 128 }} // 128 is w-32
      >
        <div className="w-0.5 h-full bg-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]"></div>
      </div>
    );
  };

  const groupedGroups = useMemo(() => {
    const map = new Map();
    performances.forEach(p => {
      if (!p.groups) return;
      if (!map.has(p.group_id)) {
        map.set(p.group_id, { ...p.groups, group_performances: [] });
      }
      map.get(p.group_id).group_performances.push(p);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.building !== b.building) return b.building.localeCompare(a.building);
      return a.room.localeCompare(b.room);
    });
  }, [performances]);

  const getPerfWidth = (perf) => {
    if (!perf.end_time) return COLUMN_WIDTH * 0.9;
    const [h1, m1] = perf.start_time.split(':').map(Number);
    const [h2, m2] = perf.end_time.split(':').map(Number);
    const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max((diffMinutes / 30) * COLUMN_WIDTH - 8, 40);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <RefreshCw className="animate-spin text-brand-600 mb-6" size={40} />
        <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">データを読み込み中...</p>
      </div>
    );
  }

  const currentPart = PARTS.find(p => p.id === activePart);
  const timeSlots = TIME_SLOTS_MAP[activePart];

  return (
    <div className="space-y-10 pb-32">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 text-slate-900">
            <div className="w-2 h-10 bg-brand-600 rounded-full shadow-lg shadow-brand-500/20"></div>
            <h1 className="text-4xl font-black tracking-tight">タイムテーブル</h1>
          </div>

          <div className="inline-flex w-fit p-1.5 bg-slate-100 rounded-[1.5rem] border border-slate-200/50 shadow-inner">
            {PARTS.map(part => (
              <button
                key={part.id}
                onClick={() => setActivePart(part.id)}
                className={`px-8 py-3 rounded-[1.2rem] text-xs font-black transition-all flex items-center justify-center min-w-[100px] ${activePart === part.id ? 'bg-white text-brand-700 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {part.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto no-scrollbar scroll-smooth" ref={scrollContainerRef}>
          <div className="inline-block min-w-full">
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-20">
              <div className="w-32 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-30 flex items-center justify-center py-4">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">団体 / 会場</span>
              </div>
              {timeSlots.map((time, i) => (
                <div key={time} className="flex-shrink-0 relative py-4" style={{ width: COLUMN_WIDTH }}>
                  {i > 0 && (
                    <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white px-1 z-10">
                      {time}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="relative">
              {renderCurrentTimeLine()}
              {groupedGroups.map((group) => (
                <div key={group.id} className="flex border-b border-slate-200 group hover:bg-slate-50/50 transition-colors">
                  <div className="w-32 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10 p-4 flex flex-col justify-center gap-1 group-hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-tight break-words">
                      {group.building} {group.room}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 leading-tight break-words py-0.5">
                      {group.title || group.name}
                    </h3>
                  </div>

                  <div className="flex relative min-h-[110px]" style={{ width: timeSlots.length * COLUMN_WIDTH }}>
                    {timeSlots.map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-r border-slate-200" style={{ width: COLUMN_WIDTH, left: i * COLUMN_WIDTH }}></div>
                    ))}

                    {group.group_performances
                      .filter(perf => perf.part_id === activePart)
                      .map((perf) => {
                        const left = getTimeLeft(perf.start_time, activePart);
                        const isOver = isPast(perf);
                        return (
                          <motion.div
                            key={perf.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1 - (isOver ? 0.6 : 0), y: 0 }}
                            onClick={() => {
                              setSelectedGroup(group);
                              const currentReception = isOver ? 'closed' : (perf.reception_status || 'open');
                              const computedTicket = (isOver && perf.status !== 'none') ? 'ended' : perf.status;
                              setSelectedPerf({ ...perf, currentReception, computedTicket });
                            }}
                            className={`absolute top-2.5 bottom-2.5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-center px-4 overflow-hidden ${perf.status === 'ended' || isOver
                              ? 'bg-slate-50 border-slate-100 text-slate-400'
                              : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            style={{
                              left: left + 6,
                              width: getPerfWidth(perf),
                              zIndex: 5
                            }}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black leading-none tracking-tight">{perf.start_time}{perf.end_time && ` - ${perf.end_time}`}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {(() => {
                                const currentReception = isOver ? 'closed' : (perf.reception_status || 'open');
                                const computedTicket = (isOver && perf.status !== 'none') ? 'ended' : perf.status;
                                return (
                                  <>
                                    <span className={`text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md inline-block w-fit ${currentReception === 'closed' ? 'bg-rose-500 text-white' : currentReception === 'ticket_only' ? 'bg-brand-600 text-white' : currentReception === 'before_open' ? 'bg-slate-400 text-white' : 'bg-emerald-500 text-white'
                                      }`}>
                                      {currentReception === 'ticket_only' ? '整理券のみ' : getReceptionLabel(currentReception)}
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md inline-block w-fit bg-slate-100 text-slate-500">
                                      {getStatusLabel(computedTicket)}
                                    </span>
                                  </>
                                );
                              })()}
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

      <AnimatePresence>
        {selectedPerf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedPerf(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl border border-slate-100 space-y-8"
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
                  <MapPin size={14} />
                  <span>{selectedGroup.building} {selectedGroup.room}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">公演受付</span>
                    <span className={`text-[10px] sm:text-sm font-black text-center ${selectedPerf.currentReception === 'closed' ? 'text-rose-500' : selectedPerf.currentReception === 'ticket_only' ? 'text-brand-600' : selectedPerf.currentReception === 'before_open' ? 'text-slate-400' : 'text-emerald-500'}`}>
                      {getReceptionLabel(selectedPerf.currentReception || 'open')}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">整理券</span>
                    <span className="text-sm font-black text-slate-500">
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
    </div>
  );
};

export default Timetable;
