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
      .on('postgres_changes', { event: '*', table: 'lost_found' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(current => [payload.new, ...current]);
        } else if (payload.eventType === 'UPDATE') {
          setItems(current => current.map(item => item.id === payload.new.id ? payload.new : item));
        } else if (payload.eventType === 'DELETE') {
          setItems(current => current.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('lost_found').select('*').order('found_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
    }

    if (data) {
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
    <div className="space-y-10 pb-12">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-3 text-slate-900">
          <div className="w-1.5 h-8 bg-brand-600 rounded-full"></div>
          <h1 className="text-3xl font-black tracking-tight">落とし物情報</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium">本部で預かっている落とし物の一覧です。</p>
      </div>

      {/* Guide Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
        <div className="bg-brand-50 p-4 rounded-2xl text-brand-600 shadow-sm">
          <Info size={30} strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">受け取り方法</h2>
          <p className="text-slate-600 leading-relaxed font-bold">
            心当たりのある方は、<span className="text-brand-600 font-black px-2 py-0.5 bg-brand-50 rounded-lg">仮校舎2F「文化委員会本部」</span>までお越しください。本人確認のため、特徴などを詳しく伺う場合があります。
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="animate-spin text-brand-600" size={40} />
          <p className="text-slate-400 font-bold tracking-widest text-sm uppercase">データを読み込み中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {items.map((item, idx) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 group flex flex-col items-start gap-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start w-full gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <PackageSearch size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-900 leading-tight">{item.name}</h3>
                      <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400">
                        <Clock size={12} className="mr-1" />
                        拾得日時: {formatDate(item.found_at)}
                      </div>
                    </div>
                  </div>
                  {item.updated_at && (
                    <div className="text-[10px] font-bold text-slate-300 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md">
                      新着
                    </div>
                  )}
                </div>

                <div className="w-full space-y-4">
                  <div className="flex items-center text-sm text-slate-600 font-bold bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-100">
                    <MapPin size={16} className="mr-2 text-brand-600" />
                    <span>場所: {item.location}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-black block mb-2 uppercase tracking-widest">特徴・詳細</span>
                    <p className="text-slate-700 text-sm font-bold leading-relaxed">{item.features}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <div className="md:col-span-2 text-center py-32 space-y-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
              <PackageSearch className="text-slate-200 mx-auto" size={48} />
              <p className="text-slate-400 font-bold text-lg md:text-xl">現在、登録されている落とし物はありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LostFound;
