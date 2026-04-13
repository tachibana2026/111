import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, SortDesc, Instagram, Twitter, ExternalLink, RefreshCw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['すべて', '体験', '食品', '公演', '展示', '冊子'];
const GRADES = ['すべて', '1年', '2年', '3年', '有志'];
const BUILDINGS = ['すべて', '仮校舎', '体育館', '南館'];

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups'); // 実際には使用されていないステートがある場合は適宜削除
  const [filterDept, setFilterDept] = useState('すべて');
  const [filterGrade, setFilterGrade] = useState('すべて');
  const [filterBuilding, setFilterBuilding] = useState('すべて');
  const [sortBy, setSortBy] = useState('class'); // class, area, time-asc, time-desc

  // Fetch initial data & set up real-time subscription
  useEffect(() => {
    fetchGroups();

    const subscription = supabase
      .channel('groups_changes')
      .on('postgres_changes', { event: '*', table: 'groups' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setGroups(current => current.map(g => g.id === payload.new.id ? payload.new : g));
        } else if (payload.eventType === 'INSERT') {
          setGroups(current => [...current, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setGroups(current => current.filter(g => g.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('groups').select('*');
    
    if (error) {
      console.error('Fetch error:', error);
    }
    
    if (data) {
      setGroups(data);
    }
    setLoading(false);
  };

  const getStatusColor = (group) => {
    const { department, waiting_time, status, booklet_status } = group;
    
    if (department === '冊子') {
      if (booklet_status === 'ended') return 'bg-slate-100 text-slate-400 border-slate-200';
      if (booklet_status === 'limited') return 'bg-amber-50 text-amber-600 border-amber-200';
      return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
    
    if (department === '公演' || department === '展示') {
      return status === 'open' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500';
    }

    if (status === 'closed') return 'bg-slate-50 border-slate-200 text-slate-500';

    // 待ち時間カラーコード
    if (waiting_time <= 10) return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    if (waiting_time <= 30) return 'bg-amber-50 border-amber-200 text-amber-600';
    return 'bg-rose-50 border-rose-200 text-rose-600';
  };

  const getStatusText = (group) => {
    const { department, waiting_time, status, booklet_status } = group;

    if (department === '冊子') {
      if (booklet_status === 'ended') return '配布終了';
      if (booklet_status === 'limited') return '残りわずか';
      return '配布中';
    }

    if (status === 'closed') return '受付終了';

    if (department === '展示') return '受付中';
    if (department === '公演') return '公演情報';

    if (waiting_time === 0) return '待ちなし';
    return `${waiting_time}分待ち`;
  };

  // Helper to get the overall next performance for a group
  const getNextPerformance = (group) => {
    const now = new Date();
    const day1Next = (group.performance_day1 || []).find(p => new Date(`2026-06-13T${p.time}:00`) > now);
    if (day1Next) return { ...day1Next, day: 1 };
    
    const day2Next = (group.performance_day2 || []).find(p => new Date(`2026-06-14T${p.time}:00`) > now);
    if (day2Next) return { ...day2Next, day: 2 };
    
    return null;
  };

  const filteredGroups = groups
    .filter(g => 
      (filterDept === 'すべて' || g.department === filterDept) &&
      (filterGrade === 'すべて' || g.name.startsWith(filterGrade)) &&
      (filterBuilding === 'すべて' || g.building === filterBuilding)
    )
    .sort((a, b) => {
      if (sortBy === 'time-asc') return a.waiting_time - b.waiting_time;
      if (sortBy === 'time-desc') return b.waiting_time - a.waiting_time;
      if (sortBy === 'area') {
        if (a.building !== b.building) return a.building.localeCompare(b.building);
        return a.room.localeCompare(b.room);
      }
      // クラス順: nameで自然ソート（「1年A組」 < 「1年B組」 < 「2年A組」）
      return a.name.localeCompare(b.name);
    });

  const PerformanceList = ({ schedule, dayLabel, dayNum, currentNextPerf }) => {
    if (!schedule || schedule.length === 0) return null;
    
    const now = new Date();
    const festDate = dayNum === 1 ? '2026-06-13' : '2026-06-14';

    const getPerfStatusText = (status) => {
      if (status === 'distributing') return '整理券配布中';
      if (status === 'ended') return '整理券配布終了';
      return '整理券配布なし';
    };

    return (
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          {dayLabel}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {schedule.map((p, i) => {
            const isPast = new Date(`${festDate}T${p.time}:00`) < now;
            const isNext = currentNextPerf && p.time === currentNextPerf.time && dayNum === currentNextPerf.day;
            return (
              <div key={i} className={`px-4 py-3 rounded-xl border flex flex-col justify-center gap-1 ${isPast ? 'bg-slate-50 text-slate-300 border-slate-100' : isNext ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-500/10' : 'bg-white text-slate-600 border-slate-100'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black">{p.time}</span>
                  {isNext && <span className="bg-brand-600 text-white px-1.5 py-0.5 rounded text-[7px] uppercase tracking-tighter animate-pulse">次</span>}
                </div>
                <div className="text-[9px] font-bold opacity-70">{getPerfStatusText(p.status)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-3 text-slate-900">
          <div className="w-1.5 h-8 bg-brand-600 rounded-full"></div>
          <h1 className="text-3xl font-black tracking-tight">発表団体</h1>
        </div>
        
        {/* Filters */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
           <div className="flex flex-col space-y-6">
             <div className="flex flex-col space-y-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                 <Filter size={10} /> 学年
                </span>
               <div className="flex flex-wrap items-center gap-2">
                 {GRADES.map(g => (
                   <button 
                    key={g} 
                    onClick={() => setFilterGrade(g)}
                    className={`w-20 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center ${filterGrade === g ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                   >
                     {g}
                   </button>
                 ))}
               </div>
             </div>
             <div className="flex flex-col space-y-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                 <Filter size={10} /> 部門
                </span>
               <div className="flex flex-wrap items-center gap-2">
                 {DEPARTMENTS.map(d => (
                   <button 
                    key={d} 
                    onClick={() => setFilterDept(d)}
                    className={`w-20 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center ${filterDept === d ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                   >
                     {d}
                   </button>
                 ))}
               </div>
             </div>
             <div className="flex flex-col space-y-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                 <Filter size={10} /> 場所
                </span>
               <div className="flex flex-wrap items-center gap-2">
                 {BUILDINGS.map(b => (
                   <button 
                    key={b} 
                    onClick={() => setFilterBuilding(b)}
                    className={`w-20 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center ${filterBuilding === b ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                   >
                     {b}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex justify-end px-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <SortDesc size={12} /> 並び替え
            </span>
            <select 
              className="custom-select min-w-[160px] font-bold shadow-sm"
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white border border-slate-100 rounded-2xl p-6 flex flex-col h-full shadow-sm transition-shadow hover:shadow-md ${group.status === 'closed' || (group.department === '冊子' && group.booklet_status === 'ended') ? 'opacity-60 saturate-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider">
                          {group.department}
                        </span>
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
                    <div className={`status-badge border shadow-sm ${getStatusColor(group)}`}>
                      {getStatusText(group)}
                    </div>
                  </div>

                  <div className="flex-grow space-y-5">
                    <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-3">
                      {group.description}
                    </p>

                    {group.department === '公演' && (() => {
                      const nextPerf = getNextPerformance(group);
                      return (
                        <div className="pt-4 border-t border-slate-50">
                          <PerformanceList schedule={group.performance_day1} dayLabel="Day 1 (6/13)" dayNum={1} currentNextPerf={nextPerf} />
                          <div className="mt-4">
                            <PerformanceList schedule={group.performance_day2} dayLabel="Day 2 (6/14)" dayNum={2} currentNextPerf={nextPerf} />
                          </div>
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
    </div>
  );
};

export default Groups;
