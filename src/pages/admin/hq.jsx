import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, PackageSearch, Settings, ShieldCheck,
  Lock, Unlock, Plus, Trash2, RefreshCw, MapPin,
  AlertCircle, LogOut, CheckCircle2, Clock, Edit2, XCircle,
  AlertTriangle, Info,
  User, ChevronLeft, Save,
  ChevronUp, ChevronDown, Filter, SortDesc, Calendar, Utensils
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerRevalidate } from '../../lib/revalidate';
import Portal from '../../components/Portal';


const DEPARTMENTS = ['体験', '食品', '公演', '展示', '冊子', '物販'];

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
};

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'データなし';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 3) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffWeeks < 4) return `${diffWeeks}週間前`;
  if (diffMonths < 12) return `${diffMonths}か月前`;
  return `${diffYears}年前`;
};

const renderFormattedMessage = (message) => {
  if (!message) return null;
  const parts = message.split(/(【[^】]+】)/g);
  return parts.map((part, index) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      return (
        <span key={index} className="text-amber-600 px-0.5">
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
};

const HQDashboard = () => {
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedDept, setSelectedDept] = useState('体験');
  const [groups, setGroups] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null, confirmText: '実行', icon: null });
  const [editingGroup, setEditingGroup] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [editingLostFound, setEditingLostFound] = useState(null);
  const [isLostFoundModalOpen, setIsLostFoundModalOpen] = useState(false);

  useEffect(() => {
    if (confirmDialog.isOpen || isEditModalOpen || isLostFoundModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [confirmDialog.isOpen, isEditModalOpen, isLostFoundModalOpen]);

  const router = useRouter();

  const requireConfirm = (message, onConfirm, confirmText = '実行する', icon = null) => {
    setConfirmDialog({ isOpen: true, message, onConfirm, confirmText, icon });
  };

  const handleLogout = async () => {
    requireConfirm(
      '本部管理画面から\n【ログアウト】しますか？',
      async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('ryoun_auth_type');
        localStorage.removeItem('ryoun_group_id');
        localStorage.removeItem('ryoun_password');
        localStorage.removeItem('ryoun_login_at');
        router.push('/admin');
      },
      'ログアウト',
      <LogOut className="w-7 h-7 md:w-8 md:h-8" />
    );
  };

  useEffect(() => {
    const authType = localStorage.getItem('ryoun_auth_type');
    if (authType !== 'hq') { router.push('/admin'); return; }
    fetchData();

    const channels = [
      supabase.channel('hq_realtime')
        .on('postgres_changes', { event: '*', table: 'groups' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'group_activities' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'performances' }, fetchData)
        .on('postgres_changes', { event: '*', table: 'lost_found' }, fetchData).subscribe()
    ];
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gData, error: gError } = await supabase
        .from('groups')
        .select('id, name, title, building, room, department, updated_at, last_reset_at, editing_locked, reception_status, waiting_time, ticket_status, has_reception, has_waiting_time, has_ticket_status, has_performances, performances(id, group_id, part_id, start_time, end_time, status, reception_status)')
        .order('name');
      if (gError) throw gError;
      if (gData) setGroups(gData);

      const { data: lData, error: lError } = await supabase.from('lost_found').select('*').order('found_at', { ascending: false });
      if (lError) throw lError;
      if (lData) setLostFound(lData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateWaitingTime = async (groupId, time) => {
    await supabase.from('groups').update({ waiting_time: time, updated_at: new Date().toISOString() }).eq('id', groupId);
    triggerRevalidate();
  };

  const handleBulkStatusUpdate = async (status) => {
    setIsBulkUpdating(true);
    try {
      const filteredGroups = groups.filter(g => g.department?.split(',').map(d => d.trim()).includes(selectedDept));
      const groupIds = filteredGroups.map(g => g.id);

      if (groupIds.length > 0) {
        await supabase.from('groups')
          .update({ reception_status: status, updated_at: new Date().toISOString() })
          .in('id', groupIds);
      }

      if (selectedDept === '公演') {
        const groupIds = filteredGroups.map(g => g.id);
        await supabase.from('performances')
          .update({ reception_status: status === 'open' ? 'open' : 'closed', updated_at: new Date().toISOString() })
          .in('group_id', groupIds);
      }

      // Update parent group's updated_at to reflect bulk changes on public page
      const affectedGroupIds = filteredGroups.map(g => g.id);
      if (affectedGroupIds.length > 0) {
        await supabase.from('groups')
          .update({ updated_at: new Date().toISOString() })
          .in('id', affectedGroupIds);
      }

      await fetchData();
      triggerRevalidate();
    } catch (error) {
      console.error('Bulk update error:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkLockUpdate = async (locked) => {
    setIsBulkUpdating(true);
    try {
      const filteredGroups = groups.filter(g => g.department === selectedDept);
      const groupIds = filteredGroups.map(g => g.id);
      if (groupIds.length > 0) {
        await supabase.from('groups').update({ 
          editing_locked: locked,
          updated_at: new Date().toISOString() 
        }).in('id', groupIds);
      }
      await fetchData();
      triggerRevalidate();
    } catch (error) {
      console.error('Bulk lock error:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkLogout = async () => {
    setIsBulkUpdating(true);
    try {
      const filteredGroups = groups.filter(g => g.department === selectedDept);
      const groupIds = filteredGroups.map(g => g.id);
      if (groupIds.length > 0) {
        await supabase.from('groups').update({ 
          last_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).in('id', groupIds);
      }
      await fetchData();
      triggerRevalidate();

    } catch (error) {
      console.error('Bulk logout error:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDeleteLostFound = async (id) => {
    requireConfirm('この落とし物情報を\n【削除】しますか？', async () => {
      await supabase.from('lost_found').delete().eq('id', id);
      fetchData();
      triggerRevalidate();
    }, '削除');
  };



  return (
    <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-12 pb-12 pt-4 px-4 md:px-0">
      {/* HQ Header */}
      <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10">
        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-brand-600 text-white rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-500/30 shrink-0">
            <ShieldCheck className="w-8 h-8 md:w-12 md:h-12" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter">本部管理画面</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-6 md:px-10 py-4 md:py-5 bg-slate-50 text-slate-500 rounded-2xl md:rounded-3xl text-sm md:text-base font-black transition-all hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 flex items-center justify-center gap-3 md:gap-4 shadow-sm"
          >
            <LogOut className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" strokeWidth={2.5} />
            ログアウト
          </button>
        </div>
      </div>

      {/* HQ Status Control */}
      {(() => {
        const hqGroup = groups.find(g => g.name === '文化委員会');
        if (!hqGroup) return null;
        
        const handleHQStatusUpdate = async (status) => {
          try {
            const { error } = await supabase.from('groups').update({ 
              reception_status: status 
            }).eq('id', hqGroup.id);
            if (error) throw error;
            fetchData();
          } catch (e) {
            console.error(e);
          }
        };

        return (
          <div className="bg-white border border-brand-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-brand-500/5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
            <div className="flex items-center gap-5 md:gap-7 relative z-10">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-5">
                  <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">文化委員会本部 受付状況</h2>
                  <div className={`w-fit px-4 py-1.5 rounded-full text-[11px] font-black flex items-center gap-2 border-2 transition-all cursor-default ${
                    hqGroup.reception_status === 'open' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10' :
                    hqGroup.reception_status === 'before_open' ? 'bg-slate-50 border-slate-100 text-slate-400' :
                    'bg-rose-50 border-rose-100 text-rose-600 shadow-sm shadow-rose-500/10'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hqGroup.reception_status === 'open' ? 'bg-emerald-500 animate-pulse' : hqGroup.reception_status === 'before_open' ? 'bg-slate-300' : 'bg-rose-500'}`}></div>
                    {{ open: '受付中', before_open: '受付前', closed: '受付終了'}[hqGroup.reception_status]}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto relative z-10">
              {[
                { id: 'before_open', label: '受付前', color: 'hover:bg-slate-600 hover:text-white bg-slate-50 text-slate-500', icon: <Clock size={14} /> },
                { id: 'open', label: '受付中', color: 'hover:bg-emerald-600 hover:text-white bg-emerald-50 text-emerald-600', icon: <CheckCircle2 size={14} /> },
                { id: 'closed', label: '終了', color: 'hover:bg-rose-600 hover:text-white bg-rose-50 text-rose-600', icon: <XCircle size={14} /> }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => requireConfirm(`本部受付状況を\n【${s.label}】に変更しますか？`, () => handleHQStatusUpdate(s.id), s.label)}
                  className={`flex-1 md:flex-none px-4 md:px-8 py-4 md:py-5 rounded-2xl text-[10px] md:text-[11px] font-black transition-all border border-transparent whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 ${hqGroup.reception_status === s.id ? 'opacity-30 cursor-not-allowed pointer-events-none' : s.color}`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tabs / Navigation */}
      <div className="flex w-full overflow-hidden pb-2 md:pb-0">
        <div className="flex w-full p-1.5 md:p-2 bg-slate-100/80 backdrop-blur-md rounded-2xl md:rounded-[2.5rem] border border-slate-200/50 shadow-inner">
          {[
            { id: 'groups', label: '団体管理', icon: <Users className="w-4 h-4 md:w-[18px] md:h-[18px]" /> },
            { id: 'lost_found', label: '落とし物', icon: <PackageSearch className="w-4 h-4 md:w-[18px] md:h-[18px]" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 justify-center px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-black transition-all flex items-center gap-2 md:gap-3 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-brand-700 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'groups' && (
        <div className="space-y-6 md:space-y-10">
          <div className="bg-white border border-slate-100 rounded-3xl md:rounded-[3.5rem] shadow-sm overflow-hidden">
            <div className="p-6 md:p-10 border-b border-slate-50 bg-white/50 backdrop-blur-xl">
              <div className="flex flex-col space-y-4 md:space-y-8 flex-1">
                <div className="flex flex-col space-y-8">
                  {/* Bulk Management - Top Visual Refresh */}
                  <div className="bg-slate-50/50 rounded-[2rem] p-6 md:p-8 border border-white shadow-inner space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">一括編集ボタン</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">対象：{selectedDept}部門</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {/* Group 1: Reception */}
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">受付状況</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => requireConfirm(`${selectedDept}部門 全団体の受付状況を\n【受付前】にしますか？`, () => handleBulkStatusUpdate('before_open'), '一括受付前')}
                            disabled={isBulkUpdating}
                            className="py-5 rounded-xl bg-slate-50 text-slate-500 text-[10px] md:text-[11px] font-black border border-slate-100 hover:bg-slate-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center gap-2"
                          >
                            <Clock size={16} strokeWidth={2.5} />
                            <span>受付前</span>
                          </button>
                          <button
                            onClick={() => requireConfirm(`${selectedDept}部門 全団体の受付状況を\n【受付中】にしますか？`, () => handleBulkStatusUpdate('open'), '受付開始')}
                            disabled={isBulkUpdating}
                            className="py-5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] md:text-[11px] font-black border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                            <span>受付開始</span>
                          </button>
                          <button
                            onClick={() => requireConfirm(`${selectedDept}部門 全団体の受付状況を\n【受付終了】にしますか？`, () => handleBulkStatusUpdate('closed'), '受付終了')}
                            disabled={isBulkUpdating}
                            className="py-5 rounded-xl bg-rose-50 text-rose-600 text-[10px] md:text-[11px] font-black border border-rose-100 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center gap-2"
                          >
                            <XCircle size={16} strokeWidth={2.5} />
                            <span>受付終了</span>
                          </button>
                        </div>
                      </div>

                      {/* Group 2: Lock Control */}
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">編集権限</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => requireConfirm(`${selectedDept}部門 全団体の編集権限を\n【剥奪】しますか？`, () => handleBulkLockUpdate(true), '権限剥奪')}
                            disabled={isBulkUpdating}
                            className="py-5 rounded-xl bg-rose-50 text-rose-600 text-[10px] md:text-[11px] font-black border border-rose-100 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center gap-2"
                          >
                            <Lock size={16} strokeWidth={2.5} />
                            <span>一括ロック</span>
                          </button>
                          <button
                            onClick={() => requireConfirm(`${selectedDept}部門 全団体の編集権限を\n【付与】しますか？`, () => handleBulkLockUpdate(false), '権限付与')}
                            disabled={isBulkUpdating}
                            className="py-5 rounded-xl bg-slate-50 text-slate-500 text-[10px] md:text-[11px] font-black border border-slate-100 hover:bg-slate-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center gap-2"
                          >
                            <Unlock size={16} strokeWidth={2.5} />
                            <span>一括解除</span>
                          </button>
                        </div>
                      </div>

                      {/* Group 3: Session Management */}
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">セッション管理</span>
                        <button
                          onClick={() => requireConfirm(`${selectedDept}部門 全団体のセッションを\n【強制ログアウト】させますか？`, () => handleBulkLogout(), '強制ログアウト')}
                          disabled={isBulkUpdating}
                          className="py-5 rounded-xl bg-slate-900 text-white text-[10px] md:text-[11px] font-black shadow-lg shadow-slate-900/10 hover:bg-rose-600 transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center gap-2"
                        >
                          <LogOut size={16} strokeWidth={2.5} />
                          <span>強制ログアウト</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Category Filter - Bottom */}
                  <div className="space-y-3 pt-6 border-t border-slate-100">
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                      <Filter className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600/50" /> 部門選択
                    </span>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      {DEPARTMENTS.map(d => (
                        <button
                          key={d}
                          onClick={() => setSelectedDept(d)}
                          className={`px-4 md:px-8 py-2 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black transition-all border-2 ${selectedDept === d ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-100'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-8">団体情報</th>
                    <th className="px-10 py-8 text-center border-l border-slate-50">現在公開中の情報</th>
                    <th className="px-10 py-8 text-center border-l border-slate-50">最終更新日時</th>
                    <th className="px-10 py-8 text-center border-l border-slate-50">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groups.filter(g => g.department?.split(',').map(d => d.trim()).includes(selectedDept)).map(g => {
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {g.department?.split(',').map(d => d.trim()).sort((a, b) => DEPARTMENTS.indexOf(a) - DEPARTMENTS.indexOf(b)).map(dept => (
                                <span key={dept} className="text-[9px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-black uppercase tracking-wider">
                                  {dept}
                                </span>
                              ))}
                            </div>
                            <span className="font-black text-slate-900 text-lg">{g.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{g.building} {g.room}</span>
                              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                              <span className="text-[11px] text-brand-600 font-black truncate max-w-[200px]">{g.title || 'Official Program'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 border-l border-slate-50">
                          <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 border-2 ${g.reception_status === 'closed' || g.reception_status === 'ended' ? 'bg-rose-50 border-rose-100 text-rose-600' : g.reception_status === 'before_open' ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${g.reception_status === 'closed' || g.reception_status === 'ended' ? 'bg-rose-500' : g.reception_status === 'before_open' ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'}`}></div>
                                {g.reception_status === 'closed' || g.reception_status === 'ended' ? '受付終了' : g.reception_status === 'before_open' ? '受付前' : '受付中'}
                              </div>
                              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black ${g.editing_locked
                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                                }`}>
                                {g.editing_locked ? <Lock size={12} strokeWidth={3} /> : <Unlock size={12} strokeWidth={3} />}
                                <span>{g.editing_locked ? '編集ロック中' : '編集許可中'}</span>
                              </div>
                            </div>
                            {g.has_waiting_time && (
                              <div className="text-sm font-black text-slate-700">
                                {g.reception_status === 'closed' ? '-' : (g.reception_status === 'before_open' ? '' : (g.waiting_time === 0 ? '待ちなし' : `${g.waiting_time}分待ち`))}
                              </div>
                            )}
                            {g.has_ticket_status && g.ticket_status !== 'none' && (
                              <div className="flex gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${g.ticket_status === 'distributing' ? 'bg-emerald-100 text-emerald-700' :
                                  g.ticket_status === 'limited' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                  {{ distributing: '配布中', limited: '僅か', ended: '終了' }[g.ticket_status] || g.ticket_status}
                                </span>
                              </div>
                            )}
                            {selectedDept === '公演' && (
                              <div className="flex flex-col gap-1.5 min-w-[280px]">
                                {g.performances.sort((a, b) => {
                                  if (a.part_id !== b.part_id) return a.part_id - b.part_id;
                                  return a.start_time.localeCompare(b.start_time);
                                }).map(p => (
                                  <div key={p.id} className="flex items-center justify-between gap-4 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 w-12 tracking-tight shrink-0">Part{p.part_id} {p.start_time}</span>
                                    <div className="flex items-center gap-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${p.reception_status === 'closed' ? 'bg-rose-100 text-rose-600' :
                                        p.reception_status === 'ticket_only' ? 'bg-brand-100 text-brand-600' :
                                          p.reception_status === 'before_open' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        {{ before_open: '受付前', ticket_only: '整理券のみ', closed: '受付終了', open: '受付中' }[p.reception_status] || p.reception_status}
                                      </span>
                                      <span className={`text-[8px] font-black ${p.status === 'none' ? 'text-slate-300' : 'text-slate-500'}`}>
                                        整理券: {{ none: '-(なし)', distributing: '配布中', ended: '終了' }[p.status] || p.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-8 border-l border-slate-50 text-center">
                          <span className="text-[11px] font-black text-slate-400">
                            {formatRelativeTime(g.updated_at)}
                          </span>
                        </td>
                        <td className="px-10 py-8 border-l border-slate-50">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                setEditingGroup(g);
                                setIsEditModalOpen(true);
                              }}
                              className="px-8 py-4 bg-brand-600 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 active:scale-95 group"
                            >
                              <Edit2 size={18} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                              <span className="font-black text-sm">編集</span>
                            </button>
                            <button
                              onClick={() => requireConfirm('強制ログアウトを実行しますか？', async () => {
                                await supabase.from('groups').update({ last_reset_at: new Date().toISOString() }).eq('id', g.id);
                                await fetchData();
                              }, '強制ログアウト実行')}
                              className="w-12 h-12 bg-white border border-slate-100 text-slate-300 rounded-2xl hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 transition-all shadow-sm flex items-center justify-center group"
                              title="強制ログアウト"
                            >
                              <LogOut size={20} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {groups.filter(g => g.department?.split(',').map(d => d.trim()).includes(selectedDept)).map(g => {
                return (
                  <div key={g.id} className="p-5 space-y-5 bg-white">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {g.department?.split(',').map(d => d.trim()).sort((a, b) => DEPARTMENTS.indexOf(a) - DEPARTMENTS.indexOf(b)).map(dept => (
                            <span key={dept} className="text-[8px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-black uppercase tracking-wider">
                              {dept}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-base leading-tight truncate">{g.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold shrink-0">{g.room}</span>
                          <span className="text-[10px] font-black text-slate-300 shrink-0">
                            {formatRelativeTime(g.updated_at).replace('更新: ', '')}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-600 font-bold line-clamp-1">{g.title || 'Official Program'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingGroup(g);
                            setIsEditModalOpen(true);
                          }}
                          className="px-4 py-3 bg-brand-600 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95"
                        >
                          <Edit2 size={16} strokeWidth={2.5} />
                          <span className="font-black text-xs whitespace-nowrap">編集</span>
                        </button>
                        <button
                          onClick={() => requireConfirm('強制ログアウトさせますか？', async () => {
                            await supabase.from('groups').update({ last_reset_at: new Date().toISOString() }).eq('id', g.id);
                            await fetchData();
                          }, '強制ログアウト')}
                          className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-300 rounded-xl flex items-center justify-center active:scale-90 shadow-sm"
                        >
                          <LogOut size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">現在のステータス</span>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1.5 rounded-full text-[10px] font-black border-2 ${g.reception_status === 'closed' || g.reception_status === 'ended' ? 'bg-rose-100 border-rose-200 text-rose-600' : g.reception_status === 'before_open' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-emerald-100 border-emerald-200 text-emerald-600'}`}>
                            {g.reception_status === 'closed' || g.reception_status === 'ended' ? '受付終了' : g.reception_status === 'before_open' ? '受付前' : '受付中'}
                          </div>
                          <div className={`px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border ${g.editing_locked
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            {g.editing_locked ? <Lock size={10} strokeWidth={3} /> : <Unlock size={10} strokeWidth={3} />}
                            {g.editing_locked ? 'ロック済' : '許可中'}
                          </div>
                        </div>
                      </div>
                      {g.has_waiting_time && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                          <span className="text-[10px] font-black text-slate-400">待ち時間</span>
                          <span className="text-sm font-black text-slate-700">
                            {g.reception_status === 'closed' ? '-' : (g.reception_status === 'before_open' ? '' : (g.waiting_time === 0 ? '待ちなし' : `${g.waiting_time}分待ち`))}
                          </span>
                        </div>
                      )}
                      {g.has_ticket_status && g.ticket_status !== 'none' && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                          <span className="text-[10px] font-black text-slate-400">配布状況</span>
                          <span className="text-sm font-black text-brand-600">
                            {{ distributing: '配布中', limited: '僅か', ended: '終了' }[g.ticket_status] || g.ticket_status}
                          </span>
                        </div>
                      )}
                      {selectedDept === '公演' && g.performances?.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-slate-200/50">
                          {g.performances.sort((a, b) => {
                            if (a.part_id !== b.part_id) return a.part_id - b.part_id;
                            return a.start_time.localeCompare(b.start_time);
                          }).map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-black text-slate-400 shrink-0">Part{p.part_id} {p.start_time}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${p.reception_status === 'closed' ? 'bg-rose-50 text-rose-500' :
                                  p.reception_status === 'ticket_only' ? 'bg-brand-50 text-brand-500' :
                                    p.reception_status === 'before_open' ? 'bg-slate-50 text-slate-500' : 'bg-emerald-50 text-emerald-500'
                                  }`}>
                                  {{ before_open: '前', ticket_only: '券', closed: '終', open: '中' }[p.reception_status]}
                                </span>
                                <span className="text-[8px] font-black text-slate-500">
                                  {{ none: '無し', distributing: '配布中', ended: '終了' }[p.status]}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lost_found' && (
        <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 shadow-sm space-y-6 md:space-y-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">落とし物管理</h3>
            <button
              onClick={() => {
                setEditingLostFound({ name: '', location: '', features: '', found_at: new Date().toISOString() });
                setIsLostFoundModalOpen(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-brand-600 text-white rounded-2xl md:rounded-[1.5rem] font-black text-sm shadow-2xl shadow-brand-500/30 hover:bg-brand-700 active:scale-95 transition-all">
              <Plus size={20} className="md:w-5.5 md:h-5.5" strokeWidth={3} />
              新規追加
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {lostFound.map(item => (
              <div key={item.id} className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 space-y-4 md:space-y-6 group hover:bg-white hover:shadow-xl hover:shadow-brand-900/5 transition-all">
                <div className="h-4"></div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg md:text-xl tracking-tight">{item.name}</h4>
                  <p className="text-[11px] md:text-sm text-slate-400 font-bold flex items-center gap-2 mt-1.5 md:mt-2">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600/50" /> {item.location}
                  </p>
                </div>
                <div className="pt-4 md:pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[9px] md:text-[11px] text-slate-300 font-black tracking-widest uppercase">{formatDateTime(item.found_at)}</span>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setEditingLostFound(item);
                        setIsLostFoundModalOpen(true);
                      }}
                      className="text-[9px] md:text-[11px] font-black text-brand-600 hover:text-brand-700 tracking-[0.2em] uppercase">編集</button>
                    <button
                      onClick={() => handleDeleteLostFound(item.id)}
                      className="text-[9px] md:text-[11px] font-black text-rose-400 hover:text-rose-600 tracking-[0.2em] uppercase">削除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full text-center shadow-2xl border border-slate-100 text-slate-800">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
                  {confirmDialog.icon || <AlertTriangle className="w-7 h-7 md:w-8 md:h-8" />}
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 md:mb-8 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedMessage(confirmDialog.message)}
                </h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="order-2 md:order-1 flex-1 py-4 text-slate-400 font-black text-sm hover:bg-slate-50 rounded-2xl transition-colors">キャンセル</button>
                  <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, isOpen: false })); }} className="order-1 md:order-2 flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all">
                    {confirmDialog.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingGroup && (
          <Portal>
            <EditGroupModal
              group={editingGroup}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingGroup(null);
              }}
              onSave={fetchData}
            />
          </Portal>
        )}
      </AnimatePresence>

      {/* Lost & Found Modal */}
      <AnimatePresence>
        {isLostFoundModalOpen && editingLostFound && (
          <Portal>
            <EditLostFoundModal
              item={editingLostFound}
              onClose={() => {
                setIsLostFoundModalOpen(false);
                setEditingLostFound(null);
              }}
              onSave={fetchData}
            />
          </Portal>
        )}
      </AnimatePresence>


    </div >
  );
};

const EditGroupModal = ({ group, onClose, onSave }) => {
  const [editData, setEditData] = useState({
    reception_status: group.reception_status || 'before_open',
    waiting_time: group.waiting_time || 0,
    ticket_status: group.ticket_status || 'none'
  });
  const [performances, setPerformances] = useState(JSON.parse(JSON.stringify(group.performances || [])));
  const [editingLocked, setEditingLocked] = useState(group.editing_locked);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update group general settings & status
      await supabase.from('groups').update({
        editing_locked: editingLocked,
        reception_status: editData.reception_status,
        waiting_time: editData.waiting_time,
        ticket_status: editData.ticket_status,
        updated_at: new Date().toISOString()
      }).eq('id', group.id);
      // Update performances
      for (const perf of performances) {
        await supabase.from('performances').update({
          status: perf.status,
          reception_status: perf.reception_status,
          updated_at: new Date().toISOString()
        }).eq('id', perf.id);
      }
      await onSave();
      triggerRevalidate();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceLogout = async () => {
    if (!window.confirm('この団体を強制ログアウトさせますか？\n（次回のアクセス時にパスワードが再要求されます）')) return;
    setIsSaving(true);
    try {
      await supabase.from('groups').update({
        last_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', group.id);
      alert('強制ログアウトを実行しました');
      await onSave();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest">{group.building} {group.room}</span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{group.name}</h2>
            </div>
            <p className="text-sm font-bold text-slate-400">{group.title || 'Official Program'}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 custom-scrollbar">
          {/* Admin Management Section */}
          <div className="bg-rose-50/50 rounded-3xl p-6 border border-rose-100/50 space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-black text-rose-900 tracking-tight">本部用設定</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setEditingLocked(!editingLocked)}
                className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${editingLocked
                  ? 'bg-white border-rose-500 text-rose-600 shadow-lg shadow-rose-500/10'
                  : 'bg-white border-slate-100 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {editingLocked ? <Lock size={20} strokeWidth={2.5} /> : <Unlock size={20} strokeWidth={2.5} />}
                  <span className="text-[12px] font-black uppercase tracking-widest">{editingLocked ? '編集ロック中' : '編集許可中'}</span>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${editingLocked ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editingLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>

            <div className="space-y-6">
              {(group.has_reception || group.has_waiting_time || group.has_ticket_status) ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">運営状況 管理</h3>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {group.has_reception && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">受付状況</label>
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
                          {['before_open', 'open', 'closed'].map(s => (
                            <button
                              key={s}
                              onClick={() => setEditData(prev => ({ ...prev, reception_status: s }))}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${editData.reception_status === s ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}
                            >
                              {{ before_open: '受付前', open: '受付中', closed: '終了' }[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {group.has_waiting_time && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">待ち時間</label>
                        <select
                          value={editData.waiting_time}
                          onChange={(e) => setEditData(prev => ({ ...prev, waiting_time: parseInt(e.target.value) }))}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-4 px-6 text-sm font-black text-slate-700 outline-none transition-all"
                        >
                          {Array.from({ length: 25 }, (_, i) => i * 5).map(t => (
                            <option key={t} value={t}>{t === 0 ? '待ちなし' : `${t}分待ち`}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {group.has_ticket_status && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">整理券配布状況</label>
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
                          {['none', 'distributing', 'limited', 'ended'].map(s => (
                            <button
                              key={s}
                              onClick={() => setEditData(prev => ({ ...prev, ticket_status: s }))}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${editData.ticket_status === s ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400'}`}
                            >
                              {{ none: 'なし', distributing: '配布中', limited: '僅か', ended: '終了' }[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : !group.has_performances && (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                    <Info size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">編集項目はありません</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 leading-relaxed">
                      この団体に本部で設定された編集項目はありません。
                    </p>
                  </div>
                </div>
              )}

              {group.has_performances && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">公演スケジュール 管理</h3>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  {performances.sort((a, b) => {
                    if (a.part_id !== b.part_id) return a.part_id - b.part_id;
                    return a.start_time.localeCompare(b.start_time);
                  }).map(perf => (
                    <div key={perf.id} className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-brand-600" />
                          Part{perf.part_id} ({perf.start_time})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">受付状況</label>
                          <div className="flex bg-white/50 p-1 rounded-xl border border-slate-100 gap-1 overflow-x-auto scrollbar-hide">
                            {['before_open', 'open', 'ticket_only', 'closed'].map(s => (
                              <button
                                key={s}
                                onClick={() => setPerformances(prev => prev.map(p => p.id === perf.id ? { ...p, reception_status: s } : p))}
                                className={`px-2 py-2 rounded-lg text-[8px] font-black whitespace-nowrap transition-all ${perf.reception_status === s ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                {{ before_open: '受付前', open: '受付中', ticket_only: '整理券のみ受付', closed: '受付終了' }[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">整理券配布状況</label>
                          <div className="flex bg-white/50 p-1 rounded-xl border border-slate-100 gap-1">
                            {['none', 'distributing', 'ended'].map(s => (
                              <button
                                key={s}
                                onClick={() => setPerformances(prev => prev.map(p => p.id === perf.id ? { ...p, status: s } : p))}
                                className={`flex-1 py-2 rounded-lg text-[8px] font-black transition-all ${perf.status === s ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                {{ none: '配布なし', distributing: '配布中', ended: '配布終了' }[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/30 flex gap-4 shrink-0">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 py-5 text-slate-400 font-black text-sm hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
          >
            キャンセル
          </button>
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex-[2] py-5 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
            <span>更新する</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const EditLostFoundModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Remove id from formData if it exists for insert
      const { id, ...saveData } = formData;

      let res;
      if (item.id) {
        res = await supabase.from('lost_found').update({
          ...saveData
        }).eq('id', item.id);
      } else {
        res = await supabase.from('lost_found').insert([
          { ...saveData }
        ]);
      }

      if (res.error) throw res.error;

      await onSave();
      triggerRevalidate();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-xl">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-white w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">落とし物登録・編集</h2>
          </div>
          <div className="p-6 md:p-10 space-y-6 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">品名</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all"
                placeholder="品名を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">拾得場所</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all"
                placeholder="拾得場所を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">特徴・詳細</label>
              <textarea
                value={formData.features || ''}
                onChange={e => setFormData({ ...formData, features: e.target.value })}
                rows={3}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all resize-none"
                placeholder="特徴･詳細を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">拾得日時</label>
              <input
                type="datetime-local"
                value={formData.found_at ? new Date(new Date(formData.found_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({ ...formData, found_at: new Date(e.target.value).toISOString() })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all"
              />
            </div>
          </div>
          <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/30 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button>
            <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              {isSaving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              保存する
            </button>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
};



export default HQDashboard;
