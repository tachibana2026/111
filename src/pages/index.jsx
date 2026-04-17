import { motion } from 'framer-motion';
import { Calendar, Bell, AlertTriangle, Info, Instagram } from 'lucide-react';

const Home = () => {


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
      <section className="space-y-8 px-2 max-w-7xl mx-auto">
        {/* お知らせ（限定公開案内） - 横長配置 */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden flex flex-col items-start gap-6"
        >
          <div className="absolute -top-10 -right-10 w-60 h-60 bg-amber-200/20 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-6 shrink-0 w-full">
            <div className="w-16 h-16 rounded-2xl bg-amber-200 flex items-center justify-center text-amber-700 shadow-sm shrink-0">
              <Info size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 whitespace-nowrap">お知らせ</h2>
          </div>

          <div className="w-full">
            <p className="text-base md:text-xl font-bold text-amber-950 leading-relaxed">
              たちばな祭2026は限定公開で行います。<br />
              詳しくは
              <a 
                href="https://cms1.chiba-c.ed.jp/funako/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-[8px] decoration-3 mx-2 active:scale-95 transition-all inline-block"
              >
                本校ホームページ
              </a>
              でご確認ください。
            </p>
          </div>
        </motion.div>

        {/* 下部 2カラムグリッド */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 開催日時 */}
          <motion.div
            whileHover={{ y: -8 }}
            className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col items-start text-left"
          >
            <div className="flex items-center gap-6 mb-8 w-full">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm shrink-0">
                <Calendar size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">開催日時</h2>
            </div>
            <div className="space-y-6 w-full grow flex flex-col justify-center">
              <div className="space-y-3">
                <p className="text-[11px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">6月13日(土)</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50">
                    <span className="text-sm font-bold text-slate-500">Part 1</span>
                    <span className="text-base font-black text-slate-900">9:15 - 12:15</span>
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
                  <span className="text-base font-black text-slate-900">9:00 - 12:15</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 注意事項 */}
          <motion.div
            whileHover={{ y: -8 }}
            className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col items-start text-left"
          >
            <div className="flex items-center gap-6 mb-8 w-full">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm shrink-0">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">注意事項</h2>
            </div>
            <div className="space-y-4 w-full">
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50 space-y-4">
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold">上履き（またはスリッパ）と靴袋をご持参ください。</p>
                </div>
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold">駐車場はございません。公共交通機関をご利用ください。</p>
                </div>
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold">ゴミ箱はございません。各自でお持ち帰りください。</p>
                </div>
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold">校内および敷地内はすべて禁煙です。</p>
                </div>
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold">入場開始の<span className="text-brand-600 font-black mx-1">15分前</span>から開場します。それより前の来場はお控えください。</p>
                </div>
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold">開催時間終了の<span className="text-brand-600 font-black mx-1">30分前</span>に入場を締め切らせていただきます。</p>
                </div>
                <div className="flex items-start space-x-3 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <p className="text-sm font-bold leading-relaxed">
                    お支払いには<span className="text-brand-600 font-black mx-1">現金、クレジットカード、交通系ICカード</span>がご利用いただけます。
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Section */}
      <section className="px-2 max-w-7xl mx-auto">
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <Instagram size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">公式Instagram</h2>
              <p className="text-slate-500 font-bold text-sm">文化委員会が最新情報を発信中！</p>
            </div>
          </div>

          <a 
            href="https://www.instagram.com/kf.bunkaiin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 bg-white rounded-2xl font-black text-slate-900 shadow-sm border border-purple-100 hover:shadow-md hover:scale-105 active:scale-95 transition-all group"
          >
            <span>@kf.bunkaiin をフォロー</span>
            <span className="text-purple-500 group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </motion.div>
      </section>

    </div>
  );
};

export default Home;

