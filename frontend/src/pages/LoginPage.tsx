import { Navigate } from "react-router-dom";
import { useAuth } from "../useAuth";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center max-w-sm w-full">
        <h1 className="text-2xl font-bold text-gray-900">AI Research Agent</h1>
        <p className="text-gray-500 mt-2 mb-8">
          Turn any topic into a researched dashboard.
        </p>
        <a
          href={`${API_URL}/auth/google/login`}
          className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
}
