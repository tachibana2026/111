import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PackageSearch, Clock, MapPin, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LostFound = ({ initialItems }) => {
  const [items, setItems] = useState(initialItems);

  // Note: Client-side fetching and Realtime subscriptions are disabled 
  // to protect the free tier from heavy traffic.
  // Data is updated via On-demand ISR triggered by admin actions.
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-12">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-4 text-slate-900">
          <div className="w-2 h-10 bg-brand-600 rounded-full shadow-lg shadow-brand-500/20"></div>
          <h1 className="text-4xl font-black tracking-tight">落とし物情報</h1>
        </div>
        <p className="text-slate-500 text-base font-bold ml-1">本部で預かっている落とし物の一覧です。</p>
      </div>

      {/* Guide Section */}
      <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 space-y-6 shadow-sm overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-50 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-4">
          <div className="bg-brand-50 p-3 rounded-2xl text-brand-600 shadow-sm transition-transform group-hover:scale-110">
            <Info size={24} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">受け取り方法</h2>
        </div>
        <p className="text-slate-600 leading-relaxed font-bold text-base">
          心当たりのある方は、<span className="text-brand-600 font-black px-2 py-0.5 bg-brand-50 rounded-lg">文化委員会本部 (東館201)</span> までお越しください。本人確認のため、特徴などを詳しく伺う場合があります。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 group flex flex-col items-start gap-6 shadow-sm hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 transition-all duration-300"
              >
              <div className="flex justify-between items-start w-full gap-4">
                <div className="flex items-start gap-4">
                  <div>
                    <h3 className="font-black text-xl text-slate-900 leading-tight">{item.name}</h3>
                    <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400">
                      <Clock size={12} className="mr-1" />
                      拾得日時: {formatDate(item.found_at)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="p-4 md:p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-black block mb-2 uppercase tracking-widest">拾得場所</span>
                  <p className="text-slate-700 text-sm font-bold leading-relaxed">{item.location}</p>
                </div>

                <div className="p-4 md:p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-black block mb-2 uppercase tracking-widest">特徴・詳細</span>
                  <p className="text-slate-700 text-sm font-bold leading-relaxed">{item.features}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-32 space-y-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
            <PackageSearch className="text-slate-200 mx-auto" size={48} />
            <p className="text-slate-400 font-bold text-lg md:text-xl">現在、登録されている落とし物はありません</p>
          </div>
        )}
      </div>
    </div>
  );
};

export async function getStaticProps() {
  const { data, error } = await supabase
    .from('lost_found')
    .select('id, name, found_at, location, features')
    .order('found_at', { ascending: false });

  if (error) {
    console.error('getStaticProps fetch error:', error);
    return { props: { initialItems: [] }, revalidate: 60 };
  }

  return {
    props: {
      initialItems: data || [],
    },
    revalidate: 3600,
  };
}

export default LostFound;
