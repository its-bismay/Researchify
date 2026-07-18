import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api";
import { Sparkles, HelpCircle, X, AlignLeft, Send } from "lucide-react";

interface NewProjectModalProps {
  onClose: () => void;
  initialTopic?: string;
}

const PRESET_TOPICS = [
  "Quantum Computing impact on Cryptography",
  "Recent breakthroughs in Nuclear Fusion (2025-2026)",
  "mRNA vaccine developments for oncology",
  "Deep sea exploration findings & new species"
];

export default function NewProjectModal({ onClose, initialTopic = "" }: NewProjectModalProps) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(initialTopic);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => createProject(title.trim() || topic.trim().slice(0, 50), topic.trim()),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      navigate(`/projects/${project.id}`);
    },
  });

  const handlePresetClick = (preset: string) => {
    setTopic(preset);
    // Auto-generate a title if empty
    if (!title) {
      const words = preset.split(" ");
      setTitle(words.slice(0, 4).join(" ") + "...");
    }
  };

  return (
    <div className="modal modal-open backdrop-blur-sm z-50">
      <div className="modal-box max-w-lg border border-base-300 shadow-2xl relative bg-base-100 p-6 sm:p-8 rounded-2xl">
        <button 
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/60 hover:text-base-content"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Initiate AI Swarm Research</h2>
        </div>

        <div className="space-y-5">
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text font-bold text-xs uppercase tracking-wider text-base-content/60">Project Title (Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fusion Energy Analysis"
              className="input input-bordered w-full rounded-xl focus:input-primary transition-all text-sm font-medium"
            />
          </div>

          <div className="form-control w-full">
            <label className="label py-1 flex items-center justify-between">
              <span className="label-text font-bold text-xs uppercase tracking-wider text-base-content/60">Research Prompt / Topic</span>
              <span className="label-text-alt text-xs text-primary font-semibold flex items-center gap-1">
                <AlignLeft className="w-3 h-3" /> Required
              </span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Detail exactly what you want the AI swarm to research..."
              rows={4}
              className="textarea textarea-bordered w-full rounded-xl focus:textarea-primary transition-all text-sm font-medium leading-relaxed"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider block mb-2">Suggested Prompts</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TOPICS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="btn btn-xs btn-outline btn-neutral rounded-full font-semibold border-base-300 hover:border-primary text-[11px] max-w-full truncate py-1 px-3"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {mutation.isError && (
            <div className="alert alert-error rounded-xl py-3 px-4 flex items-center gap-2 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>Failed to queue research job. Please try again.</span>
            </div>
          )}

          <div className="modal-action mt-6 gap-2">
            <button
              onClick={onClose}
              className="btn btn-ghost font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              disabled={!topic.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="btn btn-primary rounded-xl font-bold px-6 shadow-md shadow-primary/20"
            >
              {mutation.isPending ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Spinning up agents...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Deploy Agents
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div onClick={onClose} className="modal-backdrop bg-black/40"></div>
    </div>
  );
}
