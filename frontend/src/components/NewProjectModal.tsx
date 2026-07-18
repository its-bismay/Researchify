import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api";

export default function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => createProject(title || topic.slice(0, 60), topic),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      navigate(`/projects/${project.id}`);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-lg font-semibold mb-4">New Research Project</h2>
        <label className="block text-sm text-gray-600 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional title"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
        />
        <label className="block text-sm text-gray-600 mb-1">
          Topic / Prompt
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. The impact of quantum computing on cryptography"
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
        />
        {mutation.isError && (
          <p className="text-red-600 text-sm mb-3">
            Failed to create project. Try again.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            disabled={!topic.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-700"
          >
            {mutation.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
