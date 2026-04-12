import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, SortDesc, Instagram, Twitter, ExternalLink, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['すべて', '体験', '食品', '公演', '展示', '冊子'];
const GRADES = ['すべて', '1年', '2年', '3年', '有志'];
const BUILDINGS = ['すべて', '南館', '体育館', '仮校舎'];

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
        } else {
          fetchGroups();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    // Note: Using dummy data if DB is not set up
    const { data, error } = await supabase.from('groups').select('*');
    
    if (error || !data || data.length === 0) {
      // Fallback dummy data
      const dummyData = [
        { id: 1, name: '1-A メイズワールド', department: '体験', grade: '1年', building: '南館', room: '101', waiting_time: 15, status: 'open', description: '段ボール迷路で脱出を目指せ！', social_links: { instagram: '#' }, updated_at: new Date().toISOString() },
        { id: 2, name: '吹奏楽部 定期公演', department: '公演', grade: '有志', building: '体育館', room: 'アリーナ', waiting_time: 0, status: 'open', description: '迫力の演奏をお楽しみください。', social_links: { twitter: '#' }, updated_at: new Date().toISOString() },
        { id: 3, name: '3-C カフェ・ラ・凌雲', department: '食品', grade: '3年', building: '南館', room: '305', waiting_time: 45, status: 'busy', description: 'こだわりのコーヒーとスイーツ。', social_links: { website: '#' }, updated_at: new Date().toISOString() },
        { id: 4, name: '美術部 展示', department: '展示', grade: '有志', building: '仮校舎', room: 'A2', waiting_time: 0, status: 'open', description: '部員たちの力作が並びます。', updated_at: new Date().toISOString() },
        { id: 5, name: '2-B ターゲットシューティング', department: '体験', grade: '2年', building: '南館', room: '202', waiting_time: 80, status: 'crowded', description: '本格的な射的ゲーム！', updated_at: new Date().toISOString() },
        { id: 6, name: '茶道部 お点前会', department: '食品', grade: '有志', building: '南館', room: '和室', waiting_time: 20, status: 'closed', description: '本日の受付は終了しました。', updated_at: new Date().toISOString() },
      ];
      setGroups(dummyData);
    } else {
      setGroups(data);
    }
    setLoading(false);
  };

  const getStatusColor = (time, status) => {
    if (status === 'closed') return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (time <= 15) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (time <= 45) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getStatusText = (time, status) => {
    if (status === 'closed') return '受付終了';
    if (time === 0) return '待ちなし';
    return `${time}分待ち`;
  };

  const filteredGroups = groups
    .filter(g => 
      (searchTerm === '' || g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterDept === 'すべて' || g.department === filterDept) &&
      (filterGrade === 'すべて' || g.grade === filterGrade) &&
      (filterBuilding === 'すべて' || g.building === filterBuilding)
    )
    .sort((a, b) => {
      if (sortBy === 'time-asc') return a.waiting_time - b.waiting_time;
      if (sortBy === 'time-desc') return b.waiting_time - a.waiting_time;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold text-gradient">発表団体一覧</h1>
        
        {/* Search & Main Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="団体名、企画内容で検索..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ryoun-sky/50 transition-all font-light"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 no-scrollbar">
            <select 
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm font-light text-white/70"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="class">名前順</option>
              <option value="time-asc">待ち時間 (短い順)</option>
              <option value="time-desc">待ち時間 (長い順)</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 p-4 glass-card">
          <div className="flex items-center space-x-2 text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
            <Filter size={12} />
            <span>フィルター</span>
          </div>
          <div className="flex flex-col space-y-3">
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
               <span className="text-[10px] text-white/30 shrink-0">部門:</span>
               {DEPARTMENTS.map(d => (
                 <button 
                  key={d} 
                  onClick={() => setFilterDept(d)}
                  className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap ${filterDept === d ? 'bg-ryoun-sky text-ryoun-dark font-bold' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                 >
                   {d}
                 </button>
               ))}
             </div>
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
               <span className="text-[10px] text-white/30 shrink-0">場所:</span>
               {BUILDINGS.map(b => (
                 <button 
                  key={b} 
                  onClick={() => setFilterBuilding(b)}
                  className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap ${filterBuilding === b ? 'bg-ryoun-sky text-ryoun-dark font-bold' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                 >
                   {b}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <RefreshCw className="animate-spin text-ryoun-sky mb-4" size={32} />
          <p className="text-white/40 text-sm">最新の情報を読み込み中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredGroups.map((group) => (
              <motion.div
                layout
                key={group.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`glass-card p-5 group flex flex-col h-full ${group.status === 'closed' ? 'opacity-60 saturate-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ryoun-sky/10 text-ryoun-sky font-bold mb-2 inline-block">
                      {group.department}
                    </span>
                    <h3 className="text-xl font-bold group-hover:text-ryoun-sky transition-colors line-clamp-1">{group.name}</h3>
                    <p className="text-xs text-white/40 mt-1">{group.grade} | {group.building} {group.room}</p>
                  </div>
                  <div className={`status-badge border ${getStatusColor(group.waiting_time, group.status)}`}>
                    {getStatusText(group.waiting_time, group.status)}
                  </div>
                </div>

                <p className="text-sm text-white/60 font-light flex-grow line-clamp-2 mb-6">
                  {group.description}
                </p>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex space-x-3">
                    {group.social_links?.instagram && (
                      <a href={group.social_links.instagram} target="_blank" rel="noreferrer" className="text-white/30 hover:text-pink-400 transition-colors">
                        <Instagram size={18} />
                      </a>
                    )}
                    {group.social_links?.twitter && (
                      <a href={group.social_links.twitter} target="_blank" rel="noreferrer" className="text-white/30 hover:text-sky-400 transition-colors">
                        <Twitter size={18} />
                      </a>
                    )}
                    {group.social_links?.website && (
                      <a href={group.social_links.website} target="_blank" rel="noreferrer" className="text-white/30 hover:text-ryoun-sky transition-colors">
                        <ExternalLink size={18} />
                      </a>
                    )}
                  </div>
                  <div className="text-[10px] text-white/20">
                    5分前に更新
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {filteredGroups.length === 0 && !loading && (
        <div className="text-center py-20 text-white/30">
          該当する団体が見つかりませんでした
        </div>
      )}
    </div>
  );
};

export default Groups;
