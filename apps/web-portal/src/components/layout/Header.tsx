import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  HelpCircle, 
  ChevronDown, 
  Search,
  Bell,
  Settings,
  Database,
  LogIn
} from 'lucide-react';
import DefaultLoader from '../Logo';
import { useNavigate } from 'react-router-dom';
import { LoginModal } from '../auth/LoginModal';

import { useProjectStore } from '@/store/useProjectStore';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProjectStore();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (token: string, userData: any) => {
    setUser(userData);
  };

  return (
    <div className="h-10 bg-zinc-950 text-zinc-200 flex items-center justify-between px-3 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <DefaultLoader className='w-10 h-10'/>
          <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-100">KTPC Portal</span>
        </div>
        
        <div className="h-4 w-[1px] bg-zinc-800 mx-1" />
        
        <div className="flex items-center gap-3 text-zinc-400">
           <span 
             onClick={() => navigate('/projects')}
             className="text-[11px] hover:text-zinc-100 cursor-pointer transition-colors font-bold text-primary border-b-2 border-primary pb-0.5"
           >
             {activeProject?.name || 'Select Project'}
           </span>   
        </div>
      </div>

      <div className="flex-1 max-w-md flex justify-center  mx-8">
        <div className="relative group w-full flex justify-center items-center">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Search commands and tools" 
            className="w-full bg-zinc-900 border-none py-0.5 pl-8 pr-2 text-[10px] text-zinc-300 focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 hover:bg-zinc-800 px-2 h-full cursor-pointer transition-colors">
          <Cloud size={14} className="text-emerald-400" />
          <span className="text-[10px] text-zinc-300">Online</span>
        </div>
        <Bell size={14} className="text-zinc-400 hover:text-zinc-100 cursor-pointer" />
        <Settings size={14} className="text-zinc-400 hover:text-zinc-100 cursor-pointer" />
        
        {user ? (
          <div className="flex items-center gap-2 hover:bg-zinc-800 px-2 h-full cursor-pointer transition-colors group">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <span className="text-[10px] text-zinc-300 group-hover:text-zinc-100">
              {user.firstName} {user.lastName}
            </span>
            <ChevronDown size={10} className="text-zinc-500" />
          </div>
        ) : (
          <div 
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-2 hover:bg-zinc-800 px-3 h-full cursor-pointer transition-colors text-primary"
          >
            <LogIn size={14} />
            <span className="text-[10px] font-bold uppercase tracking-tight">Sign In</span>
          </div>
        )}

        <HelpCircle size={14} className="text-zinc-400 hover:text-zinc-100 cursor-pointer" />
      </div>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};
