import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { User, Lock, ArrowRight, ShieldAlert, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin = () => {
  const [groupId, setGroupId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { message } = router.query;
    if (message === 'timeout') {
      setError('セッションが切れました。再度ログインしてください。');
    }

    const authType = localStorage.getItem('ryoun_auth_type');
    const groupIdSaved = localStorage.getItem('ryoun_group_id');

    if (router.pathname === '/admin' || router.pathname === '/Admin') {
      if (authType === 'hq') {
        router.replace('/admin/hq');
      } else if (authType === 'group' && groupIdSaved) {
        router.replace('/admin/dashboard');
      }
    }
  }, [router, router.query]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    // 最低待ち時間
    const minWait = new Promise(resolve => setTimeout(resolve, 1500));

    // 1. 本部ログインの試行 (Supabase Auth)
    try {
      if (groupId.includes('@')) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: groupId,
          password: password,
        });

        if (!authError && authData.user) {
          await minWait;
          localStorage.setItem('ryoun_auth_type', 'hq');
          router.push('/admin/hq');
          setLoading(false);
          return;
        }
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
      localStorage.setItem('ryoun_password', password); // パスワードを保存（RPC用）
      localStorage.setItem('ryoun_login_at', new Date().toISOString()); // ログイン時刻を保存
      router.push('/admin/dashboard');

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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-white border border-slate-100 p-10 md:p-12 rounded-[3.5rem] shadow-sm space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-brand-100 shadow-sm transition-transform hover:scale-105 active:rotate-3">
            <User size={48} strokeWidth={2.5} />
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
              <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-600 transition-colors pointer-events-none" size={22} />
                <input
                  type="text"
                  required
                  placeholder="IDを入力"
                  autoComplete="username"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-16 pr-8 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-slate-700 font-bold placeholder:text-slate-300"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-600 transition-colors pointer-events-none" size={22} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-16 pr-14 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-slate-700 font-bold placeholder:text-slate-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-2 transition-colors outline-none"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-rose-600 bg-rose-50 p-5 rounded-3xl text-sm border border-rose-100 font-bold text-center"
            >
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-20 shadow-brand-600/10"
          >
            {loading ? (
              <div className="flex items-center space-x-4">
                <RefreshCw className="animate-spin" size={28} />
                <span className="text-xl font-black">認証中...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-4 group">
                <span className="text-xl font-black">ログイン</span>
                <ArrowRight size={26} className="transition-transform group-hover:translate-x-2" />
              </div>
            )}
          </button>
        </form>

        <div className="pt-8 text-center border-t border-slate-50">
          <p className="text-[11px] text-slate-400 font-bold tracking-tight leading-relaxed">
            ログインできない場合は<br />
            <span className="text-brand-600">文化委員会本部 (東館201)</span> までお越しください。
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
