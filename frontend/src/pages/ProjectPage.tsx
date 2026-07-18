import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { fetchProject, fetchFileUrl } from "../api";
import StatusBadge from "../components/StatusBadge";

const STEPS = ["researching", "writing", "generating_file", "done"];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "done" || status === "failed" ? false : 3000;
    },
  });

  if (!project)
    return <p className="text-gray-500">Loading project…</p>;

  const artifacts = project.artifacts || [];
  const videos = artifacts.filter((a) => a.type === "video_link");
  const sources = artifacts.filter((a) => a.type === "source_link");
  const currentStep = STEPS.indexOf(project.status);

  const handleDownload = async () => {
    const { url } = await fetchFileUrl(project.id);
    window.open(url, "_blank");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-gray-500 mb-6">{project.topic_prompt}</p>

      {project.status !== "done" && project.status !== "failed" && (
        <div className="flex items-center gap-2 mb-8">
          {["Researching", "Writing", "Building file", "Delivered"].map(
            (label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs ${
                    i <= currentStep
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {label}
                </div>
                {i < 3 && <span className="text-gray-300">→</span>}
              </div>
            )
          )}
        </div>
      )}

      {project.status === "failed" && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          Research failed. Please try creating the project again.
        </div>
      )}

      {project.report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Report</h2>
              <button
                onClick={handleDownload}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
              >
                Download
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{project.report.summary_markdown}</ReactMarkdown>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold mb-2">Delivery</h3>
              <p className="text-sm text-gray-600">
                Email {project.report.sent_email_at ? "✅" : "—"}
              </p>
              <p className="text-sm text-gray-600">
                Telegram {project.report.sent_telegram_at ? "✅" : "—"}
              </p>
            </div>

            {videos.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold mb-2">Videos</h3>
                <div className="space-y-2">
                  {videos.map((v) => (
                    <a
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      className="flex gap-2 items-center text-sm text-indigo-600 hover:underline"
                    >
                      {v.thumbnail_url && (
                        <img
                          src={v.thumbnail_url}
                          className="w-16 h-10 object-cover rounded"
                        />
                      )}
                      <span className="line-clamp-2">{v.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {sources.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold mb-2">Sources</h3>
                <ul className="space-y-1 text-sm">
                  {sources.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target="_blank"
                        className="text-indigo-600 hover:underline line-clamp-1"
                      >
                        {s.title || s.url}
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
