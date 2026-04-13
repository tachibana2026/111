import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, PackageSearch, Settings, ShieldCheck,
  Lock, Unlock, Plus, Trash2, RefreshCw, MapPin,
  AlertCircle, LogOut, CheckCircle2, Clock, Edit2, XCircle,
  MessageSquare, Send, User, ChevronLeft, Megaphone,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['体験', '食品', '公演', '展示', '冊子'];

const HQDashboard = () => {
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedDept, setSelectedDept] = useState('体験');
  const [groups, setGroups] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkLock, setBulkLock] = useState(false);
  const [isAllClosed, setIsAllClosed] = useState(false);

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

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  const requireConfirm = (message, onConfirm, confirmText = '実行する') => {
    setConfirmDialog({ isOpen: true, message, onConfirm, confirmText });
  };

  // Messaging State
  const [messages, setMessages] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedBroadcastGroupIds, setSelectedBroadcastGroupIds] = useState([]);
  const scrollRef = useRef(null);
  const audioRef = useRef(new Audio(`${import.meta.env.BASE_URL}notification.mp3`));

  const navigate = useNavigate();

  // Lost & Found Modal
  const [showLostModal, setShowLostModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [lostData, setLostData] = useState({ name: '', location: '', features: '', found_at: new Date().toISOString().slice(0, 16) });

  // Group Edit Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    title: '',
    waiting_time: 0,
    status: 'open',
    performance_day1: [],
    performance_day2: [],
    booklet_status: 'distributing'
  });

  useEffect(() => {
    // 認証チェック
    const authType = localStorage.getItem('ryoun_auth_type');
    if (authType !== 'hq') {
      navigate('/admin');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (groups.length > 0) {
      setBulkLock(groups.every(g => g.editing_locked));
      // 除外すべき管理者等がいれば適宜フィルタリングする（ここでは全団体対象）
      setIsAllClosed(groups.every(g => g.status === 'closed'));
    }
  }, [groups]);

  useEffect(() => {
    // 認証チェック済みであることを前提にデータ取得開始
    if (localStorage.getItem('ryoun_auth_type') !== 'hq') return;
    fetchData();
    fetchMessages();
    fetchAnnouncements();

    // リアルタイム購読の設定
    const channels = [
      // メッセージの購読
      supabase
        .channel('hq_messages')
        .on('postgres_changes', { event: 'INSERT', table: 'messages' }, (payload) => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender === 'group') {
            audioRef.current.play().catch(err => console.log('Audio play blocked:', err));
          }
        })
        .on('postgres_changes', { event: 'UPDATE', table: 'messages' }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        })
        .on('postgres_changes', { event: 'DELETE', table: 'messages' }, (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }),

      // 団体情報の購読
      supabase
        .channel('hq_groups')
        .on('postgres_changes', { event: '*', table: 'groups' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setGroups(prev => prev.map(g => g.id === payload.new.id ? payload.new : g));
          } else if (payload.eventType === 'INSERT') {
            setGroups(prev => [...prev, payload.new].sort((a, b) => a.login_id.localeCompare(b.login_id)));
          } else if (payload.eventType === 'DELETE') {
            setGroups(prev => prev.filter(g => g.id !== payload.old.id));
          }
        }),

      // 落とし物情報の購読
      supabase
        .channel('hq_lost_found')
        .on('postgres_changes', { event: '*', table: 'lost_found' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setLostFound(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
          } else if (payload.eventType === 'INSERT') {
            setLostFound(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setLostFound(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }),

      // お知らせの購読
      supabase
        .channel('hq_announcements')
        .on('postgres_changes', { event: '*', table: 'announcements' }, () => {
          fetchAnnouncements(); // 並び順が複雑なため再取得
        })
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
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

  const handleBroadcastMessage = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim() || sending || selectedBroadcastGroupIds.length === 0) {
      if (selectedBroadcastGroupIds.length === 0) alert('送信先団体を選択してください。');
      return;
    }

    requireConfirm(`選択された団体（${selectedBroadcastGroupIds.length}団体）にメッセージを配信してもよろしいですか？`, async () => {
      setSending(true);
      const targetGroups = groups.filter(g => selectedBroadcastGroupIds.includes(g.id));
      const messageData = targetGroups.map(g => ({
        group_id: g.id,
        sender: 'hq',
        content: broadcastMessage.trim(),
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('messages').insert(messageData);

      if (!error) {
        setBroadcastMessage('');
        setShowBroadcastModal(false);
        alert('一斉配信が完了しました。');
      } else {
        console.error('Broadcast error:', error);
        alert('メッセージの一斉配信に失敗しました。');
      }
      setSending(false);
    }, '配信する');
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

  const getStatusSummary = (g) => {
    return g.status === 'open' ? '受付中' : '受付終了';
  };

  const getStatusColorClass = (g) => {
    return g.status === 'closed' ? 'text-red-400' : 'text-green-400';
  };

  const getSpecialStatus = (g) => {
    if (g.department === '公演') {
      const allPerf = [...(g.performance_day1 || []), ...(g.performance_day2 || [])];
      if (allPerf.length === 0) return '公演情報なし';
      const distributing = allPerf.filter(p => p.status === 'distributing');
      if (distributing.length > 0) return `整理券配布中 (${distributing.length})`;
      const hasTicket = allPerf.some(p => p.status !== 'none');
      if (!hasTicket) return '整理券なし';
      return '整理券配布終了';
    }
    if (g.department === '冊子') {
      const statusMap = { distributing: '配布中', limited: '残りわずか', ended: '配布終了' };
      return statusMap[g.booklet_status] || '配布中';
    }
    if (g.department === '体験' || g.department === '食品') {
      return `${g.waiting_time}分待ち`;
    }
    return '-';
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

  const handleBulkLockSet = (nextLock) => {
    const msg = nextLock
      ? '全団体の編集を【ロック】しますか？'
      : '全団体の編集を【許可】しますか？';

    requireConfirm(msg, async () => {
      const { error } = await supabase
        .from('groups')
        .update({ editing_locked: nextLock })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (!error) {
        setBulkLock(nextLock);
      }
    }, nextLock ? 'ロックする' : '解除する');
  };

  const handleBulkStatusSet = (nextStatus) => {
    const msg = nextStatus === 'open'
      ? 'ぜ団体を【受付開始】にしますか？'
      : '全ての団体を【受付終了】にしますか？';

    requireConfirm(msg, async () => {
      const { error } = await supabase
        .from('groups')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) alert('一括ステータス変更に失敗しました。');
    }, nextStatus === 'open' ? '開始する' : '終了する');
  };

  const handleBulkLogout = () => {
    requireConfirm('全ての団体を強制ログアウトさせますか？', async () => {
      const { error } = await supabase
        .from('groups')
        .update({ last_reset_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) alert('一括ログアウトに失敗しました。');
    }, 'ログアウト');
  };

  const toggleGroupLock = (id, currentState, name) => {
    const msg = !currentState
      ? `「${name}」の編集を【禁止】しますか？`
      : `「${name}」の編集を【許可】しますか？`;

    requireConfirm(msg, async () => {
      await supabase
        .from('groups')
        .update({ editing_locked: !currentState })
        .eq('id', id);
    }, !currentState ? 'ロックする' : 'ロックを解除する');
  };


  const handleForceLogout = (groupId, name) => {
    requireConfirm(`「${name}」を強制ログアウトさせますか？`, async () => {
      const { error } = await supabase
        .from('groups')
        .update({ last_reset_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) {
        alert('失敗しました。');
      }
    }, 'ログアウト');
  };

  const handleToggleStatus = (group, nextStatus) => {
    const msg = nextStatus === 'open' ? `「${group.name}」の受付を開始しますか？` : `「${group.name}」の受付を終了しますか？`;
    requireConfirm(msg, async () => {
      const payload = {
        status: nextStatus,
        updated_at: new Date().toISOString()
      };

      if (group.department === '公演' && nextStatus === 'closed') {
        payload.performance_day1 = group.performance_day1?.map(p => ({ ...p, status: 'ended' }));
        payload.performance_day2 = group.performance_day2?.map(p => ({ ...p, status: 'ended' }));
      }

      const { error } = await supabase.from('groups').update(payload).eq('id', group.id);
      if (error) alert('更新に失敗しました。');
    }, nextStatus === 'open' ? '開始する' : '終了する');
  };

  const handleUpdateWaitingTime = async (groupId, time) => {
    const { error } = await supabase.from('groups').update({ waiting_time: time, updated_at: new Date().toISOString() }).eq('id', groupId);
    if (error) alert('待ち時間の更新に失敗しました。');
  };

  const handleUpdateBookletStatus = async (groupId, status) => {
    const { error } = await supabase.from('groups').update({ booklet_status: status, updated_at: new Date().toISOString() }).eq('id', groupId);
    if (error) alert('配布状況の更新に失敗しました。');
  };

  const handleUpdateAllPerformanceStatus = async (group, nextStatus) => {
    const payload = {
      performance_day1: (group.performance_day1 || []).map(p => ({ ...p, status: nextStatus })),
      performance_day2: (group.performance_day2 || []).map(p => ({ ...p, status: nextStatus })),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('groups').update(payload).eq('id', group.id);
    if (error) alert('更新に失敗しました。');
  };

  const handleUpdateSinglePerformanceStatus = async (group, day, time, nextStatus) => {
    const key = day === 1 ? 'performance_day1' : 'performance_day2';
    const newList = (group[key] || []).map(p =>
      p.time === time ? { ...p, status: nextStatus } : p
    );

    const { error } = await supabase
      .from('groups')
      .update({ [key]: newList, updated_at: new Date().toISOString() })
      .eq('id', group.id);

    if (error) alert('更新に失敗しました。');
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();

    // 受付終了時に公演整理券を自動的に「配布終了」にするロジック
    let finalPerfDay1 = groupFormData.performance_day1;
    let finalPerfDay2 = groupFormData.performance_day2;
    if (groupFormData.status === 'closed' && editingGroup.department === '公演') {
      finalPerfDay1 = groupFormData.performance_day1.map(p => ({ ...p, status: 'ended' }));
      finalPerfDay2 = groupFormData.performance_day2.map(p => ({ ...p, status: 'ended' }));
    }

    const { error } = await supabase
      .from('groups')
      .update({
        name: groupFormData.name,
        title: groupFormData.title,
        waiting_time: groupFormData.waiting_time,
        status: groupFormData.status,
        performance_day1: finalPerfDay1,
        performance_day2: finalPerfDay2,
        booklet_status: groupFormData.booklet_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingGroup.id);

    if (!error) {
      setShowGroupModal(false);
    }
  };

  const toggleStatusQuickly = async (g) => {
    const nextStatus = g.status === 'open' ? 'closed' : 'open';
    const msg = `「${g.name}」を【${nextStatus === 'open' ? '受付開始' : '受付終了'}】にしますか？`;

    requireConfirm(msg, async () => {
      let finalPerfDay1 = g.performance_day1 || [];
      let finalPerfDay2 = g.performance_day2 || [];
      if (nextStatus === 'closed' && g.department === '公演') {
        finalPerfDay1 = (g.performance_day1 || []).map(p => ({ ...p, status: 'ended' }));
        finalPerfDay2 = (g.performance_day2 || []).map(p => ({ ...p, status: 'ended' }));
      }

      await supabase
        .from('groups')
        .update({
          status: nextStatus,
          performance_day1: finalPerfDay1,
          performance_day2: finalPerfDay2,
          updated_at: new Date().toISOString()
        })
        .eq('id', g.id);
    }, nextStatus === 'open' ? '受付を開始する' : '受付を終了する');
  };

  const openGroupModal = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      title: group.title || '',
      waiting_time: group.waiting_time,
      status: group.status,
      performance_day1: group.performance_day1 || [],
      performance_day2: group.performance_day2 || [],
      booklet_status: group.booklet_status || 'distributing'
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
      // fetchData(); // 購読によって自動更新される
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

  const handleDeleteLost = (id, name) => {
    requireConfirm(`「${name}」のデータを削除しますか？`, async () => {
      await supabase.from('lost_found').delete().eq('id', id);
    }, '削除する');
  };

  const handleDeleteAnn = (id, title) => {
    requireConfirm(`「${title}」のお知らせを削除しますか？`, async () => {
      await supabase.from('announcements').delete().eq('id', id);
      fetchAnnouncements();
    }, '削除する');
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-ryoun-sky" /></div>;

  const formatJpDate = (ds) => {
    if (!ds) return '-';
    const d = new Date(ds);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 pt-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm transition-all hover:scale-105">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">本部管理ポータル</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { requireConfirm('ログアウトしますか？', () => { localStorage.clear(); navigate('/admin'); }, 'ログアウト') }}
            className="flex items-center space-x-2 px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm font-bold text-sm"
          >
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex p-1.5 bg-slate-100 rounded-3xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'groups', name: '団体管理', icon: Users },
            { id: 'lost', name: '落とし物', icon: PackageSearch },
            { id: 'messages', name: 'チャット', icon: MessageSquare },
            { id: 'announcements', name: 'お知らせ', icon: Megaphone },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-8 py-3.5 rounded-2xl transition-all text-sm font-black relative whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <tab.icon size={18} />
              <span>{tab.name}</span>
              {tab.id === 'messages' && messages.some(m => !m.is_read && m.sender === 'group') && (
                <span className="absolute top-2 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-100 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'groups' && (
        <div className="space-y-10">
          <div className="flex justify-between items-center gap-4 px-2">
            <div className="flex p-1 bg-slate-100 rounded-[2rem] border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`flex-1 md:flex-none px-8 py-3 rounded-2xl transition-all text-xs font-black whitespace-nowrap ${selectedDept === dept ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            {DEPARTMENTS.filter(d => d === selectedDept).map(dept => {
              const deptGroups = groups.filter(g => g.department === dept);
              if (deptGroups.length === 0) return null;

              return (
                <div key={dept} className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-6 bg-brand-600 rounded-full"></div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{dept}部門</h2>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                          <tr>
                            <th className="px-8 py-6 !text-left">クラス</th>
                            <th className="px-8 py-6 !text-left">タイトル</th>
                            <th className="px-8 py-6 text-center">受付状況</th>
                            {dept !== '展示' && (
                              <th className="px-8 py-6 text-center">
                                {dept === '公演' ? '整理券配布状況' : dept === '冊子' ? '配布状況' : '待ち時間'}
                              </th>
                            )}
                            <th className="px-8 py-6 text-center">編集ロック</th>
                            <th className="px-8 py-6 text-center">強制ログアウト</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {deptGroups.map(g => (
                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-6 !text-left">
                                <button
                                  onClick={() => openGroupModal(g)}
                                  className="text-slate-900 font-black hover:text-brand-600 transition-colors flex items-center gap-2 group/btn"
                                >
                                  <span>{g.name}</span>
                                  <Edit2 size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity text-brand-400" />
                                </button>
                              </td>
                              <td className="px-8 py-6 !text-left">
                                <span className="text-slate-600 font-bold">{g.title || <span className="text-slate-200 italic font-medium">タイトル未設定</span>}</span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center justify-center gap-4 text-center">
                                  <span className={`px-4 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all ${g.status === 'open'
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                    }`}>
                                    {g.status === 'open' ? '受付中' : '終了済'}
                                  </span>
                                  <button
                                    onClick={() => handleToggleStatus(g, g.status === 'open' ? 'closed' : 'open')}
                                    className="p-1 text-[11px] text-slate-400 font-bold hover:text-slate-600 transition-colors"
                                  >
                                    変更
                                  </button>
                                </div>
                              </td>
                              {dept !== '展示' && (
                                <td className="px-8 py-6">
                                  <div className="flex items-center justify-center gap-4 text-center">
                                    {(g.status === 'closed' && g.department !== '公演') ? (
                                      <span className="text-slate-300 font-black text-xs px-3">-</span>
                                    ) : (g.department === '体験' || g.department === '食品') ? (
                                      <select
                                        className="bg-slate-100 border border-slate-200 text-slate-900 font-black px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
                                        value={g.waiting_time}
                                        onChange={(e) => handleUpdateWaitingTime(g.id, parseInt(e.target.value))}
                                      >
                                        {Array.from({ length: 25 }, (_, i) => i * 5).map(time => (
                                          <option key={time} value={time}>{time} 分待ち</option>
                                        ))}
                                      </select>
                                    ) : g.department === '冊子' ? (
                                      <select
                                        className="bg-slate-100 border border-slate-200 text-slate-900 font-black px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
                                        value={g.booklet_status}
                                        onChange={(e) => handleUpdateBookletStatus(g.id, e.target.value)}
                                      >
                                        <option value="distributing">配布中</option>
                                        <option value="limited">残りわずか</option>
                                        <option value="ended">配布終了</option>
                                      </select>
                                    ) : (
                                      <div className="flex flex-col gap-3 py-1 min-w-[200px]">
                                        {[1, 2].map(day => {
                                          const dayPerf = day === 1 ? (g.performance_day1 || []) : (g.performance_day2 || []);
                                          if (dayPerf.length === 0) return null;
                                          return (
                                            <div key={day} className="space-y-1.5">
                                              <div className="flex items-center gap-2 px-1">
                                                <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{day}日目</span>
                                              </div>
                                              <div className="grid grid-cols-1 gap-1.5">
                                                {dayPerf.map((perf, pIdx) => (
                                                  <div key={`${day}-${perf.time}`} className="flex items-center gap-3 justify-between bg-white border border-slate-100 p-2 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all hover:border-brand-200">
                                                    <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">{perf.time}</span>
                                                    <select
                                                      className="bg-slate-50 border border-slate-100 text-slate-900 font-extrabold px-2 py-1 rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                                                      value={perf.status}
                                                      onChange={(e) => handleUpdateSinglePerformanceStatus(g, day, perf.time, e.target.value)}
                                                    >
                                                      <option value="none">なし</option>
                                                      <option value="distributing">配布中</option>
                                                      <option value="ended">終了</option>
                                                    </select>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                        {(g.performance_day1?.length === 0 && g.performance_day2?.length === 0) && (
                                          <span className="text-slate-300 font-black text-xs px-2 text-center py-4 border border-dashed border-slate-100 rounded-2xl">公演情報なし</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-4 text-center">
                                  <span className={`px-4 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all ${g.editing_locked
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                    {g.editing_locked ? 'ロック中' : '許可中'}
                                  </span>
                                  <button
                                    onClick={() => toggleGroupLock(g.id, g.editing_locked, g.name)}
                                    className="p-1 text-[11px] text-slate-400 font-bold hover:text-slate-600 transition-colors"
                                  >
                                    変更
                                  </button>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <button
                                  onClick={() => handleForceLogout(g.id, g.name)}
                                  className="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 bg-white border border-slate-100 shadow-sm transition-all hover:border-amber-100"
                                  title="強制ログアウト"
                                >
                                  <LogOut size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-6 mt-12 bg-slate-50 border border-slate-100 p-10 rounded-[2.5rem]">
            <div className="flex items-center space-x-3 text-slate-400 px-2 mb-2">
              <Settings size={20} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">全団体一括操作</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bulk Status Control */}
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                    {isAllClosed ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 tracking-tight">受付</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBulkStatusSet('open')}
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    開始
                  </button>
                  <button
                    onClick={() => handleBulkStatusSet('closed')}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    終了
                  </button>
                </div>
              </div>

              {/* Bulk Lock Control */}
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                    {bulkLock ? <Lock size={24} /> : <Unlock size={24} />}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 tracking-tight">編集ロック</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBulkLockSet(false)}
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    解除
                  </button>
                  <button
                    onClick={() => handleBulkLockSet(true)}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    ロック
                  </button>
                </div>
              </div>

              {/* Bulk Logout */}
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-6 md:mb-0">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                    <LogOut size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 tracking-tight">強制ログアウト</div>
                  </div>
                </div>
                <button
                  onClick={handleBulkLogout}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      <AnimatePresence>
        {showGroupModal && (() => {
          const currentGroup = groups.find(g => g.id === editingGroup?.id) || editingGroup;
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]" onClick={() => setShowGroupModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                    <Edit2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">編集</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{currentGroup?.name}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveGroup} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">タイトル</label>
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-700 font-bold">
                      {groupFormData.title || <span className="text-slate-300 italic">未設定</span>}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">設定</label>
                      <span className="text-[10px] px-3 py-1 rounded-full bg-brand-600 text-white font-black uppercase tracking-widest">
                        {currentGroup?.department}
                      </span>
                    </div>

                    {(currentGroup?.department === '体験' || currentGroup?.department === '食品') && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-400 font-black ml-1 uppercase">待ち時間</label>
                          <select
                            disabled={groupFormData.status === 'closed'}
                            className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-bold appearance-none"
                            value={groupFormData.waiting_time}
                            onChange={e => setGroupFormData({ ...groupFormData, waiting_time: parseInt(e.target.value) })}
                          >
                            {groupFormData.status === 'closed' ? (
                              <option value={groupFormData.waiting_time}>-</option>
                            ) : (
                              Array.from({ length: 25 }, (_, i) => i * 5).map(time => (
                                <option key={time} value={time}>{time} 分</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                    )}

                    {currentGroup?.department === '公演' && (
                      <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {[
                          { label: 'Part 1 (6/13)', key: 'performance_day1', filter: p => p.time < '13:00' },
                          { label: 'Part 2 (6/13)', key: 'performance_day1', filter: p => p.time >= '13:00' },
                          { label: 'Part 3 (6/14)', key: 'performance_day2', filter: p => true }
                        ].map((section, sIdx) => {
                          const items = groupFormData[section.key].filter(section.filter);
                          if (items.length === 0) return null;

                          return (
                            <div key={sIdx} className="space-y-3">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.label}</h4>
                              {items.map((perf) => {
                                // 元の配列におけるインデックスを特定
                                const originalIdx = groupFormData[section.key].findIndex(p => p.time === perf.time);
                                return (
                                  <div key={perf.time} className="space-y-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black text-slate-300">時間</span>
                                      <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 font-black w-24">
                                        {perf.time}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-black text-slate-300 uppercase">整理券配布状況</span>
                                      <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 font-bold outline-none focus:ring-1 focus:ring-brand-500"
                                        value={perf.status}
                                        onChange={(e) => {
                                          const newList = [...groupFormData[section.key]];
                                          newList[originalIdx] = { ...perf, status: e.target.value };
                                          setGroupFormData({ ...groupFormData, [section.key]: newList });
                                        }}
                                      >
                                        <option value="none">配布なし</option>
                                        <option value="distributing">配布中</option>
                                        <option value="ended">配布終了</option>
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {currentGroup?.department === '冊子' && (
                      <div className="space-y-4">
                        <label className="text-[10px] text-slate-400 font-black ml-1 uppercase">冊子配布状況</label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'distributing', label: '配布中' },
                            { id: 'limited', label: '残りわずか' },
                            { id: 'ended', label: '配布終了' }
                          ].map(st => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setGroupFormData({ ...groupFormData, booklet_status: st.id })}
                              className={`py-3 rounded-xl border font-black text-xs transition-all ${groupFormData.booklet_status === st.id
                                ? 'bg-amber-50 border-amber-200 text-amber-600'
                                : 'bg-white border-slate-100 text-slate-300'
                                }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 py-5 text-slate-400 font-black text-sm hover:text-slate-600 transition-colors">キャンセル</button>
                    <button type="submit" className="flex-2 btn-primary py-5 rounded-3xl font-black shadow-lg shadow-brand-500/10 text-lg">保存する</button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {activeTab === 'lost' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">落とし物一覧</h2>
            </div>
            <button
              onClick={() => openModal()}
              className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/10 hover:translate-y-[-2px] transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span>登録</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lostFound.map(item => (
              <div key={item.id} className="bg-white border border-slate-100 p-8 rounded-[2rem] flex flex-col group hover:border-brand-200 transition-all shadow-sm hover:shadow-md relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-2">
                    <h3 className="font-black text-slate-900 text-lg leading-tight">{item.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-brand-600 font-black tracking-widest bg-brand-50 px-3 py-1 rounded-full border border-brand-100 self-start">
                      <MapPin size={12} />
                      <span>{item.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(item)} className="p-2.5 text-slate-400 hover:text-brand-600 bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-brand-100"><RefreshCw size={14} /></button>
                    <button onClick={() => handleDeleteLost(item.id, item.name)} className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="space-y-4 mt-auto pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
                    <Clock size={12} />
                    <span>拾得: {formatJpDate(item.found_at)}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed italic line-clamp-2">“{item.features}”</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {showLostModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]" onClick={closeModal}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl relative"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                      <PackageSearch size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingItem ? '落とし物を修正' : '落とし物を登録'}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">落とし物登録</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveLost} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">品名</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold" value={lostData.name} onChange={e => setLostData({ ...lostData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">場所</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold" value={lostData.location} onChange={e => setLostData({ ...lostData, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">拾得日時</label>
                      <input type="datetime-local" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold" value={lostData.found_at} onChange={e => setLostData({ ...lostData, found_at: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">特徴</label>
                      <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold h-32 resize-none" value={lostData.features} onChange={e => setLostData({ ...lostData, features: e.target.value })}></textarea>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={closeModal} className="flex-1 py-5 text-slate-400 font-black text-sm hover:text-slate-600 transition-colors">キャンセル</button>
                      <button type="submit" className="flex-2 btn-primary py-5 rounded-3xl font-black shadow-lg shadow-brand-500/10 text-lg">保存する</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="flex flex-col md:flex-row h-[75vh] bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Sidebar */}
          <div className={`${selectedGroupId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-slate-100 bg-slate-50/30`}>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase">チャット</h2>
              </div>
              <button
                onClick={() => {
                  setSelectedBroadcastGroupIds(groups.map(g => g.id));
                  setShowBroadcastModal(true);
                }}
                className="w-10 h-10 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 hover:bg-brand-600 hover:text-white transition-all shadow-sm"
                title="一斉配信"
              >
                <Megaphone size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-1">
              {groups.map(g => {
                const unreadCount = messages.filter(m => m.group_id === g.id && m.sender === 'group' && !m.is_read).length;
                const lastMsg = [...messages].reverse().find(m => m.group_id === g.id);

                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full p-5 rounded-2xl flex items-center space-x-4 transition-all text-left ${selectedGroupId === g.id ? 'bg-white shadow-sm border border-slate-100 translate-x-1 ring-1 ring-brand-500/10' : 'hover:bg-slate-100/50 border border-transparent'
                      }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 grow-0 shrink-0">
                      <User size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-900 text-sm truncate">{g.name}</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] rounded-full font-black animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate font-medium">
                        {lastMsg ? lastMsg.content : <span className="text-slate-200">メッセージなし</span>}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${!selectedGroupId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white`}>
            {selectedGroupId ? (
              <>
                <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center space-x-4">
                    <button onClick={() => setSelectedGroupId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                      <ChevronLeft size={24} />
                    </button>
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-none">
                        {groups.find(g => g.id === selectedGroupId)?.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {groups.find(g => g.id === selectedGroupId)?.title || 'タイトル未設定'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">チャット中</span>
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth bg-slate-50/20 no-scrollbar"
                >
                  {messages.filter(m => m.group_id === selectedGroupId).map((msg, i) => (
                    <div key={msg.id || i} className={`flex ${msg.sender === 'hq' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] space-y-2 ${msg.sender === 'hq' ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-6 py-4 rounded-3xl text-sm font-bold shadow-sm ${msg.sender === 'hq'
                          ? 'bg-brand-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                          }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.sender === 'hq' && msg.is_read && (
                            <span className="text-brand-400">既読</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex items-center gap-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="メッセージを入力..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-sm font-bold transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/20 shrink-0"
                  >
                    {sending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={24} />}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                  <MessageSquare size={48} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">チャットする団体を選択してください</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">お知らせ一覧</h2>
            </div>
            <button
              onClick={() => openAnnModal()}
              className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/10 hover:translate-y-[-2px] transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span>新規作成</span>
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
                  <tr>
                    <th className="px-8 py-6 w-32 text-center">並び順変更</th>
                    <th className="px-8 py-6 w-20 text-center">ピン留め</th>
                    <th className="px-8 py-6">タイトル</th>
                    <th className="px-8 py-6">投稿日</th>
                    <th className="px-8 py-6 text-right">編集</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {announcements.map((ann, idx) => (
                    <tr key={ann.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={() => moveAnnouncement(ann.id, 'up')}
                            className="p-2 text-slate-300 hover:text-brand-600 disabled:opacity-0 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-100"
                          >
                            <ChevronUp size={20} />
                          </button>
                          <button
                            disabled={idx === announcements.length - 1}
                            onClick={() => moveAnnouncement(ann.id, 'down')}
                            className="p-2 text-slate-300 hover:text-brand-600 disabled:opacity-0 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-100"
                          >
                            <ChevronDown size={20} />
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {ann.is_pinned ? (
                          <div className="w-8 h-8 mx-auto bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100">
                            <Megaphone size={14} className="fill-amber-500/20" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-200">-</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm mb-1">{ann.title}</span>
                          <span className="text-[11px] text-slate-400 font-medium line-clamp-1 max-w-sm whitespace-normal">{ann.content}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[11px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">{ann.date}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 transition-all">
                          <button
                            onClick={() => openAnnModal(ann)}
                            className="p-3 text-slate-400 hover:text-brand-600 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all hover:border-brand-100"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAnn(ann.id, ann.title)}
                            className="p-3 text-slate-400 hover:text-rose-500 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all hover:border-rose-100"
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
        </div>
      )}

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]" onClick={() => setShowAnnModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-white w-full max-w-2xl p-10 rounded-[3rem] shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingAnn ? 'お知らせを編集' : 'お知らせを新規作成'}</h2>
                </div>
              </div>

              <form onSubmit={handleSaveAnn} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">タイトル</label>
                  <input
                    type="text" required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold"
                    value={annData.title} onChange={e => setAnnData({ ...annData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">投稿日付</label>
                    <input
                      type="date" required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold"
                      value={annData.date} onChange={e => setAnnData({ ...annData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 cursor-pointer hover:bg-slate-100 transition-all">
                      <input
                        type="checkbox"
                        className="w-6 h-6 rounded-lg border-slate-200 text-brand-600 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                        checked={annData.is_pinned}
                        onChange={e => setAnnData({ ...annData, is_pinned: e.target.checked })}
                      />
                      <span className="text-sm font-black text-slate-900 uppercase tracking-widest">重要（ピン留め）</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">配信内容</label>
                  <textarea
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold h-48 resize-none leading-relaxed"
                    value={annData.content} onChange={e => setAnnData({ ...annData, content: e.target.value })}
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAnnModal(false)} className="flex-1 py-5 text-slate-400 font-black text-sm hover:text-slate-600 transition-colors">キャンセル</button>
                  <button type="submit" className="flex-2 btn-primary py-5 rounded-3xl font-black shadow-lg shadow-brand-500/10 text-lg">
                    {editingAnn ? '更新を保存する' : '投稿'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]" onClick={() => setShowBroadcastModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-white w-full max-w-2xl p-10 rounded-[3rem] shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">メッセージ一斉配信</h2>
                </div>
              </div>

              <form onSubmit={handleBroadcastMessage} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">送信先（{selectedBroadcastGroupIds.length} 団体）</label>
                    <div className="flex gap-4 text-[11px] font-black uppercase tracking-widest">
                      <button type="button" onClick={() => setSelectedBroadcastGroupIds(groups.map(g => g.id))} className="text-brand-600 hover:text-brand-700">すべて</button>
                      <button type="button" onClick={() => setSelectedBroadcastGroupIds([])} className="text-slate-400 hover:text-slate-600">解除</button>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 max-h-48 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-3 gap-2">
                    {groups.map(g => (
                      <label key={g.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-3 rounded-xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded-lg border-slate-200 text-brand-600 focus:ring-0 cursor-pointer"
                          checked={selectedBroadcastGroupIds.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBroadcastGroupIds(prev => [...prev, g.id]);
                            } else {
                              setSelectedBroadcastGroupIds(prev => prev.filter(id => id !== g.id));
                            }
                          }}
                        />
                        <span className="text-[11px] text-slate-600 font-black truncate">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">メッセージ内容</label>
                  <textarea
                    required
                    placeholder="メッセージ内容を入力してください"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-bold h-40 resize-none leading-relaxed text-sm"
                    value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)}
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowBroadcastModal(false)} className="flex-1 py-5 text-slate-400 font-black text-sm hover:text-slate-600 transition-colors">キャンセル</button>
                  <button type="submit" disabled={sending || !broadcastMessage.trim()} className="flex-2 btn-primary py-5 rounded-3xl font-black shadow-lg shadow-brand-500/10 text-lg disabled:opacity-50 transition-all">
                    {sending ? '送信中...' : '一斉配信する'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/80 backdrop-blur-xl w-full max-w-md p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white text-center space-y-10 relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 via-amber-400 to-rose-400"></div>

              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto relative group"
              >
                <div className="absolute inset-0 bg-rose-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <AlertCircle size={48} strokeWidth={2.5} className="relative z-10" />
              </motion.div>

              <div className="flex flex-col items-center space-y-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight whitespace-pre-line leading-snug text-center">
                  {confirmDialog.message}
                </h2>
                <div className="w-12 h-1 bg-slate-100 rounded-full"></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center items-center">
                <button
                  onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                  className="flex-1 py-5 px-8 rounded-3xl text-slate-500 hover:text-slate-900 font-black text-sm transition-all hover:bg-slate-100/50 active:scale-95"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                  }}
                  className="flex-2 bg-slate-900 text-white py-5 px-10 rounded-3xl font-black text-sm shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:translate-y-[-2px] active:scale-95"
                >
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
