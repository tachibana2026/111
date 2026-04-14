import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, PackageSearch, Settings, ShieldCheck,
  Lock, Unlock, Plus, Trash2, RefreshCw, MapPin,
  AlertCircle, LogOut, CheckCircle2, Clock, Edit2, XCircle,
  User, ChevronLeft, Megaphone,
  ChevronUp, ChevronDown, Filter, SortDesc, Search, Calendar, Utensils
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['体験', '食品', '公演', '展示', '冊子', '物販'];

const HQDashboard = () => {
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedDept, setSelectedDept] = useState('体験');
  const [groups, setGroups] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null, confirmText: '実行' });
  const [announcements, setAnnouncements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  const requireConfirm = (message, onConfirm, confirmText = '実行する') => {
    setConfirmDialog({ isOpen: true, message, onConfirm, confirmText });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ryoun_auth_type');
    localStorage.removeItem('ryoun_group_id');
    localStorage.removeItem('ryoun_password');
    localStorage.removeItem('ryoun_login_at');
    router.push('/admin');
  };

  useEffect(() => {
    const authType = localStorage.getItem('ryoun_auth_type');
    if (authType !== 'hq') { router.push('/admin'); return; }
    fetchData();
    fetchAnnouncements();

    const channels = [
      supabase.channel('hq_realtime')
        .on('postgres_changes', { event: '*', table: 'groups' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'group_activities' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'performances' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'announcements' }, fetchAnnouncements)
        .on('postgres_changes', { event: '*', table: 'lost_found' }, fetchData).subscribe()
    ];
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: gData } = await supabase.from('groups').select('*, group_activities(*), performances(*)').order('login_id', { ascending: true });
    const { data: lData } = await supabase.from('lost_found').select('*').order('found_at', { ascending: false });
    if (gData) setGroups(gData);
    if (lData) setLostFound(lData);
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('sort_order', { ascending: true });
    if (data) setAnnouncements(data);
  };

  const handleToggleActivityStatus = async (activity, nextStatus) => {
    await supabase.from('group_activities').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', activity.id);
  };

  const handleUpdateWaitingTime = async (activityId, time) => {
    await supabase.from('group_activities').update({ waiting_time: time, updated_at: new Date().toISOString() }).eq('id', activityId);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* HQ Header */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 md:p-12 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center space-x-8">
          <div className="w-24 h-24 bg-brand-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-500/30">
            <ShieldCheck size={48} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">本部管理システム</h1>
            <p className="text-base font-bold text-slate-400 mt-2 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              セキュア・リアルタイム・コントロール
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogout}
            className="px-10 py-5 bg-slate-50 text-slate-500 rounded-3xl text-base font-black transition-all hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 flex items-center justify-center gap-4 shadow-sm"
          >
            <LogOut size={22} strokeWidth={2.5} />
            ログアウト
          </button>
        </div>
      </div>

      {/* Tabs / Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex p-2 bg-slate-100 rounded-[2rem] border border-slate-200/50 shadow-inner">
          {[
            { id: 'groups', label: '団体管理', icon: <Users size={18} /> },
            { id: 'lost_found', label: '落とし物', icon: <PackageSearch size={18} /> },
            { id: 'announcements', label: 'お知らせ', icon: <Megaphone size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-10 py-4 rounded-[1.5rem] text-sm font-black transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-white text-brand-700 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'groups' && (
        <div className="space-y-10">
          {/* Stats Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: '総団体数', value: groups.length, icon: <User size={28} />, color: 'text-brand-600 bg-brand-50' },
              { label: '食品団体', value: groups.filter(g => g.group_activities.some(a => a.department === '食品')).length, icon: <Utensils size={28} />, color: 'text-amber-600 bg-amber-50' },
              { label: '公演団体', value: groups.filter(g => g.group_activities.some(a => a.department === '公演')).length, icon: <Clock size={28} />, color: 'text-sky-600 bg-sky-50' }
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm flex items-center gap-8">
                <div className={`w-20 h-20 ${stat.color} rounded-[2rem] flex items-center justify-center shadow-inner`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                  <p className="text-5xl font-black text-slate-900 mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-[3.5rem] shadow-sm overflow-hidden">
            <div className="p-10 border-b border-slate-50 bg-white/50 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="flex flex-col space-y-8">
                <div className="flex items-center space-x-6">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                    <Filter size={16} className="text-brand-600/50" /> カテゴリ
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {DEPARTMENTS.map(d => (
                      <button
                        key={d}
                        onClick={() => setSelectedDept(d)}
                        className={`px-8 py-3.5 rounded-2xl text-[11px] font-black transition-all border-2 ${selectedDept === d ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-600 transition-colors" size={22} />
                <input
                  type="text"
                  placeholder="団体名で検索..."
                  className="bg-slate-50 border-transparent rounded-[2rem] py-5 pl-16 pr-10 text-base font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all w-full md:w-96"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-8">団体情報</th>
                    <th className="px-10 py-8 text-center">メインステータス</th>
                    {['体験', '食品', '物販'].includes(selectedDept) && <th className="px-10 py-8 text-center">待ち時間設定</th>}
                    {selectedDept === '冊子' && <th className="px-10 py-8 text-center">配布コントロール</th>}
                    {selectedDept === '公演' && <th className="px-10 py-8">整理券マトリックス</th>}
                    <th className="px-10 py-8 text-center">管理者操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groups.filter(g => {
                    const matchDept = g.group_activities.some(a => a.department === selectedDept);
                    const matchSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || (g.title && g.title.toLowerCase().includes(searchQuery.toLowerCase()));
                    return matchDept && matchSearch;
                  }).map(g => {
                    const act = g.group_activities.find(a => a.department === selectedDept);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-900 text-lg">{g.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{g.building} {g.room}</span>
                              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                              <span className="text-[11px] text-brand-600 font-black truncate max-w-[200px]">{g.title || 'Official Program'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center justify-center gap-4">
                            <div className={`px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-3 border-2 ${act.status === 'closed' || act.status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                              <div className={`w-2 h-2 rounded-full ${act.status === 'closed' || act.status === 'ended' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                              {act.status === 'closed' || act.status === 'ended' ? 'CLOSED' : 'OPEN'}
                            </div>
                            <button
                              onClick={() => handleToggleActivityStatus(act, act.status === 'open' || act.status === 'distributing' ? 'closed' : (selectedDept === '冊子' ? 'distributing' : 'open'))}
                              className="w-12 h-12 bg-white border border-slate-100 text-slate-300 rounded-xl flex items-center justify-center hover:text-brand-600 hover:border-brand-100 transition-all hover:rotate-180 shadow-sm"
                            >
                              <RefreshCw size={18} />
                            </button>
                          </div>
                        </td>
                        {['体験', '食品', '物販'].includes(selectedDept) && (
                          <td className="px-10 py-8">
                            <div className="flex justify-center">
                              <select
                                value={act.waiting_time}
                                onChange={(e) => handleUpdateWaitingTime(act.id, parseInt(e.target.value))}
                                disabled={act.status === 'closed'}
                                className="bg-slate-50 border-transparent rounded-[1.2rem] px-6 py-3.5 text-sm font-black text-slate-800 focus:bg-white focus:ring-4 focus:ring-brand-500/5 outline-none disabled:opacity-30 transition-all"
                              >
                                {Array.from({ length: 25 }, (_, i) => i * 5).map(t => (
                                  <option key={t} value={t}>{t === 0 ? '待ちなし' : `${t}分待ち`}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        )}
                        {selectedDept === '冊子' && (
                          <td className="px-10 py-8">
                            <div className="flex justify-center gap-2">
                              {[
                                { id: 'distributing', label: '配' },
                                { id: 'limited', label: '残' },
                                { id: 'ended', label: '終' }
                              ].map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => supabase.from('group_activities').update({ status: s.id, updated_at: new Date().toISOString() }).eq('id', act.id)}
                                  className={`w-12 h-12 rounded-xl text-xs font-black transition-all border-2 ${act.status === s.id ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'}`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                        {selectedDept === '公演' && (
                          <td className="px-10 py-8">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              {g.performances.sort((a,b) => a.start_time.localeCompare(b.start_time)).map(p => (
                                <div key={p.id} className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400 w-12 tracking-tighter">{p.start_time}</span>
                                  <div className="flex bg-slate-100/50 p-1 rounded-xl">
                                    {[
                                      { id: 'none', label: '×' },
                                      { id: 'distributing', label: '配' },
                                      { id: 'ended', label: '終' }
                                    ].map(s => (
                                      <button
                                        key={s.id}
                                        onClick={() => supabase.from('performances').update({ status: s.id, updated_at: new Date().toISOString() }).eq('id', p.id)}
                                        className={`w-8 h-8 rounded-lg text-[9px] font-black transition-all ${p.status === s.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-300'}`}
                                      >
                                        {s.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        )}
                        <td className="px-10 py-8">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => requireConfirm(`編集を${g.editing_locked ? '許可' : 'ロック'}しますか？`, () => supabase.from('groups').update({ editing_locked: !g.editing_locked }).eq('id', g.id))}
                              className={`w-12 h-12 rounded-2xl transition-all border-2 ${g.editing_locked ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-lg shadow-rose-500/10' : 'bg-white border-slate-50 text-slate-300 hover:border-slate-200 hover:text-slate-600'}`}
                            >
                              {g.editing_locked ? <Lock size={20} strokeWidth={2.5} /> : <Unlock size={20} strokeWidth={2.5} />}
                            </button>
                            <button
                              onClick={() => requireConfirm('強制ログアウトさせますか？', () => supabase.from('groups').update({ last_reset_at: new Date().toISOString() }).eq('id', g.id))}
                              className="w-12 h-12 bg-white border border-slate-50 text-slate-300 rounded-2xl hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 transition-all shadow-sm"
                            >
                              <LogOut size={20} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lost_found' && (
        <div className="bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-sm space-y-10">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">落とし物管理</h3>
            <button className="flex items-center gap-3 px-10 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-brand-500/30 hover:bg-brand-700 hover:translate-y-[-2px] transition-all">
              <Plus size={22} strokeWidth={3} />
              新規追加
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lostFound.map(item => (
              <div key={item.id} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6 group hover:bg-white hover:shadow-xl hover:shadow-brand-900/5 transition-all">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-brand-600 shadow-sm transition-transform group-hover:scale-110">
                    <PackageSearch size={32} />
                  </div>
                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'kept' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-emerald-100 text-emerald-700 shadow-sm'}`}>
                    {item.status === 'kept' ? '管理中' : '返却済'}
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xl tracking-tight">{item.item_name}</h4>
                  <p className="text-sm text-slate-400 font-bold flex items-center gap-2 mt-2">
                    <MapPin size={16} className="text-brand-600/50" /> {item.place_found}
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-black tracking-widest uppercase">{new Date(item.found_at).toLocaleDateString()}</span>
                  <button className="text-[11px] font-black text-brand-600 hover:text-brand-700 tracking-[0.2em] uppercase">詳細・編集</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-sm space-y-10">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">お知らせ管理ユニット</h3>
            <button className="flex items-center gap-3 px-10 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-brand-500/30 hover:bg-brand-700 hover:translate-y-[-2px] transition-all">
              <Plus size={22} strokeWidth={3} />
              新規発行
            </button>
          </div>
          <div className="space-y-6">
            {announcements.map(ann => (
              <div key={ann.id} className="flex items-center gap-10 p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-brand-900/5 transition-all group">
                <div className="w-20 h-20 bg-white rounded-[2rem] text-brand-600 shadow-sm flex items-center justify-center transition-transform group-hover:rotate-12">
                  <Megaphone size={36} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h4 className="font-black text-slate-900 text-2xl tracking-tighter">{ann.title}</h4>
                    {ann.is_pinned && <span className="bg-brand-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg shadow-brand-500/20 uppercase tracking-widest">PINNED</span>}
                  </div>
                  <p className="text-base text-slate-400 font-bold line-clamp-1 mt-2">{ann.content}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-14 h-14 bg-white border border-slate-100 text-slate-300 hover:text-brand-600 rounded-2xl transition-all flex items-center justify-center shadow-sm"><Edit2 size={22} /></button>
                  <button className="w-14 h-14 bg-white border border-slate-100 text-slate-300 hover:text-rose-500 rounded-2xl transition-all flex items-center justify-center shadow-sm hover:border-rose-100 hover:bg-rose-50"><Trash2 size={22} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-slate-100">
              <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-8 leading-relaxed">{confirmDialog.message}</h3>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-4 text-slate-400 font-black text-sm hover:bg-slate-50 transition-colors">キャンセル</button>
                <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, isOpen: false })); }} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all">
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HQDashboard;
