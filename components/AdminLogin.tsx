import React, { useState } from 'react';
import { AdminRole } from '../types';

interface AdminLoginProps {
  onLoginSuccess: (role: AdminRole) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username === 'superadmin' && password === '2215Yople') {
      onLoginSuccess(AdminRole.SuperAdmin);
    } else if (username === 'admin' && password === '@dmin123') {
      onLoginSuccess(AdminRole.Admin);
    } else if (username === 'volunteer' && password === 'volunt££r123') {
      onLoginSuccess(AdminRole.Volunteer);
    } else if (username === 'god' && password === 'god123') {
      onLoginSuccess(AdminRole.God);
    } else {
      setError('Invalid Credentials');
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 p-8 shadow-2xl animate-fadeIn relative overflow-hidden rounded-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
      
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-tech text-slate-800 uppercase tracking-widest">Admin Portal</h2>
           <p className="text-red-500 text-[10px] font-bold uppercase">Restricted Area // Staff Only</p>
        </div>
        <button onClick={onBack} className="text-slate-400 hover:text-red-500 font-bold text-sm transition-colors">
          ESC
        </button>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Username</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all font-medium text-sm rounded shadow-inner"
            placeholder="Enter username"
          />
        </div>
        
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all font-medium text-sm rounded shadow-inner"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-red-600 text-xs font-bold uppercase bg-red-50 p-3 border border-red-200 flex items-center gap-2 rounded">
            <span className="text-red-600 text-lg">!</span> {error}
          </div>
        )}

        <button 
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-tech font-bold py-3 uppercase tracking-widest transition-all shadow-lg shadow-red-200 rounded"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
