import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const HQLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authType = localStorage.getItem('ryoun_auth_type');
    if (authType === 'hq') {
      navigate('/ryoun-hq-portal/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // HQ Login simulation
    if (adminId === 'ryoun-admin' && password === 'tachibana2026') {
       localStorage.setItem('ryoun_auth_type', 'hq');
       navigate('/ryoun-hq-portal/dashboard');
    } else {
      setError('管理者IDまたはパスワードが正しくありません。');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 border-ryoun-sky/30 shadow-2xl shadow-ryoun-sky/10"
      >
        <div className="text-center space-y-4 mb-10">
          <div className="w-16 h-16 bg-ryoun-sky/10 text-ryoun-sky rounded-2xl flex items-center justify-center mx-auto border border-ryoun-sky/20">
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-1">
             <h1 className="text-2xl font-bold tracking-widest text-gradient">実行委員会ポータル</h1>
             <p className="text-white/40 text-xs uppercase tracking-[0.2em]">HQ Management System</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase ml-1">ADMIN ID</label>
            <input 
              type="text" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 focus:ring-2 focus:ring-ryoun-sky/50 outline-none transition-all font-mono"
              placeholder="admin-id"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase ml-1">PASSWORD</label>
            <input 
              type="password" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 focus:ring-2 focus:ring-ryoun-sky/50 outline-none transition-all font-mono"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/5 p-4 rounded-xl text-xs border border-red-400/10">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-ryoun-sky via-ryoun-blue to-ryoun-indigo text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-ryoun-sky/20 transition-all flex items-center justify-center space-x-2 group"
          >
            <span>認証を開始</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
        
        <div className="pt-8 flex justify-center">
           <div className="flex items-center space-x-2 opacity-20">
             <div className="w-1.5 h-1.5 rounded-full bg-ryoun-sky animate-pulse"></div>
             <span className="text-[10px] tracking-widest font-light">SECURE CONNECTION ACTIVE</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HQLogin;
