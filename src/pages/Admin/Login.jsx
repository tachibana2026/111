import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { User, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin = () => {
  const [groupId, setGroupId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const groupId = localStorage.getItem('ryoun_group_id');
    const authType = localStorage.getItem('ryoun_auth_type');
    if (groupId && authType === 'group') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Supabaseのgroupsテーブルから、IDとパスワードが一致するものを探す
      const { data, error: dbError } = await supabase
        .from('groups')
        .select('id, login_id')
        .eq('login_id', groupId)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        throw new Error('団体IDまたはパスワードが正しくありません。');
      }

      // ログイン成功：IDを保存してダッシュボードへ
      localStorage.setItem('ryoun_auth_type', 'group');
      localStorage.setItem('ryoun_group_id', data.id); // UUIDを保存
      localStorage.setItem('ryoun_login_at', new Date().toISOString()); // ログイン時刻を保存
      navigate('/admin/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-ryoun-sky/20 text-ryoun-sky rounded-2xl flex items-center justify-center mx-auto mb-4 border border-ryoun-sky/30">
            <User size={32} />
          </div>
          <h1 className="text-2xl font-bold">団体ログイン</h1>
          <p className="text-white/40 text-sm">企画情報の更新を行います</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase ml-1">団体ID</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-ryoun-sky/50 outline-none transition-all"
                placeholder="G-123"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase ml-1">パスワード</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-ryoun-sky/50 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center space-x-2 py-4"
          >
            <span>ログイン</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="pt-4 text-center">
           <p className="text-[10px] text-white/20 font-light tracking-widest leading-relaxed">
             ログインできない場合は実行委員会（本部）まで<br />お問い合わせください。
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
