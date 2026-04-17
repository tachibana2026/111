'use client';

import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center text-center overflow-hidden px-4 mesh-gradient rounded-[3rem] md:mt-4 mx-2">
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

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8 max-w-lg mx-auto"
        >
          <div className="bg-white/60 backdrop-blur-md border border-brand-100/50 rounded-2xl p-4 shadow-xl shadow-brand-500/5 flex items-center space-x-3">
            <span className="bg-brand-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">お知らせ</span>
            <p className="text-[10px] md:text-xs font-bold text-slate-700 text-left leading-relaxed">
              たちばな祭2026は限定公開で行います。詳しくは
              <a 
                href="https://cms1.chiba-c.ed.jp/funako/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-4 decoration-2 mx-1"
              >
                本校ホームページ
              </a>
              でご確認ください。
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
