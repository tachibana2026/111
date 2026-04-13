import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Clock, ArrowRight, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      <section className="relative min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center text-center overflow-hidden px-4 mesh-gradient rounded-super md:mt-4 mx-2">
        {/* Floating Background Blobs */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, 50, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 left-10 w-64 h-64 bg-brand-100/30 rounded-full blur-3xl -z-10"
        />
        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, -30, 0],
            rotate: [0, -15, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-10 right-10 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl -z-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="z-10 max-w-4xl py-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8 space-y-3"
          >
            <p className="text-sm md:text-xl font-black text-slate-800 tracking-tight">
              千葉県立船橋高等学校 たちばな祭
            </p>
          </motion.div>

          <h1 className="text-7xl md:text-9xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8 text-glow">
            凌雲<span className="text-gradient block md:inline md:ml-4">2026</span>
          </h1>

          <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl mx-auto space-y-6">
            <p className="text-xs md:text-base text-slate-500 font-medium leading-relaxed">
              凌雲とは雲よりも高いところへ突き抜けるという意味。<br className="hidden md:block" />
              仮校舎での開催で、様々な制限がある中、仲間と共に試行錯誤して可能性を広げることで、<br className="hidden md:block" />
              自分たちの理想のたちばな祭を作っていきたいという願いを込めました。
            </p>
          </div>
        </motion.div>
      </section>

      {/* Info Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col items-start text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-6">
            <Calendar size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-4">開催日時</h2>
          <div className="space-y-4 w-full">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest ml-1">6月13日(土)</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100/50">
                  <span className="text-sm font-bold text-slate-600">Part 1</span>
                  <span className="text-sm font-black text-brand-600">9:15 - 11:55</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100/50">
                  <span className="text-sm font-bold text-slate-600">Part 2</span>
                  <span className="text-sm font-black text-brand-600">13:00 - 15:40</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest ml-1">6月14日(日)</p>
              <div className="flex justify-between items-center bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100/50">
                <span className="text-sm font-bold text-slate-600">Part 3</span>
                <span className="text-sm font-black text-brand-600">9:00 - 11:55</span>
              </div>
            </div>
          </div>
          <button className="mt-8 text-sm font-bold text-brand-600 flex items-center hover:underline">
            カレンダーに追加 <ArrowRight size={14} className="ml-1" />
          </button>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col items-start text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-6">
            <MapPin size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">アクセス</h2>
          <p className="text-slate-600 font-bold mb-4">千葉県立船橋高等学校</p>
          <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-400">
            <p>JR 東船橋駅 徒歩7分</p>
            <p>京成 船橋競馬場駅 徒歩12分</p>
          </div>
          <Link to="/map" className="mt-8 text-sm font-bold text-brand-600 flex items-center hover:underline">
            アクセス詳細 <ArrowRight size={14} className="ml-1" />
          </Link>
        </motion.div>
      </section>

      {/* Announcements Section */}
      <section className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm mx-2">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Megaphone size={18} className="text-brand-600" />
            <h2 className="text-lg font-black text-slate-900">お知らせ</h2>
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

