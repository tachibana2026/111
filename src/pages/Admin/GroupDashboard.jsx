import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, XCircle, LogOut, Lock, RefreshCw, 
  Save, Check, MessageSquare, Send, User, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const GroupDashboard = () => {
  const [group, setGroup] = useState(null);
  const [tempTime, setTempTime] = useState(0); 
  const [tempStatus, setTempStatus] = useState('open'); // ステータスの下書き用
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef(null);
  const activeTabRef = useRef(activeTab);
  const audioRef = useRef(new Audio('/notification.mp3'));
  const navigate = useNavigate();

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const groupId = localStorage.getItem('ryoun_group_id');
  const authType = localStorage.getItem('ryoun_auth_type');

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
  }, [groupId, navigate]); // activeTab を削除

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
    const { data, error } = await supabase.from('messages').insert([{
      group_id: groupId,
      sender: 'group',
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
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (group.editing_locked) return;
    
    setUpdating(true);
    const { error } = await supabase
      .from('groups')
      .update({ 
        status: tempStatus, 
        waiting_time: tempStatus === 'closed' ? group.waiting_time : tempTime, // 受付終了時は待ち時間を保持
        updated_at: new Date().toISOString() 
      })
      .eq('id', groupId);

    if (error) {
       alert('更新に失敗しました。');
    } else {
       setShowSuccess(true);
       setTimeout(() => setShowSuccess(false), 3000);
    }
    setUpdating(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ryoun_auth_type');
    localStorage.removeItem('ryoun_group_id');
    navigate('/admin');
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-ryoun-sky" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-32 pt-4 px-4">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
             initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
             className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 font-bold"
          >
            <Check size={20} /><span>更新しました！</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-white/40 text-xs">運用管理ツール</p>
        </div>
        <button onClick={handleLogout} className="p-3 bg-white/5 rounded-xl text-white/30 hover:text-red-400">
          <LogOut size={20} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'bg-ryoun-sky text-ryoun-dark font-bold' : 'text-white/40'
          }`}
        >
          <RefreshCw size={18} />
          <span>状況更新</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all relative ${
            activeTab === 'chat' ? 'bg-ryoun-sky text-ryoun-dark font-bold' : 'text-white/40'
          }`}
        >
          <MessageSquare size={18} />
          <span>本部連絡</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-ryoun-dark">
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
              className="bg-red-500/10 border border-red-500/30 p-6 rounded-3xl flex flex-col items-center text-center space-y-3 shadow-xl shadow-red-500/5"
            >
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
                <Lock size={24} />
              </div>
              <div>
                <h2 className="font-bold text-red-400">編集が制限されています</h2>
                <p className="text-red-400/60 text-[11px] mt-1 leading-relaxed">
                  現在、本部（実行委員会）により情報の更新が制限されています。<br />
                  解除が必要な場合や不明点がある場合は、本部までお問い合わせください。
                </p>
              </div>
            </motion.div>
          )}

          {/* Current Public Status */}
          <section className="glass-card p-8 border-t-4 border-t-ryoun-sky text-center space-y-4">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">現在の公開情報</h2>
            <div className="flex flex-col items-center">
               <div className={`text-5xl font-bold mb-2 ${group.status === 'open' ? 'text-green-400' : 'text-red-400'}`}>
                 {group.status === 'open' ? `${group.waiting_time}分` : '受付終了'}
               </div>
               <p className="text-white/20 text-[10px]">最終更新: {new Date(group.updated_at).toLocaleTimeString()}</p>
            </div>
          </section>

          {/* Editor UI */}
          <div className={`space-y-6 ${group.editing_locked ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5 space-y-4">
                <label className="text-xs font-semibold text-white/40 uppercase">編集（下書き）</label>
                
                {/* Toggle Button (Local State Only) */}
                <button
                  onClick={() => setTempStatus(tempStatus === 'open' ? 'closed' : 'open')}
                  className={`w-full py-5 rounded-xl flex items-center justify-center space-x-3 transition-all font-bold ${
                    tempStatus === 'open' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {tempStatus === 'open' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  <span>{tempStatus === 'open' ? '受付中' : '受付終了'}</span>
                </button>

                {/* Waiting Time Dropdown */}
                <div className="space-y-2">
                  <select
                    disabled={tempStatus === 'closed'}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none text-white focus:ring-2 focus:ring-ryoun-sky/50 transition-all text-lg ${tempStatus === 'closed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    value={tempStatus === 'closed' ? 'closed' : tempTime}
                    onChange={(e) => setTempTime(parseInt(e.target.value))}
                  >
                    {tempStatus === 'closed' ? (
                      <option value="closed">受付終了（案内なし）</option>
                    ) : (
                      Array.from({ length: 37 }, (_, i) => i * 5).map(time => (
                        <option key={time} value={time} className="bg-ryoun-dark">
                          {time} 分待ち
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              
              <div className="p-4 bg-white/5">
                 <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="w-full btn-primary py-4 flex items-center justify-center space-x-2"
                  >
                    {updating ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    <span className="text-lg font-bold">この内容で更新する</span>
                  </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Chat UI */
        <div className="flex flex-col h-[65vh] bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center space-x-2">
            <Shield size={16} className="text-ryoun-sky" />
            <span className="font-bold text-sm">実行委員会 本部</span>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-2">
                <MessageSquare size={48} />
                <p className="text-xs">本部への質問や連絡事項を入力してください</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div 
                  key={msg.id || i}
                  className={`flex ${msg.sender === 'group' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] space-y-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm ${
                      msg.sender === 'group' 
                        ? 'bg-ryoun-sky text-ryoun-dark font-medium rounded-tr-none' 
                        : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center space-x-1 text-[9px] text-white/30 ${msg.sender === 'group' ? 'justify-end' : 'justify-start'}`}>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.sender === 'group' && msg.is_read && (
                        <span className="font-bold text-ryoun-dark/60">
                          既読
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/5 flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
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
        </div>
      )}
    </div>
  );
};

export default GroupDashboard;
