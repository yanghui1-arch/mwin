import http from "@/api/http";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { IconCheck, IconCopy, IconKey } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export function APIKeyPage() {
  const [copyCompleteApiKeyFlag, setCopyCompleteApiKeyFlag] =
    useState<boolean>(false);

  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: apikey, isLoading: isApiKeyLoading } = useQuery({
    queryKey: ["apikey"],
    queryFn: async () => {
      const response = await http.get("/apikey/get");
      return response.data.data;
    },
  });

  const {
    data: completeApiKey = "",
    refetch: fetchCompleteApiKey,
    isFetching: isCompleteApiKeyLoading,
  } = useQuery({
    queryKey: ["completeApiKey"],
    queryFn: async () => {
      const response = await http.get("/apikey/get_complete_apikey");
      return response.data.data as string;
    },
    enabled: false,
  });

  const { mutate: changeAnotherApiKey, isPending: isChangingApiKey } = useMutation({
    mutationFn: async () => {
      const response = await http.post("/apikey/change");
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["apikey"], data);
    },
  });

  const getCompleteApiKey = async () => {
    setCopyCompleteApiKeyFlag(false);
    await fetchCompleteApiKey();
  };

  const copyCompleteApiKey = async () => {
    navigator.clipboard.writeText(completeApiKey);
    setCopyCompleteApiKeyFlag(true);
    toast("Successfully copy Mwin API key", {
      description: "Don't let others know your API key.",
    });
  };

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <h2 className="text-xl font-semibold">{t("main.apiKey.title")}</h2>
      <div className="flex gap-2 w-[50%]">
        <div
          className="flex h-9 w-[50%] items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
          aria-busy={isApiKeyLoading || isChangingApiKey}
        >
          <IconKey />
          {isApiKeyLoading || isChangingApiKey ? (
            <Skeleton className="h-4 flex-1" />
          ) : (
            <span className="text-muted-foreground truncate">{apikey}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={getCompleteApiKey}>
                <Label>{t("main.apiKey.checkApiKey")}</Label>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("main.apiKey.dialogTitle")}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2" aria-busy={isCompleteApiKeyLoading}>
                <div className="flex gap-2 h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
                  {isCompleteApiKeyLoading ? (
                    <Skeleton className="h-4 w-64" />
                  ) : (
                    <span className="text-muted-foreground truncate">
                      {completeApiKey}
                    </span>
                  )}
                </div>
                {isCompleteApiKeyLoading ? (
                  <Skeleton className="size-9" />
                ) : copyCompleteApiKeyFlag == false ? (
                  <IconCopy
                    className="h-9 cursor-pointer"
                    stroke={1}
                    onClick={copyCompleteApiKey}
                  />
                ) : (
                  <IconCheck className="h-9" stroke={1} />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => changeAnotherApiKey()}
            disabled={isChangingApiKey}
          >
            {isChangingApiKey ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <Label>{t("main.apiKey.changeApiKey")}</Label>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
