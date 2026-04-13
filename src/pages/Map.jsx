import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map as MapIcon, GraduationCap, Building2, Dumbbell } from 'lucide-react';

const BUILDINGS = [
  { id: 'temp', name: '仮校舎', icon: Building2, floors: ['1F', '2F'] },
  { id: 'gym', name: '体育館', icon: Dumbbell, floors: ['1F'] },
  { id: 'south', name: '南館', icon: GraduationCap, floors: ['1F', '2F', '3F', '4F'] },
];

const Map = () => {
  const [activeBuilding, setActiveBuilding] = useState('temp');
  const [activeFloor, setActiveFloor] = useState('1F');

  const building = BUILDINGS.find(b => b.id === activeBuilding);

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-3 text-slate-900">
          <div className="w-1.5 h-8 bg-brand-600 rounded-full"></div>
          <h1 className="text-3xl font-black tracking-tight">校内マップ</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium">各校舎の配置と教室の場所を確認できます。</p>
      </div>

      {/* Building Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
        {BUILDINGS.map(b => (
          <button
            key={b.id}
            onClick={() => {
              setActiveBuilding(b.id);
              setActiveFloor(b.floors[0]);
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl transition-all ${
              activeBuilding === b.id ? 'bg-white text-brand-700 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 font-bold'
            }`}
          >
            <b.icon size={18} strokeWidth={activeBuilding === b.id ? 2.5 : 2} />
            <span className="text-sm">{b.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floor Selection */}
        <div className={`lg:col-span-1 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0 ${building.floors.length <= 1 ? 'hidden lg:invisible' : ''}`}>
          {building.floors.map(floor => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`px-6 py-4 lg:w-full rounded-xl flex items-center justify-between border transition-all shrink-0 ${
                activeFloor === floor 
                ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-brand-100 hover:text-brand-600 font-bold'
              }`}
            >
              <span className="font-black text-xl">{floor}</span>
              <MapIcon size={16} className={`${activeFloor === floor ? 'text-brand-600' : 'text-slate-200'}`} />
            </button>
          ))}
        </div>

        {/* Map Display Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeBuilding}-${activeFloor}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-100 rounded-3xl aspect-[4/3] flex flex-col items-center justify-center relative overflow-hidden shadow-sm"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-4 mx-auto border border-brand-100">
                  <MapIcon size={40} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {building.name} <span className="text-brand-600">{activeFloor}</span>
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-4 font-black tracking-widest uppercase bg-slate-50 px-3 py-1 rounded-full inline-block">マップ読み込み中...</p>
                </div>
              </div>
              
              {/* Background dots pattern */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0084FF 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            </motion.div>
          </AnimatePresence>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2.5">
               <div className="w-3.5 h-3.5 rounded-full bg-brand-500"></div>
               <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">本部・受付</span>
            </div>
            <div className="flex items-center space-x-2.5">
               <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">お手洗い</span>
            </div>
            <div className="flex items-center space-x-2.5">
               <div className="w-3.5 h-3.5 rounded-full bg-amber-500"></div>
               <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">休憩所</span>
            </div>
            <div className="flex items-center space-x-2.5">
               <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
               <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">救護室</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
