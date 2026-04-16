import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Clock, ArrowRight, Megaphone, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const Home = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('date', { ascending: false })
        .limit(10);
      if (data) setAnnouncements(data);
    };

    fetchAnnouncements();

    const sub = supabase
      .channel('public_announcements')
      .on('postgres_changes', { event: '*', table: 'announcements' }, fetchAnnouncements)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const renderWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-ryoun-sky hover:underline break-all font-medium">
          {part}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <section className="relative min-h-[65vh] md:min-h-[75vh] flex flex-col items-center justify-center text-center overflow-hidden px-4 mesh-gradient rounded-[3rem] md:mt-4 mx-2">
        {/* Floating Background Blobs */}
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 80, 0],
            rotate: [0, 20, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-80 h-80 bg-brand-200/20 rounded-full blur-[100px] -z-10"
        />
        <motion.div
          animate={{
            x: [0, -60, 0],
            y: [0, -40, 0],
            rotate: [0, -20, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-brand-300/10 rounded-full blur-[120px] -z-10"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="z-10 max-w-5xl py-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-10 space-y-4"
          >
            <p className="text-xs md:text-sm font-black text-brand-600 tracking-[0.3em] uppercase">
              Chiba Prefectural Funabashi High School
            </p>
            <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              千葉県立船橋高等学校 たちばな祭
            </p>
          </motion.div>

          <h1 className="text-8xl md:text-[12rem] font-black text-slate-900 tracking-tighter leading-[0.8] mb-12 text-glow">
            凌雲<span className="text-gradient block md:inline md:ml-6">2026</span>
          </h1>

          <div className="glass-effect rounded-[2.5rem] p-8 md:p-12 max-w-2xl mx-auto space-y-6">
            <p className="text-sm md:text-lg text-slate-600 font-bold leading-relaxed tracking-tight">
              凌雲とは雲よりも高いところへ突き抜けるという意味。<br className="hidden md:block" />
              仮校舎での開催で、様々な制限がある中、仲間と共に試行錯誤して可能性を広げることで、<br className="hidden md:block" />
              自分たちの理想のたちばな祭を作っていきたいという願いを込めました。
            </p>
          </div>
        </motion.div>
      </section>

      {/* Info Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        <motion.div
          whileHover={{ y: -8 }}
          className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col items-start text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-8 shadow-sm">
            <Calendar size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-6">開催日時</h2>
          <div className="space-y-6 w-full">
            <div className="space-y-3">
              <p className="text-[11px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">6月13日(土)</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50">
                  <span className="text-sm font-bold text-slate-500">Part 1</span>
                  <span className="text-base font-black text-slate-900">9:15 - 12:00</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50">
                  <span className="text-sm font-bold text-slate-500">Part 2</span>
                  <span className="text-base font-black text-slate-900">13:00 - 16:00</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">6月14日(日)</p>
              <div className="flex justify-between items-center bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50">
                <span className="text-sm font-bold text-slate-500">Part 3</span>
                <span className="text-base font-black text-slate-900">9:00 - 12:00</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -8 }}
          className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col items-start text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-8 shadow-sm">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-6">注意事項</h2>
          <div className="space-y-4 w-full">
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50 space-y-4">
              <div className="flex items-start space-x-3 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <p className="text-sm font-bold">上履き（またはスリッパ）と靴袋をご持参ください。</p>
              </div>
              <div className="flex items-start space-x-3 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <p className="text-sm font-bold">駐車場はございません。公共交通機関をご利用ください。</p>
              </div>
              <div className="flex items-start space-x-3 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <p className="text-sm font-bold">ゴミ箱はございません。各自でお持ち帰りください。</p>
              </div>
              <div className="flex items-start space-x-3 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <p className="text-sm font-bold">校内および敷地内はすべて禁煙です。</p>
              </div>
              <div className="flex items-start space-x-3 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <p className="text-sm font-bold">入場開始の15分前から開場します。それより前の来場はお控えください。</p>
              </div>
              <div className="flex items-start space-x-3 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <p className="text-sm font-bold">開催時間終了の30分前に入場を締め切らせていただきます。</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Announcements Section */}
      <section className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm mx-2">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-brand-600 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">お知らせ</h2>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          <AnimatePresence>
            {announcements.length > 0 ? (
              announcements.map((news) => (
                <div key={news.id} className="relative">
                  <div
                    onClick={() => setExpandedId(expandedId === news.id ? null : news.id)}
                    className={`px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors ${expandedId === news.id ? 'bg-slate-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {news.is_pinned && (
                            <span className="px-1.5 py-0.5 rounded bg-brand-600 text-white text-[9px] font-black uppercase tracking-tighter">
                              重要
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {news.date.replace(/-/g, '.')}
                          </span>
                        </div>
                        <h3 className={`text-base font-bold truncate ${expandedId === news.id ? 'text-brand-700' : 'text-slate-800'}`}>
                          {news.title}
                        </h3>
                      </div>
                      <div className="shrink-0 text-slate-300">
                        {expandedId === news.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === news.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                            {renderWithLinks(news.content)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-300 font-bold italic">
                現在、新しいお知らせはありません。
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

export default Home;

