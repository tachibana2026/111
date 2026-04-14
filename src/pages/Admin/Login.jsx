import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { User, Lock, ArrowRight, ShieldAlert, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin = () => {
  const [groupId, setGroupId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authType = localStorage.getItem('ryoun_auth_type');
    const groupIdSaved = localStorage.getItem('ryoun_group_id');

    if (authType === 'hq') {
      navigate('/ryoun-hq-portal/dashboard', { replace: true });
    } else if (authType === 'group' && groupIdSaved) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    // 最低待ち時間
    const minWait = new Promise(resolve => setTimeout(resolve, 1500));

    // 1. 本部ログインの試行 (Supabase Auth)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: groupId,
        password: password,
      });

      if (!authError && authData.user) {
        await minWait;
        localStorage.setItem('ryoun_auth_type', 'hq');
        navigate('/ryoun-hq-portal/dashboard');
        setLoading(false);
        return;
      }
    } catch (err) {
      // Auth認証失敗時は団体ログインのチェックへ
    }

    try {
      // 2. 団体ログインの試行 (groupsテーブル)
      const { data, error: dbError } = await supabase
        .from('groups')
        .select('id, login_id')
        .eq('login_id', groupId)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        throw new Error('IDまたはパスワードが正しくありません。');
      }

      await minWait;
      // ログイン成功：IDを保存してダッシュボードへ
      localStorage.setItem('ryoun_auth_type', 'group');
      localStorage.setItem('ryoun_group_id', data.id); // UUIDを保存
      localStorage.setItem('ryoun_login_at', new Date().toISOString()); // ログイン時刻を保存
      navigate('/admin/dashboard');

    } catch (err) {
      await minWait;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-slate-100 p-8 md:p-10 rounded-3xl shadow-sm space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-100 shadow-sm transition-transform hover:scale-105">
            <User size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">管理画面ログイン</h1>
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">待ち時間、整理券などの情報を編集できます</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ログインID</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-600 transition-colors" size={20} />
              <input
                type="text"
                required
                placeholder="IDを入力"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-4.5 pl-14 pr-6 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-slate-700 font-bold placeholder:text-slate-200"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-600 transition-colors" size={20} />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-4.5 pl-14 pr-6 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-slate-700 font-bold placeholder:text-slate-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-3 text-rose-600 bg-rose-50 p-5 rounded-xl text-sm border border-rose-100 font-bold"
            >
              <ShieldAlert size={20} strokeWidth={2.5} />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-16 flex items-center justify-center space-x-3"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={24} />
                <span className="text-lg font-black italic">処理中...</span>
              </>
            ) : (
              <>
                <span className="text-lg font-black">ログイン</span>
                <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="pt-8 text-center border-t border-slate-50">
          <p className="text-[11px] text-slate-400 font-bold tracking-tight leading-relaxed">
            ログインできない場合は<br />
            <span className="text-brand-600">本部 (仮校舎2F)</span> までお越しください。
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
