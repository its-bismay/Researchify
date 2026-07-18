import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchProjects, fetchIntegrationStatus } from "../api";
import StatusBadge from "../components/StatusBadge";
import NewProjectModal from "../components/NewProjectModal";
import { 
  Sparkles, 
  Search as SearchIcon, 
  Layers, 
  Hourglass, 
  CheckCircle, 
  Send,
  TrendingUp,
  ArrowRight,
  BookOpen
} from "lucide-react";

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [modalTopic, setModalTopic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    refetchInterval: 5000,
  });

  const { data: integration } = useQuery({
    queryKey: ["integration-status"],
    queryFn: fetchIntegrationStatus,
  });

  // Open modal with prefilled topic
  const handleOpenModal = (topic = "") => {
    setModalTopic(topic);
    setShowModal(true);
  };

  // Filter projects
  const filteredProjects = projects?.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.topic_prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const totalCount = projects?.length || 0;
  const completedCount = projects?.filter((p) => p.status === "done").length || 0;
  const runningCount = projects?.filter((p) => 
    ["researching", "writing", "generating_file"].includes(p.status)
  ).length || 0;
  const hoursSaved = (completedCount * 1.5).toFixed(1); // Assume 1.5 hours saved per completed report

  const showTgBanner = integration && !integration.telegram_connected;

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Telegram Integration Promo */}
      {showTgBanner && (
        <div className="alert bg-gradient-to-r from-info/20 to-primary/10 border border-primary/20 shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-info/10 text-info rounded-xl hidden xs:block">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-base-content">Get Instant Updates on Telegram</h3>
              <p className="text-xs text-base-content/70 mt-0.5">
                Connect your Telegram account to get research logs, notifications, and PDF downloads delivered straight to your phone.
              </p>
            </div>
          </div>
          <Link to="/settings" className="btn btn-primary btn-sm rounded-xl font-bold self-start sm:self-auto shrink-0 shadow-sm shadow-primary/25">
            Connect Telegram
          </Link>
        </div>
      )}

      {/* Header and New Project trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Your Research Workspace</h1>
          <p className="text-sm text-base-content/65 mt-1">Deploy autonomous agent swarms to gather intelligence on any topic.</p>
        </div>
        <button
          onClick={() => handleOpenModal("")}
          className="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Deploy New Swarm
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 sm:p-6 flex-row items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Total Projects</span>
              <p className="text-2xl sm:text-3xl font-black">{totalCount}</p>
            </div>
            <div className="p-3 bg-base-200 text-base-content/70 rounded-2xl hidden xs:block">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 sm:p-6 flex-row items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Active Swarms</span>
              <p className="text-2xl sm:text-3xl font-black text-primary">{runningCount}</p>
            </div>
            <div className={`p-3 bg-primary/10 text-primary rounded-2xl hidden xs:block ${runningCount > 0 ? "animate-pulse" : ""}`}>
              <Hourglass className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 sm:p-6 flex-row items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Completed</span>
              <p className="text-2xl sm:text-3xl font-black text-success">{completedCount}</p>
            </div>
            <div className="p-3 bg-success/10 text-success rounded-2xl hidden xs:block">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 sm:p-6 flex-row items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Research Hours Saved</span>
              <p className="text-2xl sm:text-3xl font-black text-secondary">{hoursSaved}h</p>
            </div>
            <div className="p-3 bg-secondary/10 text-secondary rounded-2xl hidden xs:block">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search reports or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10 rounded-xl text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select select-bordered rounded-xl text-sm font-semibold sm:w-48 text-base-content/85"
          >
            <option value="all">All Statuses</option>
            <option value="done">Delivered</option>
            <option value="researching">Researching</option>
            <option value="writing">Writing</option>
            <option value="generating_file">Building File</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      )}

      {/* Project Cards or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card bg-base-100 border border-base-300 shadow-sm p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="h-5 bg-base-300 rounded w-2/3"></div>
                <div className="h-6 bg-base-300 rounded w-1/4"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-base-300 rounded w-full"></div>
                <div className="h-3 bg-base-300 rounded w-5/6"></div>
              </div>
              <div className="h-3 bg-base-300 rounded w-1/3 mt-4"></div>
            </div>
          ))}
        </div>
      ) : !projects?.length ? (
        /* Empty State */
        <div className="card bg-base-100 border border-base-300 shadow-xl max-w-2xl mx-auto text-center p-8 sm:p-12 space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight">No research reports yet</h3>
            <p className="text-base-content/65 text-sm max-w-md mx-auto leading-relaxed">
              Launch your first agentic search. Our multi-agent system will gather, refine, and structure visual and textual insights into an interactive report.
            </p>
          </div>
          
          <button
            onClick={() => handleOpenModal("")}
            className="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/20"
          >
            Launch Your First Swarm <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>

          <div className="divider text-xs text-base-content/40 uppercase tracking-widest font-bold">Or click to start instantly</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div 
              onClick={() => handleOpenModal("The impact of quantum computing on modern cryptography")}
              className="p-4 border border-base-300 rounded-xl bg-base-200/40 hover:bg-base-200 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <h4 className="font-bold text-sm text-base-content flex items-center gap-1.5">
                Quantum Cryptography <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </h4>
              <p className="text-xs text-base-content/60 mt-1 line-clamp-2">How post-quantum algorithms secure information against upcoming quantum threats.</p>
            </div>
            <div 
              onClick={() => handleOpenModal("Latest breakthroughs in solid state battery technology (2025/2026)")}
              className="p-4 border border-base-300 rounded-xl bg-base-200/40 hover:bg-base-200 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <h4 className="font-bold text-sm text-base-content flex items-center gap-1.5">
                Solid State Batteries <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </h4>
              <p className="text-xs text-base-content/60 mt-1 line-clamp-2">Energy density, commercialization timelines, and vehicle battery lifecycles.</p>
            </div>
          </div>
        </div>
      ) : filteredProjects?.length === 0 ? (
        <div className="text-center py-16 text-base-content/50 font-medium">
          No projects match your search query.
        </div>
      ) : (
        /* Project Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects?.map((p) => {
            const isActive = ["researching", "writing", "generating_file"].includes(p.status);
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className={`card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden ${
                  isActive ? "border-primary/30 bg-gradient-to-br from-base-100 to-primary/5" : ""
                }`}
              >
                {/* Glowing edge for active agents */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-secondary animate-pulse"></div>
                )}
                
                <div className="card-body p-5 sm:p-6 justify-between h-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-bold text-base-content group-hover:text-primary transition-colors line-clamp-2 text-md leading-snug">
                        {p.title}
                      </h3>
                      <div className="shrink-0">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <p className="text-xs text-base-content/60 line-clamp-3 leading-relaxed">
                      {p.topic_prompt}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-base-200/80 pt-3 text-[11px] text-base-content/55 font-semibold">
                    <span>
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    
                    {isActive ? (
                      <span className="text-primary font-bold flex items-center gap-1 animate-pulse">
                        <span className="loading loading-spinner w-2.5 h-2.5"></span>
                        Swarm Active
                      </span>
                    ) : (
                      <span className="text-base-content/40 group-hover:text-primary group-hover:translate-x-1 transition-all flex items-center gap-0.5">
                        View Report <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <NewProjectModal 
          onClose={() => setShowModal(false)} 
          initialTopic={modalTopic}
        />
      )}
    </div>
  );
}
