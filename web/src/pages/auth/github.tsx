import { authApi } from "@/api/auth";
import { useUser } from "@/components/user-provider/use-user";
import { MWIN_JWT, GITHUB_CODE_FLAG } from "@/types/storage-const";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GitHubAuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setUser } = useUser();

  useEffect(() => {
    const githubCode = searchParams.get("code");

    if (!githubCode) {
      return;
    }
    const handledCode = sessionStorage.getItem(GITHUB_CODE_FLAG);

    if (handledCode === githubCode) {
      return;
    }

    sessionStorage.setItem(GITHUB_CODE_FLAG, githubCode);
    authApi
      .authenticate(githubCode)
      .then((res) => {
        const { code, message, data } = res.data;
        console.log(code);
        if (code === 200) {
          toast.success("Welcome to Mwin!");
          localStorage.setItem(MWIN_JWT, data.token);
          setUser({ userName: data.userName, avatar: data.avatar });
          setSearchParams({}, { replace: true });
          navigate("/projects", { replace: true });
        } else {
          toast.error("Failed to authentication with GitHub", {
            description: message ?? "Unexpected error",
          });
        }
      })
      .catch((error) => {
        sessionStorage.removeItem(GITHUB_CODE_FLAG);
        console.error("GitHub authenticate error:", error);
        const msg =
          (error.response && error.response.data?.message) ||
          error.message ||
          "Network error";
        toast.error("Failed to authentication with GitHub", {
          description: msg,
        });
      });
  }, [searchParams, navigate, setSearchParams, setUser]);

  return (
    <div className="flex h-screen items-center justify-center px-4" aria-busy="true">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
