import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { useUIStore } from "../useUIStore";
import { 
  Sparkles, 
  ArrowRight, 
  Search, 
  Image as ImageIcon, 
  Video, 
  Mail, 
  Send, 
  Cpu, 
  ShieldCheck, 
  Database,
  Layers,
  Sun,
  Moon
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useUIStore();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ring loading-lg text-primary"></span>
          <p className="text-sm font-medium animate-pulse text-base-content/70">Preparing Research Environment...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content selection:bg-primary/20 transition-colors duration-300">
      
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-base-200/80 bg-base-100/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <span>Researchify</span>
          </div>

          <nav className="flex items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className="btn btn-ghost btn-circle text-base-content/80 hover:text-base-content"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="btn btn-ghost font-semibold text-sm hidden sm:inline-flex"
            >
              Sign In
            </button>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="btn btn-primary btn-sm sm:btn-md rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg"
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agentic AI Research Engine</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-none bg-gradient-to-r from-base-content via-base-content to-primary/80 bg-clip-text text-transparent">
            Synthesize Any Topic into a Rich Dashboard
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl text-base-content/75 max-w-2xl mx-auto leading-relaxed">
            Specify a prompt. Our parallel LangGraph agent swarm crawls the web, aggregates media, generates reports, and delivers them directly to your email and Telegram.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn btn-primary btn-lg rounded-xl font-bold px-8 shadow-lg shadow-primary/25 w-full sm:w-auto"
            >
              Launch Research Agent <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <a
              href="#features"
              className="btn btn-outline btn-lg border-base-300 hover:bg-base-200/50 rounded-xl font-bold px-8 w-full sm:w-auto text-base-content/80"
            >
              Learn More
            </a>
          </div>

          {/* Interactive UI Mockup */}
          <div className="mt-16 border border-base-200/80 bg-base-200/30 p-2 sm:p-4 rounded-2xl sm:rounded-3xl max-w-5xl mx-auto backdrop-blur-sm shadow-2xl">
            <div className="rounded-xl sm:rounded-2xl border border-base-300/80 bg-base-100 overflow-hidden text-left shadow-inner">
              <div className="bg-base-200 px-4 py-3 border-b border-base-300/60 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                <span className="w-3 h-3 rounded-full bg-green-400"></span>
                <span className="text-xs text-base-content/50 font-mono ml-4 select-none">researchify.ai/dashboard</span>
              </div>
              <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-base-200 pb-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Active Project</span>
                      <h3 className="text-lg font-bold">Quantum Computing Advancements 2026</h3>
                    </div>
                    <span className="badge badge-primary gap-1 py-2 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-base-100 animate-ping"></span>
                      Researching
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-base-200 rounded-lg w-1/4 animate-pulse"></div>
                    <div className="h-3 bg-base-200 rounded-lg w-full animate-pulse"></div>
                    <div className="h-3 bg-base-200 rounded-lg w-5/6 animate-pulse"></div>
                    <div className="h-3 bg-base-200 rounded-lg w-4/5 animate-pulse"></div>
                  </div>
                  <div className="border border-base-200/80 rounded-xl p-4 bg-base-50/50 space-y-2">
                    <div className="flex justify-between items-center text-xs text-base-content/60">
                      <span>Worker Log Stream</span>
                      <span className="font-mono text-primary animate-pulse">● online</span>
                    </div>
                    <div className="text-xs font-mono text-base-content/85 space-y-1">
                      <p className="text-success">[Web Research Agent] Crawled 12 articles on topological qubits...</p>
                      <p className="text-info">[Image Agent] Fetching 5 high-resolution diagrams from Unsplash...</p>
                      <p className="text-secondary">[Video Agent] Found 4 relevant tech explanations on YouTube...</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-base-200 pt-4 md:pt-0 md:pl-6">
                  <h4 className="font-bold text-sm">Target Delivery</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-base-200/50">
                      <Mail className="w-4 h-4 text-primary" />
                      <div className="text-xs">
                        <p className="font-semibold">Email PDF Report</p>
                        <p className="text-base-content/60">Ready to send</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-base-200/50 border border-primary/20">
                      <Send className="w-4 h-4 text-info" />
                      <div className="text-xs">
                        <p className="font-semibold text-info">Telegram Notification</p>
                        <p className="text-base-content/60">Connected to @ResearchBot</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 bg-base-200/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight">Swarm Architecture Capabilities</h2>
            <p className="mt-4 text-base-content/75 text-lg">
              Our LangGraph state machine splits your topic among specialist agents that coordinate in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card bg-base-100 shadow-xl border border-base-200/80 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="card-title text-lg font-bold mb-1">Deep Web Crawling</h3>
                <p className="text-sm text-base-content/70">
                  Orchestrator nodes deploy research agents to fetch, scrape, and filter recent news, articles, and documentation.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card bg-base-100 shadow-xl border border-base-200/80 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="card-title text-lg font-bold mb-1">Unsplash Visuals</h3>
                <p className="text-sm text-base-content/70">
                  Image agents search Unsplash APIs to gather beautiful, licensed photography and graphics to insert inline.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card bg-base-100 shadow-xl border border-base-200/80 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="card-title text-lg font-bold mb-1">YouTube Curators</h3>
                <p className="text-sm text-base-content/70">
                  Video agents extract tutorials, explanations, and reviews, pairing them with summary descriptions and thumbnail links.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card bg-base-100 shadow-xl border border-base-200/80 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="card-title text-lg font-bold mb-1">Postgres Job Queue</h3>
                <p className="text-sm text-base-content/70">
                  A high-throughput worker architecture backed by `SKIP LOCKED` rows, ensuring jobs run reliably, survive restarts, and scale.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="card bg-base-100 shadow-xl border border-base-200/80 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="card-title text-lg font-bold mb-1">PDF & HTML Builder</h3>
                <p className="text-sm text-base-content/70">
                  Reports compile to responsive HTML dashboards and print-perfect PDFs, uploaded securely to AWS S3 storage.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="card bg-base-100 shadow-xl border border-base-200/80 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="card-title text-lg font-bold mb-1">Omnichannel Delivery</h3>
                <p className="text-sm text-base-content/70">
                  Instant dispatches containing executive summaries and files directly to Telegram channels and email accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Stepper */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight">How it Works</h2>
          <p className="mt-4 text-base-content/75 text-lg">
            Follow the seamless research flow from input to final inbox delivery.
          </p>
        </div>

        <div className="steps steps-vertical lg:steps-horizontal w-full">
          <div className="step step-primary">
            <div className="p-4 text-left lg:text-center">
              <span className="font-bold text-lg block mb-1">1. Prompt Topic</span>
              <p className="text-sm text-base-content/70">Define the theme, target keywords, or sub-questions in a prompt.</p>
            </div>
          </div>
          <div className="step step-primary">
            <div className="p-4 text-left lg:text-center">
              <span className="font-bold text-lg block mb-1">2. Parallel Swarm</span>
              <p className="text-sm text-base-content/70">LangGraph starts parallel nodes searching web data, media repositories, and videos.</p>
            </div>
          </div>
          <div className="step step-primary">
            <div className="p-4 text-left lg:text-center">
              <span className="font-bold text-lg block mb-1">3. Synthesis</span>
              <p className="text-sm text-base-content/70">Gemini filters facts and writes an exhaustive, highly structured markdown document.</p>
            </div>
          </div>
          <div className="step step-primary">
            <div className="p-4 text-left lg:text-center">
              <span className="font-bold text-lg block mb-1">4. Delivery</span>
              <p className="text-sm text-base-content/70">Files are uploaded to AWS S3, and sent out to your linked Telegram and Email.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Footer / Bottom Bar */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content rounded border-t border-base-300">
        <nav className="grid grid-flow-col gap-4 font-semibold">
          <a href="#features" className="link link-hover">Features</a>
          <a onClick={() => setShowLoginModal(true)} className="link link-hover cursor-pointer">Get Started</a>
          <a href="https://github.com" target="_blank" className="link link-hover">GitHub</a>
        </nav>
        <aside>
          <p className="text-sm text-base-content/60">Copyright © {new Date().getFullYear()} - All rights reserved by Researchify Inc.</p>
        </aside>
      </footer>

      {/* MODERN LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal modal-open backdrop-blur-sm transition-all duration-300">
          <div className="modal-box max-w-sm border border-base-300/80 shadow-2xl relative overflow-hidden bg-base-100 p-8 rounded-2xl">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/60 hover:text-base-content"
            >
              ✕
            </button>

            {/* Visual background details */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-secondary/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="text-center relative z-10">
              <div className="w-12 h-12 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/10">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-extrabold text-2xl tracking-tight text-base-content">Welcome Back</h3>
              <p className="text-sm text-base-content/60 mt-2 mb-8">
                Connect your account to access your personal research workspace.
              </p>

              <div className="space-y-4">
                <a
                  href={`${API_URL}/auth/google/login`}
                  className="btn btn-outline btn-lg w-full flex items-center justify-center gap-3 border-base-300 hover:bg-base-200/60 rounded-xl font-bold text-sm text-base-content transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.03c2.37-2.18 3.74-5.39 3.74-9.25z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.03-3.13c-1.12.75-2.55 1.2-3.93 1.2-3.03 0-5.6-2.05-6.51-4.82H1.31v3.23A12 12 0 0 0 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.49 14.34a7.12 7.12 0 0 1 0-4.52V6.59H1.31a12 12 0 0 0 0 10.82l4.18-3.07z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0 0 12 0 12 12 0 0 0 1.31 6.59l4.18 3.07c.9-2.77 3.48-4.82 6.51-4.82z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </a>
              </div>

              <div className="flex items-center justify-center gap-2 mt-8 text-xs text-base-content/40 font-semibold">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>Secure OAuth Authentication</span>
              </div>
            </div>
          </div>
          <div onClick={() => setShowLoginModal(false)} className="modal-backdrop bg-black/40"></div>
        </div>
      )}

    </div>
  );
}
