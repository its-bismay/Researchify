import type { ProjectStatus } from "../api";
import { 
  Clock, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  switch (status) {
    case "pending":
      return (
        <span className="badge badge-neutral gap-1.5 py-2.5 px-3 font-semibold text-xs text-neutral-content">
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    case "researching":
      return (
        <span className="badge badge-primary gap-1.5 py-2.5 px-3 font-semibold text-xs text-primary-content animate-pulse">
          <span className="loading loading-spinner w-3 h-3 text-current"></span>
          Researching
        </span>
      );
    case "writing":
      return (
        <span className="badge badge-secondary gap-1.5 py-2.5 px-3 font-semibold text-xs text-secondary-content animate-pulse">
          <span className="loading loading-spinner w-3 h-3 text-current"></span>
          Writing Report
        </span>
      );
    case "generating_file":
      return (
        <span className="badge badge-accent gap-1.5 py-2.5 px-3 font-semibold text-xs text-accent-content animate-pulse">
          <span className="loading loading-spinner w-3 h-3 text-current"></span>
          Building File
        </span>
      );
    case "done":
      return (
        <span className="badge badge-success gap-1.5 py-2.5 px-3 font-semibold text-xs text-success-content">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Delivered
        </span>
      );
    case "failed":
      return (
        <span className="badge badge-error gap-1.5 py-2.5 px-3 font-semibold text-xs text-error-content">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    default:
      return <span className="badge badge-ghost py-2 px-3 text-xs">{status}</span>;
  }
}
