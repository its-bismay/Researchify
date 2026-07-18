import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectTelegram,
  fetchIntegrationStatus,
  linkTelegram,
} from "../api";
import { 
  Send, 
  Mail, 
  ShieldCheck, 
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Info
} from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();
  
  const { data: status, isLoading } = useQuery({
    queryKey: ["integration-status"],
    queryFn: fetchIntegrationStatus,
  });

  const linkMutation = useMutation({
    mutationFn: linkTelegram,
    onSuccess: (data) => window.open(data.deep_link, "_blank"),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectTelegram,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["integration-status"] }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings & Integrations</h1>
        <p className="text-sm text-base-content/65 mt-1">Configure your delivery channels and notifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-base-300 rounded-2xl w-full"></div>
          <div className="h-48 bg-base-300 rounded-2xl w-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Email integration status card */}
          <div className="card bg-base-100 border border-base-300 shadow-sm rounded-2xl">
            <div className="card-body p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base-content">Email Notifications</h2>
                  <p className="text-xs text-base-content/60 mt-0.5">Primary delivery channel for compiled reports.</p>
                </div>
              </div>

              <div className="divider my-2"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                <div>
                  <p className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Recipient Address</p>
                  <p className="text-sm font-semibold text-base-content/85 mt-0.5">{status?.email}</p>
                </div>
                <div className="badge badge-success gap-1.5 py-2 px-3 font-semibold text-xs text-success-content">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </div>
              </div>
            </div>
          </div>

          {/* Telegram bot integration card */}
          <div className="card bg-base-100 border border-base-300 shadow-sm rounded-2xl relative overflow-hidden">
            
            {/* Ambient accent border */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${status?.telegram_connected ? "bg-success" : "bg-warning animate-pulse"}`}></div>

            <div className="card-body p-6 pl-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${status?.telegram_connected ? "bg-success/15 text-success" : "bg-warning/15 text-warning animate-bounce"}`}>
                    <Send className="w-5 h-5 rotate-45" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base-content flex items-center gap-2">
                      Telegram Messenger Delivery
                    </h2>
                    <p className="text-xs text-base-content/60 mt-0.5">Get real-time agent execution status and files sent to your chat.</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {status?.telegram_connected ? (
                    <button
                      disabled={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate()}
                      className="btn btn-outline btn-error btn-sm rounded-xl font-bold border-base-300"
                    >
                      {disconnectMutation.isPending ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      disabled={linkMutation.isPending}
                      onClick={() => linkMutation.mutate()}
                      className="btn btn-primary btn-sm rounded-xl font-bold shadow-md shadow-primary/20"
                    >
                      {linkMutation.isPending ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Connect Bot
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="divider my-2"></div>

              {/* Status Section */}
              <div className="alert bg-base-200/40 border border-base-300 py-3.5 px-4 rounded-xl flex items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {status?.telegram_connected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-success">Connected & Active</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-base-content/75">Not Connected</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-base-content/50 font-bold select-none">@ResearchifyBot</span>
              </div>

              {/* Instructions on how to connect */}
              {!status?.telegram_connected && (
                <div className="space-y-3 mt-4 bg-warning/5 border border-warning/10 p-4 rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warning-content flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-warning" />
                    How to setup Telegram delivery
                  </h4>
                  <ul className="steps steps-vertical text-left text-xs font-medium space-y-1.5">
                    <li className="step step-primary text-left pl-3" data-content="1">
                      <span>Click the <b>"Connect Bot"</b> button above. We will open our Telegram bot in a new tab.</span>
                    </li>
                    <li className="step step-primary text-left pl-3" data-content="2">
                      <span>Press <b>"/start"</b> in the chat box to link your session securely.</span>
                    </li>
                    <li className="step step-primary text-left pl-3" data-content="3">
                      <span>Our background worker will verify the link token. Once linked, this page will update automatically!</span>
                    </li>
                  </ul>
                </div>
              )}

              {status?.telegram_connected && (
                <div className="flex items-start gap-2.5 mt-4 text-xs font-medium text-base-content/65 bg-success/5 border border-success/10 p-3.5 rounded-xl">
                  <Info className="w-4 h-4 text-success shrink-0" />
                  <span>Success! You will now receive automated summaries, progress updates, and S3-generated PDF links directly in your Telegram conversations.</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Options / Info Footer */}
          <div className="flex items-center justify-between text-xs text-base-content/40 font-semibold px-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-success" /> End-to-end secure transmission
            </span>
            <span>Researchify Agent Platform v1.0.0</span>
          </div>

        </div>
      )}

    </div>
  );
}
