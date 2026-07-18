import type { ProjectStatus } from "../api";

const STYLES: Record<ProjectStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  researching: "bg-blue-100 text-blue-700",
  writing: "bg-purple-100 text-purple-700",
  generating_file: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const LABELS: Record<ProjectStatus, string> = {
  pending: "Pending",
  researching: "Researching",
  writing: "Writing",
  generating_file: "Building file",
  done: "Done",
  failed: "Failed",
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
