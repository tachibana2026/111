'use client';

import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, AlertCircle } from 'lucide-react';

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
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-4">注意事項</h2>
        <div className="space-y-3 w-full">
          <div className="space-y-2">
            <div className="flex items-start space-x-2 text-slate-500">
              <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
              <p className="text-xs font-bold text-slate-600">上履きを持参してください</p>
            </div>
            <div className="flex items-start space-x-2 text-slate-500">
              <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
              <p className="text-xs font-bold text-slate-600">公共交通機関を利用してください</p>
            </div>
            <div className="flex items-start space-x-2 text-slate-500">
              <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
              <p className="text-xs font-bold text-slate-600">ゴミの持ち帰りに協力ください</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold border-t border-slate-50 pt-3">
            ※近隣への迷惑駐車は禁止です
          </p>
        </div>
      </motion.div>
    </section>
  );
}
