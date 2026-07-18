import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { fetchProject, fetchFileUrl } from "../api";
import StatusBadge from "../components/StatusBadge";
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Mail, 
  Globe, 
  Image as ImageIcon, 
  Video, 
  ExternalLink,
  Cpu,
  PenTool,
  FileArchive,
  Terminal,
  Activity,
  XCircle
} from "lucide-react";

const STEPS = ["pending", "researching", "writing", "generating_file", "done"];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "done" || status === "failed" ? false : 2000;
    },
  });

  const isActive = project && ["pending", "researching", "writing", "generating_file"].includes(project.status);

  // Live timer for active research
  useEffect(() => {
    let timer: number;
    if (isActive) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [isActive]);

  if (!project) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ring loading-lg text-primary"></span>
          <p className="text-sm font-semibold animate-pulse text-base-content/65">Fetching workspace details...</p>
        </div>
      </div>
    );
  }

  const artifacts = project.artifacts || [];
  const videos = artifacts.filter((a) => a.type === "video_link");
  const sources = artifacts.filter((a) => a.type === "source_link");
  const images = artifacts.filter((a) => a.type === "image");
  const currentStep = STEPS.indexOf(project.status);

  const handleDownload = async () => {
    try {
      const { url } = await fetchFileUrl(project.id);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to fetch download url:", err);
    }
  };

  // Generate simulated console logs based on current status
  const getConsoleLogs = () => {
    const logs = [];
    if (currentStep >= 0) {
      logs.push("❯ [System] Initializing research swarm database connection...");
      logs.push("❯ [System] Allocating session tokens...");
      logs.push("❯ [System] Spawned Orchestrator Agent node successfully.");
    }
    if (currentStep >= 1) {
      logs.push("❯ [Orchestrator] Decomposed prompt into parallel sub-topics.");
      logs.push("❯ [Orchestrator] Planning search queries & media requirements.");
      logs.push("❯ [Web Agent] Crawling news sources, wiki links, and literature...");
      logs.push("❯ [Image Agent] Quering Unsplash database for relevant photography...");
      logs.push("❯ [Video Agent] Locating youtube explanations and tutorials...");
      logs.push(`❯ [Web Agent] Parsed 8 web pages on "${project.title.slice(0, 30)}..."`);
    }
    if (currentStep >= 2) {
      logs.push("❯ [System] Fan-in synchronization completed.");
      logs.push("❯ [Writer Agent] Received aggregate datasets from research agents.");
      logs.push("❯ [Writer Agent] Sending context chunks to Gemini 3.1 Flash-Lite...");
      logs.push("❯ [Writer Agent] Generating markdown report structure...");
      logs.push("❯ [Writer Agent] Refining inline image placements & citations.");
    }
    if (currentStep >= 3) {
      logs.push("❯ [Builder Agent] Initializing document generation compiler...");
      logs.push("❯ [Builder Agent] Renders Markdown to HTML templates...");
      logs.push("❯ [Builder Agent] Running WeasyPrint PDF layout engine...");
      logs.push("❯ [Builder Agent] Uploading assets & final report to AWS S3 bucket...");
    }
    return logs;
  };

  const activeLogs = getConsoleLogs();

  return (
    <div className="space-y-6">
      
      {/* Top bar back button / info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content bg-base-100 shadow-sm border border-base-300">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">{project.title}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-xs text-base-content/60 mt-1 font-mono break-all">ID: {project.id}</p>
          </div>
        </div>
        
        {project.status === "done" && (
          <button
            onClick={handleDownload}
            className="btn btn-primary rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download PDF Report
          </button>
        )}
      </div>

      <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-sm space-y-2">
        <span className="text-[11px] font-bold text-base-content/40 uppercase tracking-widest block">Original Prompt</span>
        <p className="text-sm font-semibold text-base-content/85 leading-relaxed">{project.topic_prompt}</p>
      </div>

      {/* STEPPER PROGRESS */}
      {project.status !== "failed" && (
        <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl shadow-sm overflow-x-auto">
          <div className="steps w-full min-w-[500px]">
            <div className={`step ${currentStep >= 0 ? "step-primary font-bold" : "text-base-content/40"}`} data-content="⚙️">Pending</div>
            <div className={`step ${currentStep >= 1 ? "step-primary font-bold" : "text-base-content/40"}`} data-content="🔍">Web Research</div>
            <div className={`step ${currentStep >= 2 ? "step-primary font-bold" : "text-base-content/40"}`} data-content="✍️">Synthesis</div>
            <div className={`step ${currentStep >= 3 ? "step-primary font-bold" : "text-base-content/40"}`} data-content="📦">Building PDF</div>
            <div className={`step ${currentStep >= 4 ? "step-primary font-bold" : "text-base-content/40"}`} data-content="✉️">Delivered</div>
          </div>
        </div>
      )}

      {/* FAIL ALERT */}
      {project.status === "failed" && (
        <div className="alert alert-error shadow-md border border-error/25 rounded-2xl p-4 flex gap-3 text-sm">
          <div className="p-2 bg-error/15 rounded-xl text-error">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">Research Run Failed</h3>
            <p className="text-xs text-error-content/80 mt-0.5">The pipeline encountered an issue. Try queueing a new swarm from the dashboard.</p>
          </div>
        </div>
      )}

      {/* SWARM ACTIVE STATE - INTERACTIVE HUB */}
      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Swarm Visual Swarm Nodes Monitor */}
          <div className="lg:col-span-2 card bg-base-100 border border-base-300 p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[360px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Activity className="w-48 h-48 text-primary" />
            </div>

            <div className="flex items-center justify-between mb-6 z-10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                <h3 className="font-extrabold text-base-content text-sm">Agent Swarm Control Center</h3>
              </div>
              <span className="font-mono text-xs text-primary font-bold bg-primary/10 py-1 px-3 rounded-full">
                Elapsed: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
              </span>
            </div>

            {/* Visual Swarm Flow Diagram */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6 z-10">
              {/* Orchestrator node */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                  project.status === "pending" 
                    ? "border-primary bg-primary/10 text-primary animate-pulse scale-110 shadow-lg shadow-primary/25" 
                    : "border-success bg-success/10 text-success"
                }`}>
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/70">Orchestrator</span>
              </div>

              <div className="h-6 w-0.5 sm:h-0.5 sm:w-12 bg-base-300"></div>

              {/* Research Swarm group */}
              <div className="flex flex-row sm:flex-col gap-4 items-center border border-base-200 bg-base-200/30 p-3 rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Web crawler */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                      project.status === "researching" 
                        ? "border-primary bg-primary/10 text-primary animate-bounce scale-105 shadow-md shadow-primary/20" 
                        : currentStep > 1 ? "border-success bg-success/10 text-success" : "border-base-300 opacity-40"
                    }`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold uppercase text-base-content/60">Web Search</span>
                  </div>

                  {/* Image Crawler */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                      project.status === "researching" 
                        ? "border-primary bg-primary/10 text-primary animate-bounce scale-105 shadow-md shadow-primary/20" 
                        : currentStep > 1 ? "border-success bg-success/10 text-success" : "border-base-300 opacity-40"
                    }`}>
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold uppercase text-base-content/60">Images</span>
                  </div>

                  {/* Video crawler */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                      project.status === "researching" 
                        ? "border-primary bg-primary/10 text-primary animate-bounce scale-105 shadow-md shadow-primary/20" 
                        : currentStep > 1 ? "border-success bg-success/10 text-success" : "border-base-300 opacity-40"
                    }`}>
                      <Video className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold uppercase text-base-content/60">YouTube</span>
                  </div>
                </div>
              </div>

              <div className="h-6 w-0.5 sm:h-0.5 sm:w-12 bg-base-300"></div>

              {/* Synthesis Writer node */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                  project.status === "writing" 
                    ? "border-primary bg-primary/10 text-primary animate-pulse scale-110 shadow-lg shadow-primary/25" 
                    : currentStep > 2 ? "border-success bg-success/10 text-success" : "border-base-300 opacity-40"
                }`}>
                  <PenTool className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/70">Synthesis Writer</span>
              </div>

              <div className="h-6 w-0.5 sm:h-0.5 sm:w-12 bg-base-300"></div>

              {/* S3 Sinks / Builders */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                  project.status === "generating_file" 
                    ? "border-primary bg-primary/10 text-primary animate-pulse scale-110 shadow-lg shadow-primary/25" 
                    : currentStep > 3 ? "border-success bg-success/10 text-success" : "border-base-300 opacity-40"
                }`}>
                  <FileArchive className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/70">S3 / Publisher</span>
              </div>
            </div>

            <div className="text-center text-xs font-semibold text-base-content/50 border-t border-base-200 pt-4 z-10">
              Agents coordinate dynamically using a Postgres-backed transaction state machine.
            </div>
          </div>

          {/* Console Output box */}
          <div className="card bg-neutral text-neutral-content p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[360px] font-mono border border-neutral-focus">
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[260px] pr-2">
              <div className="flex items-center gap-1.5 text-xs text-neutral-content/40 border-b border-neutral-content/10 pb-2">
                <Terminal className="w-4 h-4" />
                <span>ACTIVE SESSION TERMINAL LOGS</span>
              </div>
              <div className="text-xs space-y-2 select-none">
                {activeLogs.map((log, index) => (
                  <p key={index} className="text-success leading-relaxed">
                    {log}
                  </p>
                ))}
                <p className="text-neutral-content/90 flex items-center gap-1">
                  ❯ Current status: <span className="text-info font-bold uppercase tracking-widest">{project.status}</span>
                  <span className="w-1.5 h-3 bg-neutral-content/60 inline-block animate-pulse"></span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-neutral-content/30 border-t border-neutral-content/10 pt-3">
              <span>RATE: 15 REQ / MIN</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping"></span>
                Streaming Logs
              </span>
            </div>
          </div>

        </div>
      )}

      {/* SKELETON PREVIEW FOR WORK IN PROGRESS */}
      {isActive && (
        <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl shadow-sm space-y-4 animate-pulse">
          <div className="h-5 bg-base-300 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-base-300 rounded w-full"></div>
            <div className="h-3 bg-base-300 rounded w-5/6"></div>
            <div className="h-3 bg-base-300 rounded w-4/5"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            <div className="h-28 bg-base-300 rounded-xl"></div>
            <div className="h-28 bg-base-300 rounded-xl"></div>
            <div className="h-28 bg-base-300 rounded-xl"></div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT VIEW - COMPLETED REPORTS */}
      {project.report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Markdown Report */}
          <div className="lg:col-span-2 bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center border-b border-base-200 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <FileArchive className="w-4 h-4" />
                </span>
                <h2 className="font-extrabold text-lg">Synthesized Analysis</h2>
              </div>
              <button
                onClick={handleDownload}
                className="btn btn-outline btn-sm rounded-xl font-bold border-base-300 hover:btn-primary"
              >
                <Download className="w-4 h-4 mr-1" />
                Download Report
              </button>
            </div>
            
            {/* Styled Prose Area */}
            <div className="prose max-w-none text-base-content/95 leading-relaxed prose-headings:text-base-content prose-headings:font-black prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown>{project.report.summary_markdown}</ReactMarkdown>
            </div>
          </div>

          {/* Right sidebar - details / attachments */}
          <div className="space-y-6">
            
            {/* Delivery Stats card */}
            <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm mb-3">Omnichannel Receipts</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-base-200/40 rounded-xl border border-base-300">
                  <span className="text-xs font-semibold flex items-center gap-2 text-base-content/85">
                    <Mail className="w-4 h-4 text-primary" /> Email Delivery
                  </span>
                  {project.report.sent_email_at ? (
                    <span className="badge badge-success gap-1 font-bold text-[10px] py-1.5 px-2">Sent ✅</span>
                  ) : (
                    <span className="badge badge-ghost text-[10px] py-1.5 px-2">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-2.5 bg-base-200/40 rounded-xl border border-base-300">
                  <span className="text-xs font-semibold flex items-center gap-2 text-base-content/85">
                    <Send className="w-4 h-4 text-info rotate-45" /> Telegram Delivery
                  </span>
                  {project.report.sent_telegram_at ? (
                    <span className="badge badge-success gap-1 font-bold text-[10px] py-1.5 px-2">Sent ✅</span>
                  ) : (
                    <span className="badge badge-ghost text-[10px] py-1.5 px-2">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Unsplash Media Gallery */}
            {images.length > 0 && (
              <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-sm mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-secondary" /> Related Media
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative h-24 rounded-xl overflow-hidden border border-base-300 block"
                    >
                      <img
                        src={img.thumbnail_url || img.url}
                        alt={img.title || "Research image"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[9px] text-white font-medium line-clamp-1 flex items-center gap-0.5">
                          View Full <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube video list */}
            {videos.length > 0 && (
              <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-sm mb-3 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-accent" /> Curated Explanations
                </h3>
                <div className="space-y-3">
                  {videos.map((v) => (
                    <a
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 items-center group bg-base-200/30 border border-base-300 hover:border-primary/20 p-2 rounded-xl transition-all"
                    >
                      {v.thumbnail_url && (
                        <div className="w-16 h-10 object-cover rounded-lg overflow-hidden border border-base-300 relative shrink-0">
                          <img
                            src={v.thumbnail_url}
                            alt={v.title || "Video"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="block font-bold text-xs text-base-content/85 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {v.title}
                        </span>
                        <span className="text-[10px] text-base-content/40 font-semibold block mt-0.5">YouTube</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Web citations and sources list */}
            {sources.length > 0 && (
              <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-sm mb-3 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-primary" /> Citations & Sources
                </h3>
                <ul className="space-y-2">
                  {sources.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-base-200/30 border border-base-300 text-xs font-semibold text-primary hover:bg-base-200 transition-all group gap-2"
                      >
                        <span className="line-clamp-1 flex-1 text-base-content/75 group-hover:text-primary transition-colors">{s.title || s.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-base-content/30 shrink-0 group-hover:text-primary transition-colors" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
