import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle2, XCircle, LogOut, Lock, RefreshCw,
  Save, Check, MessageSquare, Send, User, Shield, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const GroupDashboard = () => {
  const [group, setGroup] = useState(null);
  const [tempTime, setTempTime] = useState(0);
  const [tempStatus, setTempStatus] = useState('open'); // ステータスの下書き用
  const [tempPerfDay1, setTempPerfDay1] = useState([]);
  const [tempPerfDay2, setTempPerfDay2] = useState([]);
  const [tempBookletStatus, setTempBookletStatus] = useState('distributing');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    icon: null,
    onConfirm: null,
    confirmText: '実行する'
  });

  const requireConfirm = (message, onConfirm, icon = <Shield size={32} />, confirmText = '実行する') => {
    setConfirmDialog({ isOpen: true, message, icon, onConfirm, confirmText });
  };

  const scrollRef = useRef(null);
  const activeTabRef = useRef(activeTab);
  const audioRef = useRef(new Audio(`${import.meta.env.BASE_URL}notification.mp3`));
  const navigate = useNavigate();

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const groupId = useRef(localStorage.getItem('ryoun_group_id')).current;
  const authType = useRef(localStorage.getItem('ryoun_auth_type')).current;

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ryoun_auth_type');
    localStorage.removeItem('ryoun_group_id');
    navigate('/admin');
  }, [navigate]);

  const confirmLogout = () => {
    requireConfirm('ログアウトしますか？', handleLogout, <LogOut size={32} />, 'ログアウト');
  };

  useEffect(() => {
    if (!groupId || authType !== 'group') {
      navigate('/admin');
      return;
    }
    fetchGroupData();
    fetchMessages();

    // グループ情報の購読
    const groupSub = supabase
      .channel(`group_${groupId}`)
      .on('postgres_changes', { event: 'UPDATE', table: 'groups', filter: `id=eq.${groupId}` }, (payload) => {
        // 強制ログアウトチェック
        const loginAt = localStorage.getItem('ryoun_login_at');
        if (payload.new.last_reset_at && loginAt && new Date(payload.new.last_reset_at) > new Date(loginAt)) {
          handleLogout();
          return;
        }

        setGroup(payload.new);
        setTempTime(payload.new.waiting_time);
        setTempStatus(payload.new.status);
        setTempPerfDay1(payload.new.performance_day1 || []);
        setTempPerfDay2(payload.new.performance_day2 || []);
        setTempBookletStatus(payload.new.booklet_status || 'distributing');
      })
      .subscribe();

    const msgSub = supabase
      .channel(`msgs_${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        table: 'messages',
        filter: `group_id=eq.${groupId}`
      }, (payload) => {
        // 自分の送信したメッセージは handleSendMessage で追加済みなので、
        // 重複を避けるために自分以外（本部）からのメッセージのみ追加する
        // または、全ての挿入を購読するが、IDが既存のものなら無視するようにする
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });

        if (payload.new.sender === 'hq') {
          audioRef.current.play().catch(err => console.log('Audio play blocked:', err));
          if (activeTabRef.current !== 'chat') {
            setUnreadCount(c => c + 1);
          } else {
            markAsRead();
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        table: 'messages',
        filter: `group_id=eq.${groupId}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(groupSub);
      supabase.removeChannel(msgSub);
    };
  }, [groupId, navigate, handleLogout]); // activeTab を削除

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
      if (unreadCount > 0) markAsRead();
    }
  }, [activeTab, messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      const unread = data.filter(m => m.sender === 'hq' && !m.is_read).length;
      setUnreadCount(unread);
    }
  };

  const markAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('group_id', groupId)
      .eq('sender', 'hq')
      .eq('is_read', false);
    setUnreadCount(0);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    
    // 処理中... を最低でも1秒表示するためのタイマー
    const minWait = new Promise(resolve => setTimeout(resolve, 1500));

    const { data, error } = await supabase.from('messages').insert([{
      group_id: groupId,
      sender: 'group',
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    }]).select().single();

    await minWait;

    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } else if (error) {
      console.error('Send error:', error);
      alert('メッセージの送信に失敗しました。SQLが正しく実行されているか確認してください。');
    }
    setSending(false);
  };

  const fetchGroupData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();

    if (error || !data) {
      localStorage.removeItem('ryoun_group_id');
      navigate('/admin');
    } else {
      // 強制ログアウトチェック
      const loginAt = localStorage.getItem('ryoun_login_at');
      if (data.last_reset_at && loginAt && new Date(data.last_reset_at) > new Date(loginAt)) {
        handleLogout();
        return;
      }

      setGroup(data);
      setTempTime(data.waiting_time);
      setTempStatus(data.status);
      setTempPerfDay1(data.performance_day1 || []);
      setTempPerfDay2(data.performance_day2 || []);
      setTempBookletStatus(data.booklet_status || 'distributing');
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (group.editing_locked || updating) return;

    setUpdating(true);
    
    // 処理中... を最低でも1.5秒表示
    const minWait = new Promise(resolve => setTimeout(resolve, 1500));

    // 受付終了時に公演整理券を自動的に「配布終了」にするロジック
    let finalPerfDay1 = tempPerfDay1;
    let finalPerfDay2 = tempPerfDay2;
    if (tempStatus === 'closed' && group.department === '公演') {
      finalPerfDay1 = tempPerfDay1.map(p => ({ ...p, status: 'ended' }));
      finalPerfDay2 = tempPerfDay2.map(p => ({ ...p, status: 'ended' }));
    }

    const { error } = await supabase
      .from('groups')
      .update({
        status: tempStatus,
        waiting_time: tempStatus === 'closed' ? group.waiting_time : tempTime,
        performance_day1: finalPerfDay1,
        performance_day2: finalPerfDay2,
        booklet_status: tempBookletStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    await minWait;

    if (error) {
      alert('更新に失敗しました。');
    } else {
      setShowSuccess(true);
      // 自動更新後のデータとステートを同期
      if (tempStatus === 'closed' && group.department === '公演') {
        setTempPerfDay1(finalPerfDay1);
        setTempPerfDay2(finalPerfDay2);
      }
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setUpdating(false);
  };

  const getStatusSummary = () => {
    if (!group) return '';
    if (group.department === '冊子') {
      const statusMap = { distributing: '配布中', limited: '残りわずか', ended: '配布終了' };
      return statusMap[tempBookletStatus] || '配布中';
    }
    if (group.department === '公演') {
      return tempStatus === 'closed' ? '受付終了' : '公演中/準備中';
    }
    if (group.department === '展示') {
      return tempStatus === 'open' ? '受付中' : '受付終了';
    }
    return tempStatus === 'open' ? `${tempTime}分待ち` : '受付終了';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 pt-6 px-4">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-xl flex items-center space-x-3 font-black"
          >
            <Check size={24} strokeWidth={3} /><span>更新しました</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-brand-600 rounded-full"></div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{group.title || group.name}</h1>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-black uppercase tracking-wider">{group.name}</span>
          </div>
        </div>
        <button
          onClick={confirmLogout}
          className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-white text-brand-700 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 font-bold'
            }`}
        >
          <RefreshCw size={18} />
          <span>更新</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl transition-all relative ${activeTab === 'chat' ? 'bg-white text-brand-700 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 font-bold'
            }`}
        >
          <MessageSquare size={18} />
          <span>チャット</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[11px] flex items-center justify-center rounded-full font-black border-4 border-slate-100 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-8">
          {group.editing_locked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 border border-rose-100 p-8 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-sm"
            >
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                <Lock size={28} />
              </div>
              <div className="space-y-1">
                <h2 className="font-black text-rose-700 text-lg">編集権限なし</h2>
                <p className="text-rose-600/60 text-xs font-bold leading-relaxed">
                  現在、本部より情報の更新が制限されています。<br />
                  不明点はチャットにて問い合わせください。
                </p>
              </div>
            </motion.div>
          )}

          {/* Current Public Status */}
          <section className="bg-white border border-slate-100 p-10 rounded-3xl text-center space-y-6 shadow-sm">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse"></div>
                現在公開中の情報
              </span>
              <div className={`text-6xl font-black tracking-tight ${(group.department === '冊子' && tempBookletStatus === 'ended') || (group.department !== '冊子' && tempStatus === 'closed')
                  ? 'text-rose-500' : 'text-emerald-500'}`}>
                {getStatusSummary()}
              </div>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                <Clock size={12} />
                最終更新: {new Date(group.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </section>

          {/* Editor UI */}
          <div className={`space-y-6 ${group.editing_locked ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center gap-3">
                    <Save size={20} className="text-slate-400" />
                    <label className="text-sm font-black text-slate-900 uppercase tracking-tight">内容の更新</label>
                  </div>
                  <span className="text-[10px] px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-bold uppercase tracking-wider">
                    {group.department}
                  </span>
                </div>



                {/* --- 1. Experience & Food (WAITING TIME) --- */}
                {(group.department === '体験' || group.department === '食品') && (
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    {/* Waiting Time Dropdown */}
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">待ち時間を選択</label>
                      <select
                        disabled={tempStatus === 'closed'}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 outline-none text-slate-700 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-xl font-bold appearance-none cursor-pointer ${tempStatus === 'closed' ? 'opacity-30' : ''}`}
                        value={tempStatus === 'closed' ? 'closed' : tempTime}
                        onChange={(e) => setTempTime(parseInt(e.target.value))}
                      >
                        {tempStatus === 'closed' ? (
                          <option value="closed">選択不可</option>
                        ) : (
                          Array.from({ length: 25 }, (_, i) => i * 5).map(time => (
                            <option key={time} value={time}>
                              {time} 分待ち
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {/* --- 2. Performance (SCHEDULES) --- */}
                {group.department === '公演' && (
                  <div className="space-y-10 pt-4 border-t border-slate-50">
                    {[
                      { label: 'Part 1 (6/13)', key: 'tempPerfDay1', state: tempPerfDay1, setter: setTempPerfDay1, filter: p => p.time < '13:00' },
                      { label: 'Part 2 (6/13)', key: 'tempPerfDay1', state: tempPerfDay1, setter: setTempPerfDay1, filter: p => p.time >= '13:00' },
                      { label: 'Part 3 (6/14)', key: 'tempPerfDay2', state: tempPerfDay2, setter: setTempPerfDay2, filter: p => true }
                    ].map((section, sIdx) => {
                      const items = section.state.filter(section.filter);
                      if (items.length === 0) return null;

                      return (
                        <div key={sIdx} className="space-y-5">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-slate-200 rounded-full"></div>
                            <h3 className="text-sm font-black text-slate-700">{section.label}</h3>
                          </div>
                          <div className="space-y-3">
                            {items.map((perf) => {
                              const originalIdx = section.state.findIndex(p => p.time === perf.time);
                              return (
                                <div key={perf.time} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 group/item">
                                  <div className="flex items-center gap-3 min-w-[120px]">
                                    <span className="text-[10px] font-black text-slate-300">時間</span>
                                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-base font-bold text-slate-400 flex items-center gap-1 min-w-[140px] shadow-sm">
                                      <span>{perf.time}</span>
                                      {perf.end_time && <span className="text-slate-300 font-medium">〜 {perf.end_time}</span>}
                                    </div>
                                  </div>
                                  <div className="flex-1 flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight whitespace-nowrap">整理券状況</span>
                                    <select
                                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/10 shadow-sm appearance-none"
                                      value={perf.status}
                                      onChange={(e) => {
                                        const newSchedule = [...section.state];
                                        newSchedule[originalIdx] = { ...perf, status: e.target.value };
                                        section.setter(newSchedule);
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
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* --- 3. Booklet (DISTRIBUTION STATUS) --- */}
                {group.department === '冊子' && (
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">配布状況を選択</label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'distributing', label: '配布中', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 shadow-sm' },
                        { id: 'limited', label: '残りわずか', color: 'text-amber-600 bg-amber-50 border-amber-200 shadow-sm' },
                        { id: 'ended', label: '配布終了', color: 'text-rose-600 bg-rose-50 border-rose-200 shadow-sm' }
                      ].map(status => (
                        <button
                          key={status.id}
                          onClick={() => setTempBookletStatus(status.id)}
                          className={`py-5 rounded-2xl border transition-all font-black text-lg ${tempBookletStatus === status.id ? status.color : 'bg-slate-50 border-slate-100 text-slate-300'
                            }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="w-full btn-primary h-16 flex items-center justify-center space-x-3 shadow-lg shadow-brand-500/10"
                >
                  {updating ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      <span className="text-xl font-black italic">処理中...</span>
                    </>
                  ) : (
                    <>
                      <Save size={24} />
                      <span className="text-xl font-black">更新内容を保存</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Chat UI */
        <div className="flex flex-col h-[70vh] bg-slate-100 rounded-3xl border border-slate-200 shadow-inner overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
                <Shield size={18} />
              </div>
              <span className="font-black text-sm text-slate-900">文化委員会 本部</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                  <MessageSquare size={40} className="text-slate-100" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">本部とチャットを開始</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.sender === 'group' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%] space-y-1.5">
                    <div className={`px-5 py-3.5 rounded-2xl text-sm font-bold shadow-sm ${msg.sender === 'group'
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-50'
                      }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] text-slate-400 font-bold ${msg.sender === 'group' ? 'justify-end' : 'justify-start'}`}>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.sender === 'group' && msg.is_read && (
                        <span className="text-[9px] text-brand-500 bg-brand-50 px-1 rounded">既読</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-200 flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-sm text-slate-700 font-bold placeholder:text-slate-300"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-50 transition-all hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-95"
            >
              {sending ? <RefreshCw className="animate-spin" size={24} /> : <Send size={24} />}
            </button>
          </form>
        </div>
      )}

      {/* Custom Confirm Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/80 backdrop-blur-xl w-full max-w-md p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white text-center space-y-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 via-sky-400 to-brand-400"></div>

              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-24 h-24 bg-brand-500/10 text-brand-600 rounded-[2.5rem] flex items-center justify-center mx-auto relative group"
              >
                <div className="absolute inset-0 bg-brand-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  {confirmDialog.icon || <Shield size={48} strokeWidth={2.5} />}
                </div>
              </motion.div>

              <div className="flex flex-col items-center space-y-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight whitespace-pre-line leading-tight text-center">
                  {confirmDialog.message}
                </h2>
                <div className="w-12 h-1 bg-slate-100 rounded-full"></div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-4 w-full">
                <button
                  onClick={() => {
                    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                  }}
                  className="w-full max-w-[280px] bg-slate-900 text-white py-5 rounded-3xl font-black text-sm shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:translate-y-[-2px] active:scale-95"
                >
                  {confirmDialog.confirmText}
                </button>
                <button
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="w-full max-w-[280px] py-5 text-slate-400 hover:text-slate-600 font-black text-sm transition-all active:scale-95"
                >
                  キャンセル
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupDashboard;
