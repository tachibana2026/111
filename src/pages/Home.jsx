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
      <section className="relative py-12 md:py-24 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="z-10 px-4"
        >
          <div className="mb-4 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="text-[10px] md:text-xs font-bold text-brand-700 tracking-wider uppercase">凌雲たちばな祭 2026</span>
          </div>
          <h1 className="text-6xl md:text-9xl font-black text-slate-900 tracking-tight leading-tight">
            凌雲<span className="text-brand-600 block md:inline md:ml-2">2026</span>
          </h1>
          <p className="mt-6 text-base md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            千葉県立船橋高等学校 第59回たちばな祭<br className="hidden md:block" />
            <span className="text-slate-400 font-normal">新たな高みへ</span>
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/groups" className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 text-base">
              <span>団体一覧を見る</span>
              <ArrowRight size={18} />
            </Link>
            <div className="px-6 py-4 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-bold">
              入場無料 / 予約不要
            </div>
          </div>
        </motion.div>

        {/* Subtle decorative circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-50/50 rounded-full blur-[100px] -z-10"></div>
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
          <h2 className="text-xl font-black text-slate-900 mb-2">開催日時</h2>
          <div className="space-y-1">
            <p className="text-slate-600 font-bold">
              6月13日(土) <span className="text-brand-600">9:00 - 15:30</span>
            </p>
            <p className="text-slate-600 font-bold">
              6月14日(日) <span className="text-brand-600">9:00 - 15:00</span>
            </p>
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

