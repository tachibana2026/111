import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, SortDesc, Instagram, Twitter, ExternalLink, RefreshCw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['すべて', '体験', '食品', '公演', '展示', '冊子', '物販'];
const GRADES = ['すべて', '1年', '2年', '3年', '有志'];
const BUILDINGS = ['すべて', '仮校舎', '体育館', '南館'];

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [filterDept, setFilterDept] = useState('すべて');
  const [filterGrade, setFilterGrade] = useState('すべて');
  const [filterBuilding, setFilterBuilding] = useState('すべて');
  const [sortBy, setSortBy] = useState('class');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);

  // Fetch initial data & set up real-time subscription
  useEffect(() => {
    fetchGroups();

    const groupSub = supabase
      .channel('groups_changes')
      .on('postgres_changes', { event: '*', table: 'groups' }, fetchGroups)
      .on('postgres_changes', { event: '*', table: 'group_activities' }, fetchGroups)
      .on('postgres_changes', { event: '*', table: 'performances' }, fetchGroups)
      .subscribe();

    return () => {
      supabase.removeChannel(groupSub);
    };
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    // groups に関連する activities と performances を結合して取得
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_activities(*), performances(*)');
    
    if (error) {
      console.error('Fetch error:', error);
    }
    
    if (data) {
      setGroups(data);
    }
    setLoading(false);
  };

  const getStatusColor = (activity) => {
    const { department, waiting_time, status } = activity;
    
    if (department === '冊子') {
      if (status === 'ended') return 'bg-slate-100 text-slate-400 border-slate-200';
      if (status === 'limited') return 'bg-amber-50 text-amber-600 border-amber-200';
      return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
    
    if (status === 'closed') return 'bg-slate-50 border-slate-200 text-slate-500';

    if (department === '展示' || department === '公演') {
      return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    }

    // 待ち時間カラーコード (体験、食品、物販)
    if (waiting_time <= 10) return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    if (waiting_time <= 30) return 'bg-amber-50 border-amber-200 text-amber-600';
    return 'bg-rose-50 border-rose-200 text-rose-600';
  };

  const getStatusText = (activity) => {
    const { department, waiting_time, status } = activity;

    if (department === '冊子') {
      if (status === 'ended') return '配布終了';
      if (status === 'limited') return '残りわずか';
      return '配布中';
    }

    if (status === 'closed') return '受付終了';

    if (department === '展示') return '受付中';
    if (department === '公演') return '公演情報';

    if (waiting_time === 0) return '待ちなし';
    return `${waiting_time}分待ち`;
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

  // Helper to get the overall next performance for a group
  const getNextPerformance = (group) => {
    const now = new Date();
    const sorted = (group.performances || [])
      .map(p => {
        // 簡易的な日付マッピング
        const festDate = p.part_id === 3 ? '2026-06-14' : '2026-06-13';
        return { ...p, fullDate: new Date(`${festDate}T${p.start_time}:00`) };
      })
      .filter(p => p.fullDate > now)
      .sort((a, b) => a.fullDate - b.fullDate);

    return sorted[0] || null;
  };

  const filteredGroups = groups
    .filter(g => 
      (filterDept === 'すべて' || g.group_activities.some(a => a.department === filterDept)) &&
      (filterGrade === 'すべて' || g.name.startsWith(filterGrade)) &&
      (filterBuilding === 'すべて' || g.building === filterBuilding)
    )
    .sort((a, b) => {
      if (sortBy === 'time-asc') {
        const minA = Math.min(...a.group_activities.map(act => act.waiting_time || 0), 0);
        const minB = Math.min(...b.group_activities.map(act => act.waiting_time || 0), 0);
        return minA - minB;
      }
      if (sortBy === 'time-desc') {
        const maxA = Math.max(...a.group_activities.map(act => act.waiting_time || 0), 0);
        const maxB = Math.max(...b.group_activities.map(act => act.waiting_time || 0), 0);
        return maxB - maxA;
      }
      if (sortBy === 'area') {
        if (a.building !== b.building) return a.building.localeCompare(b.building);
        return a.room.localeCompare(b.room);
      }
      return a.name.localeCompare(b.name);
    });

  const PerformanceList = ({ schedule, dayLabel, partId, currentNextPerf }) => {
    const partSchedule = schedule.filter(p => p.part_id === partId);
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
      else if (currentReception === 'ticket_only') receptionStatus = '整理券のみ';
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
                  <div className={`text-[9px] font-black ${currentReception === 'closed' ? 'text-rose-500' : currentReception === 'ticket_only' ? 'text-brand-600' : currentReception === 'before_open' ? 'text-slate-400' : 'text-emerald-500'}`}>{receptionStatus}</div>
                  <div className="text-[9px] font-bold opacity-70">{ticketStatus}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center space-x-4 text-slate-900">
          <div className="w-2 h-10 bg-brand-600 rounded-full shadow-lg shadow-brand-500/20"></div>
          <h1 className="text-4xl font-black tracking-tight">発表団体</h1>
        </div>
        
        {/* Filters */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-8">
           <div className="flex flex-col space-y-8">
             <div className="flex flex-col space-y-4">
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                 <Filter size={12} className="text-brand-600/50" /> 学年
                </span>
               <div className="flex flex-wrap items-center gap-2.5">
                 {GRADES.map(g => (
                   <button 
                    key={g} 
                    onClick={() => setFilterGrade(g)}
                    className={`w-24 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${filterGrade === g ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
                   >
                     {g}
                   </button>
                 ))}
               </div>
             </div>
             <div className="flex flex-col space-y-4">
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                 <Filter size={12} className="text-brand-600/50" /> 部門
                </span>
               <div className="flex flex-wrap items-center gap-2.5">
                 {DEPARTMENTS.map(d => (
                   <button 
                    key={d} 
                    onClick={() => setFilterDept(d)}
                    className={`w-24 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${filterDept === d ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
                   >
                     {d}
                   </button>
                 ))}
               </div>
             </div>
             <div className="flex flex-col space-y-4">
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                 <Filter size={12} className="text-brand-600/50" /> 場所
                </span>
               <div className="flex flex-wrap items-center gap-2.5">
                 {BUILDINGS.map(b => (
                   <button 
                    key={b} 
                    onClick={() => setFilterBuilding(b)}
                    className={`w-24 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center border-2 ${filterBuilding === b ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100 hover:bg-slate-50'}`}
                   >
                     {b}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex justify-end px-4">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <SortDesc size={14} className="text-brand-600/50" /> 並び替え
            </span>
            <select 
              className="custom-select min-w-[180px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="class">クラス順</option>
              <option value="area">エリア順</option>
              <option value="time-asc">待ち時間 (短い順)</option>
              <option value="time-desc">待ち時間 (長い順)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <RefreshCw className="animate-spin text-brand-600 mb-6" size={40} />
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">データを読み込み中...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredGroups.map((group) => (
                <motion.div
                  layout
                  key={group.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`bg-white border border-slate-100 rounded-[2rem] p-8 flex flex-col h-full shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 ${group.group_activities.every(a => a.status === 'closed' || a.status === 'ended') ? 'opacity-60 saturate-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        {group.group_activities.map((act, idx) => (
                          <span key={idx} className="text-[9px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider">
                            {act.department}
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
                      {group.group_activities.map((act, idx) => (
                        <div key={idx} className={`status-badge border shadow-sm ${getStatusColor(act)}`}>
                          {getStatusText(act)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-grow space-y-6">
                    <p className="text-sm text-slate-500 font-bold leading-relaxed line-clamp-3">
                      {group.description}
                    </p>

                    {group.group_activities.some(a => a.department === '公演') && (() => {
                      const nextPerf = getNextPerformance(group);
                      return (
                        <div className="pt-6 border-t border-slate-50 space-y-6">
                          <PerformanceList 
                            schedule={group.performances || []} 
                            dayLabel="Part 1 (6/13)" 
                            partId={1} 
                            currentNextPerf={nextPerf} 
                          />
                          <PerformanceList 
                            schedule={group.performances || []} 
                            dayLabel="Part 2 (6/13)" 
                            partId={2} 
                            currentNextPerf={nextPerf} 
                          />
                          <PerformanceList 
                            schedule={group.performances || []} 
                            dayLabel="Part 3 (6/14)" 
                            partId={3} 
                            currentNextPerf={nextPerf} 
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
                      {group.social_links?.twitter && (
                        <a href={group.social_links.twitter} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-sky-500 transition-colors">
                          <Twitter size={18} />
                        </a>
                      )}
                      {group.social_links?.website && (
                        <a href={group.social_links.website} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-brand-600 transition-colors">
                          <ExternalLink size={18} />
                        </a>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-300 tracking-tighter">
                      {group.updated_at ? (
                        `更新: ${Math.floor((new Date() - new Date(group.updated_at)) / 60000)}分前`
                      ) : (
                        'データなし'
                      )}
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
        </>
      )}

      {/* Performance Detail Modal */}
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
                  <MapPin size={14} className="text-slate-300" />
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

export default Groups;
