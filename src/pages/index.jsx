import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle, Info, MessageSquare, ArrowRight, X, Vote } from 'lucide-react';
import Portal from '../components/Portal';

const Home = () => {
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);

  useEffect(() => {
    if (isVoteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVoteModalOpen]);


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
              詳細が決まりましたら
              <a
                href="https://cms1.chiba-c.ed.jp/funako/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-[8px] decoration-3 mx-2 active:scale-95 transition-all inline-block"
              >
                本校ホームページ
              </a>
              でお知らせします。
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

      {/* Voting Section */}
      <section className="px-2 max-w-7xl mx-auto">
        <motion.button
          onClick={() => setIsVoteModalOpen(true)}
          whileHover={{ y: -5, scale: 1.01 }}
          whileActive={{ scale: 0.98 }}
          className="w-full bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden group text-left transition-all"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -z-10 group-hover:bg-brand-100 transition-colors" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex flex-col items-start gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm shrink-0">
                  <Vote size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">たちばな大賞 投票フォーム</h2>
              </div>
              <p className="text-slate-500 font-bold max-w-xl">
                展示・発表を体験された方は、ぜひ投票をお願いします！
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 bg-brand-600 px-10 py-5 rounded-2xl text-white font-black group-hover:bg-brand-700 transition-all w-full md:w-auto">
              <span>投票する</span>
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
            </div>
          </div>
        </motion.button>
      </section>

      {/* Voting Modal */}
      <Portal>
        <AnimatePresence>
          {isVoteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsVoteModalOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl border border-slate-100 relative"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsVoteModalOpen(false)}
                  className="absolute top-6 right-6 md:top-8 md:right-8 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                >
                  <X size={24} />
                </button>

                <div className="space-y-10">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">どちらですか？</h2>
                    <p className="text-slate-400 font-bold">対象のボタンを選択してください。</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                    {/* Visitors */}
                    <motion.a
                      href="https://forms.gle/ZCapvAkzZsywhDMU8"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ y: -5 }}
                      whileActive={{ scale: 0.98 }}
                      className="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:bg-white hover:shadow-xl hover:shadow-brand-900/5 transition-all flex flex-col justify-between gap-6"
                    >
                      <div className="space-y-3">
                        <h3 className="text-xl font-black text-slate-900">一般来場者</h3>
                        <p className="text-xs text-slate-400 font-bold leading-relaxed">
                          校外からお越しいただいた方はこちらから投票をお願いします。
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-slate-900 font-black text-sm pt-4 border-t border-slate-100 group-hover:text-brand-600 transition-colors">
                        <span>フォームを開く</span>
                        <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.a>

                    {/* Students & Teachers */}
                    <motion.a
                      href="https://forms.gle/9pecbGrrvZjvEgg18"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ y: -5 }}
                      whileActive={{ scale: 0.98 }}
                      className="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:bg-white hover:shadow-xl hover:shadow-brand-900/5 transition-all flex flex-col justify-between gap-6"
                    >
                      <div className="space-y-3">
                        <h3 className="text-xl font-black text-slate-900">生徒・教職員</h3>
                        <p className="text-xs text-slate-400 font-bold leading-relaxed">
                          回答には船橋高校Googleアカウントでログインが必要です。
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-slate-900 font-black text-sm pt-4 border-t border-slate-100 group-hover:text-brand-600 transition-colors">
                        <span>フォームを開く</span>
                        <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Feedback Section */}
      <section className="px-2 max-w-7xl mx-auto pb-12">
        <motion.a
          href="https://forms.gle/KQ7icJ7HWBaHyUdFA"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ y: -5, scale: 1.01 }}
          whileActive={{ scale: 0.98 }}
          className="block w-full bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-xl relative overflow-hidden group transition-all"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px] -z-10 group-hover:bg-brand-500/30 transition-colors" />

          <div className="flex flex-col items-start text-left gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shadow-sm shrink-0">
                <MessageSquare size={24} />
              </div>
              <h2 className="text-2xl font-black text-white">フィードバック</h2>
            </div>

            <p className="text-slate-400 font-bold max-w-xl">不具合の報告･ご意見等はこちらからお願いします。</p>

            <div className="flex items-center justify-center gap-4 bg-white/10 px-10 py-5 rounded-2xl text-white font-black group-hover:bg-white/20 transition-all w-full">
              <span>フォームを開く</span>
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
            </div>
          </div>
        </motion.a>
      </section>
    </div>
  );
};

export default Home;
