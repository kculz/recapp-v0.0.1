

import { NavLink } from 'react-router-dom';
import { getAdminNavItems } from '../utils/admin';

interface SidebarProps {
  role: string;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({ role, userName, onLogout }: SidebarProps) {
  const menuItems = getAdminNavItems(role);

  return (
    <aside className="w-64 bg-oceanblue text-white flex flex-col justify-between border-r border-oceanblue-900 shadow-xl h-full">
      <div className="flex flex-col flex-1">
        {/* Brand Header */}
        <div className="py-6 px-6 border-b border-oceanblue-900/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-oceanblue font-black text-xl shadow-lg shadow-oceanblue-900/40">
            R
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">RecApp Console</h1>
            <span className="text-[10px] text-skyblue-300 font-semibold uppercase tracking-wider block">
              {role} Panel
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {menuItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                    isActive
                      ? 'bg-white text-oceanblue shadow-md shadow-oceanblue-900/30'
                      : 'text-skyblue-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-skyblue-500" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User profile details & Logout */}
      <div className="p-4 border-t border-oceanblue-900/50 space-y-3 bg-oceanblue-900/30">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-skyblue-500 text-white font-extrabold flex items-center justify-center border border-white/15">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-bold text-white truncate">{userName}</h4>
            <span className="text-[10px] text-skyblue-300/80 truncate block">{role}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/10 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold text-skyblue-100 border border-white/10 transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
