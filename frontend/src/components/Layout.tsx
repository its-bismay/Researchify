import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "../api";
import { useAuth } from "../useAuth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleLogout = async () => {
    await logout();
    qc.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="font-semibold text-indigo-600">
            AI Research Agent
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link to="/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
