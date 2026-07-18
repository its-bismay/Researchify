import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { logout, fetchIntegrationStatus } from "../api";
import { useAuth } from "../useAuth";
import { useUIStore } from "../useUIStore";
import { 
  LayoutDashboard, 
  Settings, 
  Send, 
  LogOut, 
  Cpu, 
  Sun, 
  Moon,
  AlertTriangle
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { theme, toggleTheme } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: integration } = useQuery({
    queryKey: ["integration-status"],
    queryFn: fetchIntegrationStatus,
    enabled: !!user,
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout backend request failed, clearing local session anyway:", err);
    } finally {
      qc.setQueryData(["me"], null);
      qc.clear();
      navigate("/login");
    }
  };

  const isDashboardActive = location.pathname === "/dashboard" || location.pathname.startsWith("/projects");
  const isSettingsActive = location.pathname === "/settings";

  return (
    <div className="min-h-screen bg-base-200 text-base-content flex flex-col transition-colors duration-300 pb-16 md:pb-0">
      
      {/* Navbar Header */}
      <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex-1 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-tight text-base-content hover:opacity-90">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <span className="hidden sm:inline-block">Researchify</span>
          </Link>
          
          {/* Telegram Status Badge in Header */}
          {integration && (
            <div className="tooltip tooltip-bottom ml-2 hidden xs:block" data-tip={integration.telegram_connected ? "Telegram Connected" : "Telegram Disconnected"}>
              {integration.telegram_connected ? (
                <Link to="/settings" className="badge badge-success gap-1.5 py-2.5 px-3 font-semibold text-xs text-success-content cursor-pointer hover:brightness-95 transition-all">
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Linked</span>
                </Link>
              ) : (
                <Link to="/settings" className="badge badge-warning gap-1.5 py-2.5 px-3 font-semibold text-xs text-warning-content cursor-pointer hover:brightness-95 transition-all animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Connect TG</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right Nav Menu - Flex Container */}
        <div className="flex-none flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link 
              to="/dashboard" 
              className={`btn btn-ghost btn-sm rounded-lg font-semibold ${
                isDashboardActive ? "bg-base-200 text-primary" : "text-base-content/75"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-1.5 hidden xs:inline" />
              Dashboard
            </Link>
            <Link 
              to="/settings" 
              className={`btn btn-ghost btn-sm rounded-lg font-semibold ${
                isSettingsActive ? "bg-base-200 text-primary" : "text-base-content/75"
              }`}
            >
              <Settings className="w-4 h-4 mr-1.5 hidden xs:inline" />
              Settings
            </Link>
          </nav>

          <div className="h-6 w-[1px] bg-base-300 hidden sm:block"></div>

          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme} 
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* User Profile & Logout Dropdown */}
          <div className={`dropdown dropdown-end ${dropdownOpen ? "dropdown-open" : ""}`}>
            <div 
              role="button" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              className="btn btn-ghost btn-circle avatar placeholder"
            >
              {user?.avatar_url ? (
                <div className="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img src={user.avatar_url} alt={user.name} />
                </div>
              ) : (
                <div className="bg-primary text-primary-content rounded-full w-9">
                  <span className="text-sm font-semibold">{user?.name?.charAt(0) || "U"}</span>
                </div>
              )}
            </div>
            
            {dropdownOpen && (
              <ul className="menu menu-sm dropdown-content mt-3 z-[40] p-2 shadow bg-base-100 rounded-box w-52 border border-base-200 absolute right-0">
                <li className="menu-title px-4 py-2 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Logged in as <br />
                  <span className="font-bold text-base-content normal-case break-all">{user?.email}</span>
                </li>
                <div className="divider my-0"></div>
                <li>
                  <Link to="/settings" onClick={() => setDropdownOpen(false)} className="py-2.5 font-medium">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => { setDropdownOpen(false); handleLogout(); }} 
                    className="py-2.5 text-error font-medium hover:bg-error/10 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Professional Mobile Bottom Bar */}
      <nav className="btm-nav btm-nav-md md:hidden bg-base-100 border-t border-base-300 z-30 shadow-lg">
        <Link 
          to="/dashboard" 
          className={`${isDashboardActive ? "active text-primary" : "text-base-content/65"}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="btm-nav-label text-[10px] font-semibold">Dashboard</span>
        </Link>
        
        <Link 
          to="/settings" 
          className={`${isSettingsActive ? "active text-primary" : "text-base-content/65"}`}
        >
          <Settings className="w-5 h-5" />
          <span className="btm-nav-label text-[10px] font-semibold">Settings</span>
        </Link>

        {integration && (
          <Link 
            to="/settings" 
            className={`flex flex-col items-center justify-center ${
              integration.telegram_connected ? "text-success" : "text-warning animate-pulse"
            }`}
          >
            <Send className="w-5 h-5" />
            <span className="btm-nav-label text-[10px] font-semibold">
              {integration.telegram_connected ? "TG Linked" : "Link TG"}
            </span>
          </Link>
        )}

        <button 
          onClick={toggleTheme} 
          className="text-base-content/65 flex flex-col items-center justify-center"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          <span className="btm-nav-label text-[10px] font-semibold">Theme</span>
        </button>
      </nav>

    </div>
  );
}
