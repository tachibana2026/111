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
    <div className="space-y-12 pb-24">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="z-10"
        >
          <div className="mb-6 inline-block px-4 py-1 rounded-full border border-ryoun-sky/30 bg-ryoun-sky/5 backdrop-blur-md">
            <span className="text-[10px] md:text-xs font-bold text-ryoun-sky tracking-[0.3em] uppercase">Tachibana Festival 2026</span>
          </div>
          <h1 className="text-8xl md:text-[14rem] font-black tracking-[-0.05em] leading-[0.8] text-gradient select-none">
            凌雲
          </h1>
          <p className="mt-8 text-lg md:text-3xl text-white font-extralight tracking-[0.4em] uppercase opacity-80">
            Soaring Above the Clouds
          </p>
          <p className="mt-4 text-white/40 text-sm md:text-base tracking-[0.3em] font-light">
            千葉県立船橋高等学校 たちばな祭
          </p>
        </motion.div>
        
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.8, duration: 1 }}
           className="mt-16 z-10 flex flex-col items-center space-y-4"
        >
          <Link to="/groups" className="btn-primary flex items-center space-x-3 px-10 py-5 text-lg group shadow-2xl shadow-ryoun-sky/20">
            <span className="font-bold">団体一覧を見る</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-[11px] text-white/20 font-medium tracking-widest">入場無料 / 予約不要 (一部団体を除く)</p>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12)_0%,transparent_60%)]"></div>
          <div className="absolute top-1/4 left-1/2 w-[500px] h-[500px] bg-ryoun-sky/5 rounded-full blur-[120px] -translate-x-1/2"></div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-10 flex flex-col justify-between group relative overflow-hidden transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-ryoun-sky/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-ryoun-sky/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-ryoun-sky/20 flex items-center justify-center text-ryoun-sky mb-8 group-hover:scale-110 group-hover:bg-ryoun-sky group-hover:text-ryoun-dark transition-all duration-300">
              <Calendar size={28} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter italic">CHRONICLE</h2>
            <p className="text-white/60 leading-relaxed font-light text-lg">
              2026年6月13日(土) <span className="text-white font-medium ml-2">9:00 - 15:30</span><br />
              2026年6月14日(日) <span className="text-white font-medium ml-2">9:00 - 15:00</span>
            </p>
          </div>
          <div className="mt-10 flex items-center text-ryoun-sky text-sm font-bold tracking-widest uppercase">
            <span>Add to Calendar</span>
            <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-10 flex flex-col justify-between group relative overflow-hidden transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-ryoun-sky/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-ryoun-sky/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-ryoun-sky/20 flex items-center justify-center text-ryoun-sky mb-8 group-hover:scale-110 group-hover:bg-ryoun-sky group-hover:text-ryoun-dark transition-all duration-300">
              <MapPin size={28} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter italic">LOCATION</h2>
            <div className="text-white/60 leading-relaxed font-light">
              <p className="text-lg">〒273-0002 千葉県船橋市東船橋 6-1-1</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs tracking-widest font-medium opacity-50">
                <div>JR 東船橋駅 徒歩7分</div>
                <div>京成 船橋競馬場駅 徒歩12分</div>
              </div>
            </div>
          </div>
          <Link to="/map" className="mt-10 flex items-center text-ryoun-sky text-sm font-bold tracking-widest uppercase">
            <span>Access Map</span>
            <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* News Section */}
      <section className="glass-card overflow-hidden mx-2 border-t-2 border-ryoun-sky/20">
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <Megaphone size={20} className="text-ryoun-sky" />
            <h2 className="text-2xl font-black italic tracking-tighter">ANNOUNCEMENTS</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-ryoun-sky/10 text-[10px] font-bold text-ryoun-sky tracking-widest">
            NEW RELEASES
          </span>
        </div>
        <div className="divide-y divide-white/5">
          <AnimatePresence>
            {announcements.length > 0 ? (
              announcements.map((news) => (
                <motion.div 
                  key={news.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`group transition-all ${expandedId === news.id ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
                >
                  <div 
                    onClick={() => setExpandedId(expandedId === news.id ? null : news.id)}
                    className="p-8 cursor-pointer relative"
                  >
                    {news.is_pinned && (
                       <div className="absolute top-0 left-0 w-1 h-full bg-ryoun-sky shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
                    )}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center space-x-3">
                          {news.is_pinned && (
                            <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-ryoun-sky text-ryoun-dark text-[9px] font-black uppercase tracking-tighter">
                              <Clock size={10} className="mr-0.5" />
                              Important
                            </span>
                          )}
                          <span className="text-[10px] text-white/30 font-bold tracking-widest font-mono">
                            {news.date.replace(/-/g, '.')}
                          </span>
                        </div>
                        <h3 className={`text-lg transition-all duration-300 font-bold ${expandedId === news.id ? 'text-ryoun-sky' : 'text-white/80 group-hover:text-white'}`}>
                          {news.title}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-4 shrink-0">
                         {expandedId === news.id ? <ChevronUp size={20} className="text-ryoun-sky" /> : <ChevronDown size={20} className="text-white/10" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === news.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 pb-2 text-white/60 leading-relaxed text-sm font-light whitespace-pre-wrap">
                            {renderWithLinks(news.content)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center text-white/20 font-light italic">
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

