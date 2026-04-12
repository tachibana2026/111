import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, PackageSearch, Settings, ShieldCheck, 
  Lock, Unlock, Plus, Trash2, RefreshCw, MapPin,
  AlertCircle, LogOut, CheckCircle2, Clock, Edit2,
  MessageSquare, Send, User, ChevronLeft, Megaphone,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const HQDashboard = () => {
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkLock, setBulkLock] = useState(false);
  
  // Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [annData, setAnnData] = useState({ 
    title: '', 
    content: '', 
    date: new Date().toISOString().split('T')[0],
    is_pinned: false
  });
  
  // Messaging State
  const [messages, setMessages] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const audioRef = useRef(new Audio('/notification.mp3'));

  const navigate = useNavigate();

  // Lost & Found Modal
  const [showLostModal, setShowLostModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [lostData, setLostData] = useState({ name: '', location: '', features: '', found_at: new Date().toISOString().slice(0, 16) });

  // Group Edit Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({ name: '', waiting_time: 0, status: 'open' });

  useEffect(() => {
    // 認証チェック
    const authType = localStorage.getItem('ryoun_auth_type');
    if (authType !== 'hq') {
      navigate('/ryoun-hq-portal');
      return;
    }

    fetchData();
    fetchMessages();
    fetchAnnouncements();

    const msgSub = supabase
      .channel('hq_messages')
      .on('postgres_changes', { event: 'INSERT', table: 'messages' }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        // 団体からの新着メッセージの場合のみ通知音を鳴らす
        if (payload.new.sender === 'group') {
          audioRef.current.play().catch(err => console.log('Audio play blocked:', err));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'messages' && selectedGroupId) {
      scrollToBottom();
      markAsRead(selectedGroupId);
    }
  }, [selectedGroupId, messages, activeTab]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const markAsRead = async (groupId) => {
    const hasUnread = messages.some(m => m.group_id === groupId && m.sender === 'group' && !m.is_read);
    if (!hasUnread) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('group_id', groupId)
      .eq('sender', 'group')
      .eq('is_read', false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroupId || sending) return;

    setSending(true);
    const { data, error } = await supabase.from('messages').insert([{
      group_id: selectedGroupId,
      sender: 'hq',
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    }]).select().single();

    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } else if (error) {
      console.error('Send error:', error);
      alert('メッセージの送信に失敗しました。SQLが正しく実行されているか確認してください。');
    }
    setSending(false);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('date', { ascending: false });
    if (data) setAnnouncements(data);
  };

  const moveAnnouncement = async (id, direction) => {
    const currentIndex = announcements.findIndex(a => a.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= announcements.length) return;

    // ピン留め状態が違うもの同士の入れ替えは制限するか、またはそのまま入れ替える
    // ここでは単純に入れ替えを実装
    const currentAnn = announcements[currentIndex];
    const targetAnn = announcements[targetIndex];

    // 暫定的な順序値の修正（0の場合など）
    const currentOrder = currentAnn.sort_order || currentIndex;
    const targetOrder = targetAnn.sort_order || targetIndex;

    const { error } = await supabase.from('announcements').upsert([
      { ...currentAnn, sort_order: targetOrder },
      { ...targetAnn, sort_order: currentOrder }
    ]);

    if (!error) {
      fetchAnnouncements();
    }
  };

  const handleSaveAnn = async (e) => {
    e.preventDefault();
    let error;
    if (editingAnn) {
      const { error: err } = await supabase.from('announcements').update(annData).eq('id', editingAnn.id);
      error = err;
    } else {
      // 新規作成時は現在の末尾の順序 + 1 を設定
      const maxOrder = announcements.length > 0 ? Math.max(...announcements.map(a => a.sort_order || 0)) : 0;
      const { error: err } = await supabase.from('announcements').insert([{ ...annData, sort_order: maxOrder + 1 }]);
      error = err;
    }

    if (!error) {
      fetchAnnouncements();
      setShowAnnModal(false);
    }
  };

  const openAnnModal = (ann = null) => {
    if (ann) {
      setEditingAnn(ann);
      setAnnData({
        title: ann.title,
        content: ann.content,
        date: ann.date,
        is_pinned: ann.is_pinned
      });
    } else {
      setEditingAnn(null);
      setAnnData({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        is_pinned: false
      });
    }
    setShowAnnModal(true);
  };

  const handleDeleteAnn = async (id) => {
    if (!confirm('お知らせを削除してもよろしいですか？')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) fetchAnnouncements();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: gData } = await supabase.from('groups').select('*').order('login_id', { ascending: true });
    const { data: lData } = await supabase.from('lost_found').select('*').order('found_at', { ascending: false });
    
    if (gData) {
      setGroups(gData);
      setBulkLock(gData.length > 0 && gData.every(g => g.editing_locked));
    }
    if (lData) setLostFound(lData);
    
    setLoading(false);
  };

  const toggleBulkLock = async () => {
    const newState = !bulkLock;
    const { error } = await supabase
      .from('groups')
      .update({ editing_locked: newState })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!error) {
      fetchData();
    }
  };

  const toggleGroupLock = async (id, currentState) => {
    const { error } = await supabase
      .from('groups')
      .update({ editing_locked: !currentState })
      .eq('id', id);

    if (!error) fetchData();
  };


  const handleForceLogout = async (groupId) => {
    if (!confirm('この団体を強制ログアウトさせますか？\n実行すると現在開いている画面がログイン画面に戻ります。')) return;
    
    const { error } = await supabase
      .from('groups')
      .update({ last_reset_at: new Date().toISOString() })
      .eq('id', groupId);

    if (error) {
      alert('失敗しました。');
    } else {
      fetchData();
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('groups')
      .update({
        name: groupFormData.name,
        waiting_time: groupFormData.waiting_time,
        status: groupFormData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingGroup.id);

    if (!error) {
      fetchData();
      setShowGroupModal(false);
    }
  };

  const openGroupModal = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      waiting_time: group.waiting_time,
      status: group.status
    });
    setShowGroupModal(true);
  };

  const handleSaveLost = async (e) => {
    e.preventDefault();
    const payload = { ...lostData, updated_at: new Date().toISOString() };
    
    let error;
    if (editingItem) {
      const { error: err } = await supabase.from('lost_found').update(payload).eq('id', editingItem.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('lost_found').insert([payload]);
      error = err;
    }

    if (!error) {
       fetchData();
       closeModal();
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setLostData({
        name: item.name,
        location: item.location,
        features: item.features,
        found_at: new Date(item.found_at).toISOString().slice(0, 16)
      });
    } else {
      setEditingItem(null);
      setLostData({ name: '', location: '', features: '', found_at: new Date().toISOString().slice(0, 16) });
    }
    setShowLostModal(true);
  };

  const closeModal = () => {
    setShowLostModal(false);
    setEditingItem(null);
  };

  const handleDeleteLost = async (id) => {
    const { error } = await supabase.from('lost_found').delete().eq('id', id);
    if (!error) fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-ryoun-sky" /></div>;

  const formatJpDate = (ds) => {
    if (!ds) return '-';
    const d = new Date(ds);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4">
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-ryoun-sky/20 rounded-xl flex items-center justify-center text-ryoun-sky border border-ryoun-sky/20">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold italic tracking-tighter">RYOUN HQ PORTAL</h1>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/ryoun-hq-portal'); }} className="p-3 bg-white/5 rounded-xl text-white/30 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex space-x-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-full md:w-fit">
        {[
          { id: 'groups', name: '団体管理', icon: Users },
          { id: 'lost', name: '落とし物管理', icon: PackageSearch },
          { id: 'messages', name: 'メッセージ', icon: MessageSquare },
          { id: 'announcements', name: 'お知らせ', icon: Megaphone },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-xl transition-all text-sm font-medium relative ${
              activeTab === tab.id ? 'bg-ryoun-sky text-ryoun-dark font-bold' : 'text-white/50 hover:bg-white/10'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden md:inline">{tab.name}</span>
            {tab.id === 'messages' && messages.some(m => !m.is_read && m.sender === 'group') && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
            <div>
              <h2 className="font-bold text-lg text-white">システム一括制御</h2>
              <p className="text-white/40 text-xs">各団体側でのデータ更新をまとめて禁止/許可します</p>
            </div>
            <button 
              onClick={toggleBulkLock}
              className={`w-full md:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold transition-all shadow-xl ${
                bulkLock ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}
            >
              {bulkLock ? <Lock size={18} /> : <Unlock size={18} />}
              <span>{bulkLock ? '全団体ロック中' : '全団体許可中'}</span>
            </button>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-6 py-4 font-semibold">団体名</th>
                  <th className="px-6 py-4 font-semibold">状態</th>
                  <th className="px-6 py-4 font-semibold text-center">待ち時間</th>
                  <th className="px-6 py-4 font-semibold text-right">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groups.map(g => (
                  <tr key={g.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-medium">{g.name}</td>
                    <td className="px-6 py-4">
                      {g.status === 'open' ? (
                        <span className="text-green-400 flex items-center font-bold text-xs"><CheckCircle2 size={12} className="mr-1" />公開中</span>
                      ) : (
                        <span className="text-red-400 flex items-center font-bold text-xs"><AlertCircle size={12} className="mr-1" />受付終了</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">{g.waiting_time}分</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openGroupModal(g)}
                          className="p-2.5 rounded-lg text-white/30 hover:text-ryoun-sky bg-white/5 border border-white/5"
                        >
                          <Edit2 size={18} />
                        </button>
                         <button 
                          onClick={() => toggleGroupLock(g.id, g.editing_locked)}
                          className={`p-2.5 rounded-lg transition-colors ${g.editing_locked ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'}`}
                          title="編集ロックの切り替え"
                        >
                          {g.editing_locked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button 
                          onClick={() => handleForceLogout(g.id)}
                          className="p-2.5 rounded-lg text-white/30 hover:text-red-500 bg-white/5 border border-white/5"
                          title="強制ログアウト（全端末）"
                        >
                          <LogOut size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 bg-ryoun-dark/95 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="glass-card w-full max-w-md p-8 bg-[#1e293b]"
            >
              <h2 className="text-2xl font-bold mb-6">団体情報を編集</h2>
              <form onSubmit={handleSaveGroup} className="space-y-5">
                <div className="space-y-1 pb-4 border-b border-white/5">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">対象団体</label>
                  <p className="text-xl font-bold text-ryoun-sky">{groupFormData.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">待ち時間</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-ryoun-sky text-white"
                      value={groupFormData.waiting_time} 
                      onChange={e => setGroupFormData({...groupFormData, waiting_time: parseInt(e.target.value)})}
                    >
                      {Array.from({ length: 37 }, (_, i) => i * 5).map(time => (
                        <option key={time} value={time} className="bg-ryoun-dark">
                          {time} 分
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">現在の状態</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-ryoun-sky text-white"
                      value={groupFormData.status} onChange={e => setGroupFormData({...groupFormData, status: e.target.value})}
                    >
                      <option value="open" className="bg-ryoun-dark">公開中</option>
                      <option value="closed" className="bg-ryoun-dark">受付終了</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 py-4 text-white/30 hover:text-white transition-colors font-bold">キャンセル</button>
                  <button type="submit" className="flex-1 btn-primary py-4 font-bold rounded-xl shadow-lg shadow-ryoun-sky/20">保存する</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LostFound Tab ... (Previously implemented modal and items remain the same) */}
      {activeTab === 'lost' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
             <h2 className="text-xl font-bold">落とし物一覧</h2>
             <button onClick={() => openModal()} className="btn-primary flex items-center space-x-2 py-3 px-6 shadow-xl shadow-ryoun-sky/20"><Plus size={20} /><span>新規登録</span></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lostFound.map(item => (
              <div key={item.id} className="glass-card p-5 flex flex-col group">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <div className="flex items-center text-[10px] text-ryoun-sky tracking-wider"><MapPin size={10} className="mr-1" />{item.location}</div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => openModal(item)} className="p-2 text-white/30 hover:text-ryoun-sky bg-white/5 rounded-lg border border-white/5"><RefreshCw size={14} /></button>
                    <button onClick={() => handleDeleteLost(item.id)} className="p-2 text-white/30 hover:text-red-400 bg-white/5 rounded-lg border border-white/5"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-1 text-[11px] text-white/40 border-t border-white/5 pt-3">
                  <div className="flex items-center"><Clock size={12} className="mr-1" />拾得: {formatJpDate(item.found_at)}</div>
                  <p className="italic">特徴: {item.features}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Lost Modal stays the same... implemented in line 236 in previous version, still here but condensed for space if needed */}
          <AnimatePresence>
            {showLostModal && (
              <div className="fixed inset-0 bg-ryoun-dark/95 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass-card w-full max-w-md p-8 bg-[#1e293b]">
                  <h2 className="text-2xl font-bold mb-6">{editingItem ? '落とし物を修正' : '落とし物を登録'}</h2>
                  <form onSubmit={handleSaveLost} className="space-y-5">
                    <div className="space-y-2"><label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">品名</label><input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none text-white focus:ring-1 focus:ring-ryoun-sky" value={lostData.name} onChange={e => setLostData({...lostData, name: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">場所</label><input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none text-white focus:ring-1 focus:ring-ryoun-sky" value={lostData.location} onChange={e => setLostData({...lostData, location: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">拾得日時</label><input type="datetime-local" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none text-white" value={lostData.found_at} onChange={e => setLostData({...lostData, found_at: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">特徴</label><textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none h-24 resize-none" value={lostData.features} onChange={e => setLostData({...lostData, features: e.target.value})}></textarea></div>
                    <div className="flex space-x-3 pt-4"><button type="button" onClick={closeModal} className="flex-1 py-4 text-white/30 hover:text-white transition-colors font-bold">キャンセル</button><button type="submit" className="flex-1 btn-primary py-4 font-bold shadow-lg shadow-ryoun-sky/20">保存する</button></div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="flex h-[70vh] glass-card overflow-hidden">
          {/* Sidebar */}
          <div className={`${selectedGroupId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-white/10 bg-white/5`}>
            <div className="p-4 border-b border-white/5">
              <h2 className="font-bold text-sm text-white/40 uppercase tracking-widest">団体チャット</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {groups.map(g => {
                const unreadCount = messages.filter(m => m.group_id === g.id && m.sender === 'group' && !m.is_read).length;
                const lastMsg = [...messages].reverse().find(m => m.group_id === g.id);
                
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full p-4 flex items-center space-x-3 transition-colors text-left border-b border-white/5 ${
                      selectedGroupId === g.id ? 'bg-ryoun-sky/10 border-r-4 border-r-ryoun-sky' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-sm truncate">{g.name}</span>
                        {unreadCount > 0 && (
                          <span className="w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 truncate">
                        {lastMsg ? lastMsg.content : 'メッセージはありません'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${!selectedGroupId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white/5`}>
            {selectedGroupId ? (
              <>
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setSelectedGroupId(null)} className="md:hidden p-2 -ml-2 text-white/40">
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h3 className="font-bold text-sm">{groups.find(g => g.id === selectedGroupId)?.name}</h3>
                      <p className="text-[10px] text-green-400 font-medium">オンライン</p>
                    </div>
                  </div>
                </div>

                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                >
                  {messages.filter(m => m.group_id === selectedGroupId).map((msg, i) => (
                    <div key={msg.id || i} className={`flex ${msg.sender === 'hq' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%] space-y-1">
                        <div className={`px-4 py-3 rounded-2xl text-sm ${
                          msg.sender === 'hq' 
                            ? 'bg-ryoun-sky text-ryoun-dark font-medium rounded-tr-none' 
                            : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center space-x-1 text-[9px] text-white/30 ${msg.sender === 'hq' ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.sender === 'hq' && msg.is_read && (
                            <span className="font-bold text-ryoun-dark/60">既読</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/5 flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="返信を入力..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-ryoun-sky text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-12 h-12 bg-ryoun-sky text-ryoun-dark rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-ryoun-sky/20"
                  >
                    {sending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-3">
                <MessageSquare size={64} className="opacity-10" />
                <p className="text-sm font-medium">団体を選択してチャットを開始してください</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
             <h2 className="text-xl font-bold">お知らせ一覧</h2>
             <button 
               onClick={() => openAnnModal()} 
               className="btn-primary flex items-center space-x-2 py-3 px-6 shadow-xl shadow-ryoun-sky/20"
             >
               <Plus size={20} />
               <span>新規作成</span>
             </button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-6 py-4 font-semibold w-24 text-center">並び順</th>
                  <th className="px-6 py-4 font-semibold w-16 text-center">ピン</th>
                  <th className="px-6 py-4 font-semibold">タイトル</th>
                  <th className="px-6 py-4 font-semibold">投稿日</th>
                  <th className="px-6 py-4 font-semibold text-right">管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {announcements.map((ann, idx) => (
                  <tr key={ann.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-1">
                        <button 
                          disabled={idx === 0}
                          onClick={() => moveAnnouncement(ann.id, 'up')}
                          className="p-1 hover:text-ryoun-sky disabled:opacity-10 transition-colors"
                        >
                          <ChevronUp size={20} />
                        </button>
                        <button 
                          disabled={idx === announcements.length - 1}
                          onClick={() => moveAnnouncement(ann.id, 'down')}
                          className="p-1 hover:text-ryoun-sky disabled:opacity-10 transition-colors"
                        >
                          <ChevronDown size={20} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {ann.is_pinned ? (
                         <Megaphone size={14} className="mx-auto text-ryoun-sky fill-ryoun-sky/20" />
                      ) : (
                         <span className="text-white/10">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex flex-col">
                        <span>{ann.title}</span>
                        <span className="text-[10px] text-white/20 line-clamp-1">{ann.content}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/40">{ann.date}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openAnnModal(ann)}
                          className="p-2 text-white/30 hover:text-ryoun-sky bg-white/5 rounded-lg border border-white/5"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAnn(ann.id)}
                          className="p-2 text-white/30 hover:text-red-400 bg-white/5 rounded-lg border border-white/5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnModal && (
          <div className="fixed inset-0 bg-ryoun-dark/95 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="glass-card w-full max-w-2xl p-8 bg-[#1e293b] shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">{editingAnn ? 'お知らせを編集' : 'お知らせを新規作成'}</h2>
              <form onSubmit={handleSaveAnn} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">タイトル</label>
                  <input 
                    type="text" required
                    placeholder="例: たちばな祭 公式サイトを公開しました"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none text-white focus:ring-1 focus:ring-ryoun-sky"
                    value={annData.title} onChange={e => setAnnData({...annData, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">日付</label>
                    <input 
                      type="date" required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none text-white focus:ring-1 focus:ring-ryoun-sky"
                      value={annData.date} onChange={e => setAnnData({...annData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl px-4 py-4 cursor-pointer hover:bg-white/10 transition-colors">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-ryoun-sky focus:ring-ryoun-sky focus:ring-offset-0"
                        checked={annData.is_pinned}
                        onChange={e => setAnnData({...annData, is_pinned: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-white/60">重要（ピン留めする）</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">内容</label>
                  <textarea 
                    required
                    placeholder="お知らせの本文を入力してください。URLを入力すると自動でリンクになります。"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none h-48 resize-none text-white focus:ring-1 focus:ring-ryoun-sky leading-relaxed"
                    value={annData.content} onChange={e => setAnnData({...annData, content: e.target.value})}
                  ></textarea>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAnnModal(false)} className="flex-1 py-4 text-white/30 hover:text-white transition-colors font-bold">キャンセル</button>
                  <button type="submit" className="flex-1 btn-primary py-4 font-bold shadow-lg shadow-ryoun-sky/20">
                    {editingAnn ? '更新を保存する' : 'お知らせを投稿する'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HQDashboard;
