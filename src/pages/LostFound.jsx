import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PackageSearch, Clock, MapPin, Info, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LostFound = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();

    const subscription = supabase
      .channel('lost_found_changes')
      .on('postgres_changes', { event: '*', table: 'lost_found' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('lost_found').select('*').order('found_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
      // Dummy data
      setItems([
        { id: 1, name: '青い折りたたみ傘', location: '南館2F 廊下', features: 'ドット柄、持ち手にストラップあり', found_at: '2026-06-14T10:30:00Z' },
        { id: 2, name: '黒いペンケース', location: '体育館 アリーナ', features: '中身にシャープペンシル3本', found_at: '2026-06-14T11:45:00Z' },
        { id: 3, name: '学生証', location: '仮校舎 A1教室', features: '2年生、カードケース入り', found_at: '2026-06-14T13:20:00Z' },
        { id: 4, name: 'ハンドタオル', location: '南館1F トイレ前', features: '白地に花の刺繍', found_at: '2026-06-14T14:10:00Z' },
      ]);
    } else {
      setItems(data);
    }
    setLoading(false);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gradient">落とし物情報</h1>
        <p className="text-white/40 text-sm">校内で拾得された物品の一覧です。心当たりのある方は本部までお越しください。</p>
      </div>

      {/* Guide Section */}
      <div className="glass-card p-6 border-l-4 border-l-ryoun-sky bg-ryoun-sky/5 flex items-start space-x-4">
        <div className="bg-ryoun-sky/20 p-2 rounded-lg text-ryoun-sky shrink-0">
          <Info size={20} />
        </div>
        <div className="space-y-2">
          <h2 className="font-bold text-ryoun-light">受け取り方法</h2>
          <p className="text-sm text-white/60 leading-relaxed font-light">
            落とし物の受け取りは、<span className="text-white font-medium">南館1F 会議室前「落とし物本部」</span>にて承っております。<br />
            本人確認のため、特徴の詳細などを伺う場合がございます。
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse text-white/30">
          <RefreshCw className="animate-spin mb-4" size={32} />
          <p className="text-sm">情報を更新中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 group flex items-start space-x-4 hover:bg-white/15 transition-all"
              >
                <div className="bg-white/5 p-3 rounded-2xl text-white/30 group-hover:text-ryoun-sky transition-colors">
                  <PackageSearch size={24} />
                </div>
                <div className="flex-grow space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <div className="text-right">
                      {item.updated_at && (
                        <div className="flex items-center justify-end text-[10px] text-white/30 whitespace-nowrap bg-white/5 px-2 py-1 rounded-full border border-white/5">
                          <RefreshCw size={10} className="mr-1 opacity-50" />
                          更新: {formatDate(item.updated_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center text-xs text-white/60">
                      <MapPin size={12} className="mr-1.5 text-ryoun-sky" />
                      <span className="font-medium">場所: {item.location}</span>
                    </div>
                    <div className="flex items-center text-[10px] text-ryoun-sky/70 ml-1 border-l border-ryoun-sky/20 pl-2">
                      <Clock size={10} className="mr-1.5" />
                      <span>拾得: {formatDate(item.found_at)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-white/50 font-light bg-white/5 p-2.5 rounded-xl border border-white/5 italic">
                    <span className="text-[10px] text-white/20 block mb-1 uppercase tracking-tighter not-italic">Features</span>
                    {item.features}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {items.length === 0 && (
            <div className="md:col-span-2 text-center py-20 text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
              現在、登録されている落とし物はありません
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LostFound;
