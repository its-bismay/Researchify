import { useState, useEffect } from "react";
import { Cpu, Server, Sparkles, RefreshCw, AlertCircle, Clock } from "lucide-react";

interface BackendLoadingScreenProps {
  message?: string;
}

export default function BackendLoadingScreen({
  message = "Loading dashboard...",
}: BackendLoadingScreenProps) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isColdStart = secondsElapsed >= 3;

  // Calculate simulated progress bar percentage (approximating ~45s cold start)
  const progressPercent = Math.min(
    100,
    secondsElapsed <= 3 ? 15 : Math.floor(15 + ((secondsElapsed - 3) / 42) * 80)
  );

  const getStatusTip = () => {
    if (secondsElapsed < 4) return "Connecting to backend service...";
    if (secondsElapsed < 12) return "Waking up Render web server container...";
    if (secondsElapsed < 22) return "Booting Python FastAPI & LangGraph engine...";
    if (secondsElapsed < 35) return "Connecting PostgreSQL database & worker queue...";
    return "Finalizing security handshake with backend...";
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10 text-center">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 font-black text-2xl tracking-tight">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/20 shadow-inner">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <span>Researchify</span>
        </div>

        {/* Main Card */}
        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
          
          {/* Animated Spinner & Status */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary w-14 h-14"></span>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
              </div>
            </div>

            <div>
              <h2 className="font-extrabold text-xl tracking-tight text-base-content">
                {message}
              </h2>
              <p className="text-xs text-base-content/60 font-medium mt-1">
                {getStatusTip()}
              </p>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-base-content/60">
              <span className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-primary" /> Server Status
              </span>
              <span className="font-mono text-primary font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> {secondsElapsed}s elapsed
              </span>
            </div>
            
            <div className="w-full bg-base-200 h-2.5 rounded-full overflow-hidden border border-base-300 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* RENDER COLD START INFORMATIONAL BOX */}
          {isColdStart && (
            <div className="alert bg-warning/10 border border-warning/25 rounded-2xl p-4 text-left space-y-2 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-warning/20 text-warning rounded-lg shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-warning-content uppercase tracking-wider">
                    Render Backend Booting Up
                  </h3>
                  <p className="text-xs text-base-content/75 mt-1 leading-relaxed">
                    Our API is hosted on Render's cloud platform. Free tier instances automatically sleep after inactivity and take <b>30–60 seconds</b> to start up.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-base-content/60 font-semibold bg-base-100/60 p-2.5 rounded-xl border border-base-200/80 flex items-center justify-between">
                <span>Please wait a few moments...</span>
                <span className="font-mono text-warning">Booting container...</span>
              </div>
            </div>
          )}

          {/* Action / Retry Button after prolonged waiting */}
          {secondsElapsed >= 30 && (
            <div className="pt-2 animate-fade-in">
              <button
                onClick={handleRefresh}
                className="btn btn-outline btn-sm rounded-xl font-bold w-full border-base-300 hover:bg-base-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-primary" />
                <span>Taking too long? Reload Page</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer info */}
        <p className="text-[11px] text-base-content/40 font-medium">
          Autonomous Swarm AI Research Platform
        </p>

      </div>
    </div>
  );
}
