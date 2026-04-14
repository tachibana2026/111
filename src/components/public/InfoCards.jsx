'use client';

import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function InfoCards() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col items-start text-left"
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
      </motion.div>

      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col items-start text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-6">
          <MapPin size={24} />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">アクセス</h2>
        <p className="text-slate-600 font-bold mb-4">千葉県立船橋高等学校</p>
        <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-400">
          <p>JR 東船橋駅 徒歩約10分</p>
          <p>京成 船橋競馬場駅 徒歩約15分</p>
        </div>
      </motion.div>
    </section>
  );
}
