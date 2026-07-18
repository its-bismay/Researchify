import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectTelegram,
  fetchIntegrationStatus,
  linkTelegram,
} from "../api";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: status } = useQuery({
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
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold mb-1">Email</h2>
        <p className="text-gray-600 text-sm">{status?.email}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-1">Telegram</h2>
        {status?.telegram_connected ? (
          <div className="flex items-center justify-between">
            <p className="text-green-600 text-sm">Connected ✅</p>
            <button
              onClick={() => disconnectMutation.mutate()}
              className="text-sm text-red-600 hover:underline"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">Not connected</p>
            <button
              onClick={() => linkMutation.mutate()}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              Connect Telegram
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
