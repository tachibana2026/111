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
    <div className="space-y-6 pb-24">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gradient">校内マップ</h1>
        <p className="text-white/40 text-sm">各建物の配置と教室をご確認いただけます</p>
      </div>

      {/* Building Tabs */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
        {BUILDINGS.map(b => (
          <button
            key={b.id}
            onClick={() => {
              setActiveBuilding(b.id);
              setActiveFloor(b.floors[0]);
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
              activeBuilding === b.id ? 'bg-ryoun-sky text-ryoun-dark font-bold shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            <b.icon size={18} />
            <span className="text-sm">{b.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floor Selection */}
        <div className={`lg:col-span-1 space-y-2 flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0 ${building.floors.length <= 1 ? 'hidden lg:invisible' : ''}`}>
          {building.floors.map(floor => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`px-6 py-4 lg:w-full rounded-2xl flex items-center justify-between border transition-all shrink-0 mr-2 lg:mr-0 ${
                activeFloor === floor 
                ? 'bg-ryoun-sky/10 border-ryoun-sky text-ryoun-sky' 
                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
              }`}
            >
              <span className="font-bold">{floor}</span>
              <MapIcon size={16} className={activeFloor === floor ? 'opacity-100' : 'opacity-0'} />
            </button>
          ))}
        </div>

        {/* Map Display Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeBuilding}-${activeFloor}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="glass-card aspect-[4/3] flex flex-col items-center justify-center relative overflow-hidden group"
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              </div>

              <div className="z-10 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 mx-auto border border-white/10 group-hover:scale-110 group-hover:bg-ryoun-sky/10 group-hover:border-ryoun-sky/30 transition-all duration-500">
                  <MapIcon size={40} className="text-white/20 group-hover:text-ryoun-sky transition-colors" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-widest">{building.name} {activeFloor}</h3>
                  <p className="text-white/30 text-sm mt-2 font-light">マップ画像準備中</p>
                </div>
                <div className="pt-4">
                   <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">Placeholder only</p>
                </div>
              </div>
              
              {/* Fake rooms overlay */}
              <div className="absolute top-10 left-10 w-32 h-20 border border-white/5 bg-white/5 rounded animate-pulse"></div>
              <div className="absolute top-40 right-10 w-24 h-40 border border-white/5 bg-white/5 rounded animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-10 left-20 w-40 h-16 border border-white/5 bg-white/5 rounded animate-pulse" style={{ animationDelay: '2s' }}></div>
            </motion.div>
          </AnimatePresence>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
               <div className="w-3 h-3 rounded bg-ryoun-sky"></div>
               <span className="text-xs text-white/60">受付/本部</span>
            </div>
            <div className="flex items-center space-x-2">
               <div className="w-3 h-3 rounded bg-green-500/50"></div>
               <span className="text-xs text-white/60">トイレ</span>
            </div>
            <div className="flex items-center space-x-2">
               <div className="w-3 h-3 rounded bg-yellow-500/50"></div>
               <span className="text-xs text-white/60">休憩所</span>
            </div>
            <div className="flex items-center space-x-2">
               <div className="w-3 h-3 rounded bg-red-500/50"></div>
               <span className="text-xs text-white/60">救護室</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
