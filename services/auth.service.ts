import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { dashboardHref, resolveDashboard, roleLabel } from "@/lib/roles";
import { meSchema, type LoginInput, type Me } from "@/schemas/auth.schema";

// Errors arrive as Error(message) from the interceptor in lib/api.ts

export const authKeys = {
  me: ["me"] as const,
};

const fetchMe = () => api.get("/me/").then((r) => meSchema.parse(r.data));

/** The signed-in user; errors (401/403) mean signed out */
export function useMe() {
  return useQuery<Me>({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<Me, Error, LoginInput>({
    mutationFn: async (data) => {
      const res = await api.post<{ error?: string }>("/login/", data);
      // login/ answers some failures with 200 + { error }
      if (res.data.error) throw new Error(res.data.error);
      return fetchMe();
    },
    onSuccess: (me) => {
      const dashboard = resolveDashboard(me);
      if (!dashboard) {
        toast.error(`${roleLabel(me)} accounts don't have a dashboard here yet.`);
        return;
      }
      queryClient.setQueryData(authKeys.me, me);
      toast.success(`Signed in as ${roleLabel(me)}`);
      router.replace(dashboardHref(dashboard));
    },
    // Errors show inside the login card (components/auth/login-form.tsx)
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => api.post("/logout/").then(() => undefined),
    // Signed out locally even if the server call fails
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });
}
