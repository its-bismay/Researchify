import axios from "axios";

export const api = axios.create({
  baseURL: "/",
  withCredentials: true,
});

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  telegram_chat_id?: string | null;
  created_at: string;
}

export type ProjectStatus =
  | "pending"
  | "researching"
  | "writing"
  | "generating_file"
  | "done"
  | "failed";

export interface Project {
  id: string;
  title: string;
  topic_prompt: string;
  status: ProjectStatus;
  created_at: string;
  completed_at?: string | null;
}

export interface Artifact {
  id: string;
  type: "source_link" | "image" | "video_link" | "note";
  url: string;
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  source_agent: string;
}

export interface Report {
  id: string;
  summary_markdown: string;
  sent_email_at?: string | null;
  sent_telegram_at?: string | null;
}

export interface ProjectDetail extends Project {
  report?: Report | null;
  artifacts: Artifact[];
}

export interface IntegrationStatus {
  telegram_connected: boolean;
  email: string;
}

export const fetchMe = () => api.get<User>("/auth/me").then((r) => r.data);

export const fetchProjects = () =>
  api.get<Project[]>("/projects").then((r) => r.data);

export const fetchProject = (id: string) =>
  api.get<ProjectDetail>(`/projects/${id}`).then((r) => r.data);

export const fetchProjectStatus = (id: string) =>
  api
    .get<{ id: string; status: ProjectStatus }>(`/projects/${id}/status`)
    .then((r) => r.data);

export const createProject = (title: string, topic: string) =>
  api.post<Project>("/projects", { title, topic }).then((r) => r.data);

export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`).then((r) => r.data);

export const fetchFileUrl = (id: string) =>
  api
    .get<{ url: string; expires_in: number }>(`/projects/${id}/file`)
    .then((r) => r.data);

export const fetchIntegrationStatus = () =>
  api.get<IntegrationStatus>("/integrations/status").then((r) => r.data);

export const linkTelegram = () =>
  api
    .post<{ deep_link: string }>("/integrations/telegram/link")
    .then((r) => r.data);

export const disconnectTelegram = () =>
  api.delete("/integrations/telegram").then((r) => r.data);

export const logout = () => api.post("/auth/logout").then((r) => r.data);
