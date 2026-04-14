import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Clock, MapPin, RefreshCw, ChevronRight, 
  Info, Building2, Dumbbell, Calendar, Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PARTS = [
  { id: 1, name: 'Part 1', day: 1, range: ['09:00', '12:00'] },
  { id: 2, name: 'Part 2', day: 1, range: ['13:00', '16:00'] },
  { id: 3, name: 'Part 3', day: 2, range: ['09:00', '12:00'] },
];

const TIME_SLOTS_MAP = {
  1: Array.from({ length: 7 }, (_, i) => { // 30分刻みに変更
    const totalMinutes = 9 * 60 + i * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }),
  2: Array.from({ length: 7 }, (_, i) => {
    const totalMinutes = 13 * 60 + i * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }),
  3: Array.from({ length: 7 }, (_, i) => {
    const totalMinutes = 9 * 60 + i * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }),
};

const COLUMN_WIDTH = 100; // 30分あたりの幅

const Timetable = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePart, setActivePart] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    
    const sub = supabase
      .channel('timetable_changes')
      .on('postgres_changes', { event: '*', table: 'groups' }, fetchGroups)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data } = await supabase.from('groups').select('*').eq('department', '公演').order('building', { ascending: false }).order('room', { ascending: true });
    if (data) setGroups(data);
    setLoading(false);
  };

  const getTimeLeft = (timeStr, partId) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startHour = partId === 2 ? 13 : 9;
    const diffMinutes = (h * 60 + m) - (startHour * 60);
    return (diffMinutes / 30) * COLUMN_WIDTH;
  };

  const isPast = (perf) => {
    const timeToCompare = perf.end_time || perf.time;
    const [h, m] = timeToCompare.split(':').map(Number);
    const nowH = currentTime.getHours();
    const nowM = currentTime.getMinutes();
    
    // 終了時間が設定されている場合はその時間を、ない場合は開始+20分を基準にする
    const totalNow = nowH * 60 + nowM;
    const totalPerfEnd = h * 60 + m + (perf.end_time ? 0 : 20); 
    
    return totalNow > totalPerfEnd;
  };

  const getPerfWidth = (perf) => {
    if (!perf.end_time) return COLUMN_WIDTH * 0.9; // 30分枠に対して適切なデフォルト幅
    const [h1, m1] = perf.time.split(':').map(Number);
    const [h2, m2] = perf.end_time.split(':').map(Number);
    const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    // 30分あたりの幅に対して、マージン分(8px)を引いて調整
    return Math.max((diffMinutes / 30) * COLUMN_WIDTH - 8, 40);
  };

  const getStatusLabel = (status) => {
    if (status === 'distributing') return '整理券配布中';
    if (status === 'ended') return '配布終了';
    return '配布なし';
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
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-slate-900">
            <div className="w-1.5 h-8 bg-brand-600 rounded-full"></div>
            <h1 className="text-3xl font-black tracking-tight">公演タイムテーブル</h1>
          </div>
          
          <div className="flex p-1 bg-slate-200/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
            {PARTS.map(part => (
              <button 
                key={part.id}
                onClick={() => setActivePart(part.id)}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activePart === part.id ? 'bg-white text-brand-700 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {part.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timetable Grid Container */}
      <div className="relative bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
        {/* Horizontal Scroll Area */}
        <div className="overflow-x-auto no-scrollbar" ref={scrollContainerRef}>
          <div className="inline-block min-w-full">
            
            {/* Time Labels Row */}
            <div className="flex border-b border-slate-50 bg-white/95 backdrop-blur-md sticky top-0 z-20">
              <div className="w-40 flex-shrink-0 border-r border-slate-50 bg-white sticky left-0 z-30 flex items-center justify-center">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">団体 / 会場</span>
              </div>
              {timeSlots.map((time, i) => (
                <div key={time} className="flex-shrink-0 flex items-center justify-center" style={{ width: COLUMN_WIDTH }}>
                  <span className="text-[11px] font-black text-slate-400 py-4">
                    {time}
                  </span>
                </div>
              ))}
            </div>

            {/* Groups Grid */}
            <div className="relative">
              {groups.map((group) => (
                <div key={group.id} className="flex border-b border-slate-50 group hover:bg-slate-50/50 transition-colors">
                  {/* Group Label Row Head */}
                  <div className="w-40 flex-shrink-0 border-r border-slate-50 bg-white sticky left-0 z-10 p-4 flex flex-col justify-center gap-1 group-hover:bg-slate-50/80">
                    <span className="text-[9px] font-black text-brand-600 uppercase tracking-tighter">
                      {group.building} {group.room}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 leading-tight truncate">
                      {group.title || group.name}
                    </h3>
                  </div>

                  {/* Performances Row */}
                  <div className="flex relative h-20" style={{ width: timeSlots.length * COLUMN_WIDTH }}>
                    {/* Time slot grid lines */}
                    {timeSlots.map((_, i) => (
                      <div key={i} className="h-full border-r border-slate-50/50" style={{ width: COLUMN_WIDTH }}></div>
                    ))}

                    {/* Performance Blocks */}
                    {(currentPart.day === 1 ? group.performance_day1 : group.performance_day2 || [])
                      .filter(perf => perf.time >= currentPart.range[0] && perf.time < currentPart.range[1])
                      .map((perf, pIdx) => {
                        const left = getTimeLeft(perf.time, activePart);
                        const isOver = isPast(perf);
                        return (
                          <motion.div
                            key={pIdx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1 - (isOver ? 0.6 : 0), x: 0 }}
                            onClick={() => {
                              setSelectedGroup(group);
                              setSelectedPerf(perf);
                            }}
                            className={`absolute top-2 bottom-2 rounded-xl border shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-center px-4 overflow-hidden ${
                              perf.status === 'distributing' 
                              ? 'bg-brand-50 border-brand-100 text-brand-700' 
                              : perf.status === 'ended' || isOver
                              ? 'bg-slate-50 border-slate-100 text-slate-400'
                              : 'bg-white border-slate-100 text-slate-600'
                            }`}
                            style={{ 
                              left: left + 4, 
                              width: getPerfWidth(perf),
                              zIndex: 5 
                            }}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-black leading-none">{perf.time}{perf.end_time && ` - ${perf.end_time}`}</span>
                              {isOver && <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">終了</span>}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full inline-block w-fit ${
                              perf.status === 'distributing' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {getStatusLabel(perf.status)}
                            </span>
                          </motion.div>
                        );
                      })
                    }
                  </div>
                </div>
              ))}

              {/* Current Time Indicator Line (Horizontal indicator) */}
              {(() => {
                const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
                
                if (nowStr >= currentPart.range[0] && nowStr < currentPart.range[1]) {
                  const left = getTimeLeft(nowStr, activePart);
                  return (
                    <div 
                      className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
                      style={{ 
                        left: 160 + left, // 40(w-40) * 4(units) = 160px
                        transition: 'left 30s linear'
                      }}
                    >
                      <div className="h-full w-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"></div>
                      <div className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg absolute -top-4 transform -translate-x-1/2 flex items-center gap-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                        LIVE
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 px-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-md bg-brand-500 shadow-sm shadow-brand-500/20"></div>
          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">整理券配布中</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-md bg-white border border-slate-200"></div>
          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">整理券なし</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200"></div>
          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">終了・配布完了</span>
        </div>
      </div>

      {/* Group Detail Modal */}
      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedGroup(null);
                setSelectedPerf(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative bg-white w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden"
            >
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-black uppercase tracking-widest border border-brand-100">
                        公演団体
                      </span>
                      <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                        {selectedGroup.name}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 leading-tight">
                      {selectedGroup.title || selectedGroup.name}
                    </h3>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <Info size={28} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center text-brand-600 gap-2 mb-1">
                      <Clock size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">公演時間</span>
                    </div>
                    <span className="text-lg font-black text-slate-800">
                      {selectedPerf?.time || '時間未設定'}
                      {selectedPerf?.end_time && ` 〜 ${selectedPerf.end_time}`}
                    </span>
                  </div>
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center text-brand-600 gap-2 mb-1">
                      <MapPin size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">場所</span>
                    </div>
                    <span className="text-sm font-black text-slate-800 truncate block">
                      {selectedGroup.building} {selectedGroup.room}
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-brand-50/50 border border-brand-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-600 shadow-sm">
                      <Ticket size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest block mb-0.5">整理券状況</span>
                      <span className="text-base font-black text-slate-900">
                        {selectedPerf ? getStatusLabel(selectedPerf.status) : '-'}
                      </span>
                    </div>
                  </div>
                  {selectedPerf?.status === 'distributing' && (
                    <div className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse">
                      配布中
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">団体紹介</span>
                  <p className="text-slate-600 text-base leading-relaxed font-medium bg-slate-50 p-6 rounded-3xl">
                    {selectedGroup.description || '紹介文はありません。'}
                  </p>
                </div>

                <button 
                  onClick={() => {
                    setSelectedGroup(null);
                    setSelectedPerf(null);
                  }}
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                >
                  閉じる
                </button>
              </div>
              
              {/* Decorative gradient blur */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-200/20 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-100/20 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timetable;
