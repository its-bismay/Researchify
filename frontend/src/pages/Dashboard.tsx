import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchProjects } from "../api";
import StatusBadge from "../components/StatusBadge";
import NewProjectModal from "../components/NewProjectModal";

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    refetchInterval: 5000,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
        >
          + New Project
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : !projects?.length ? (
        <div className="text-center py-20 text-gray-500">
          No projects yet. Create your first research project.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-2">
                  {p.title}
                </h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-gray-500 line-clamp-3">
                {p.topic_prompt}
              </p>
              <p className="text-xs text-gray-400 mt-3">
                {new Date(p.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
