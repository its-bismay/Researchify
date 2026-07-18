import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";

export function useAuth() {
  const query = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  };
}
