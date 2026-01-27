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
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function APIKeyPage() {
  const [apikey, setApiKey] = useState<string>("");
  const [completeApiKey, setCompleteApiKey] = useState<string>("");
  const [copyCompleteApiKeyFlag, setCopyCompleteApiKeyFlag] =
    useState<boolean>(false);
  useEffect(() => {
    const getApiKey = async () => {
      const response = await http.get("/apikey/get");
      setApiKey(response.data.data);
    };
    getApiKey();
  }, []);

  const changeAnotherApiKey = async () => {
    const response = await http.post("/apikey/change");
    setApiKey(response.data.data);
  };

  const getCompleteApiKey = async () => {
    const response = await http.get("/apikey/get_complete_apikey");
    setCompleteApiKey(response.data.data);
    setCopyCompleteApiKeyFlag(false);
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
      <h2 className="text-xl font-semibold">Get your Mwin API key</h2>
      <div className="flex gap-2 w-[50%]">
        <div className="flex gap-2 h-9 items-center rounded-md border border-input bg-background px-3 text-sm w-[50%]">
          <IconKey />
          <span className="text-muted-foreground truncate">{apikey}</span>
        </div>
        <div className="flex flex-col gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={getCompleteApiKey}>
                <Label>Check your API key</Label>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mwin API Key</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2">
                <div className="flex gap-2 h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
                  <span className="text-muted-foreground truncate">
                    {completeApiKey}
                  </span>
                </div>
                {copyCompleteApiKeyFlag == false ? (
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

          <Button variant="outline" onClick={changeAnotherApiKey}>
            <Label>Change another</Label>
          </Button>
        </div>
      </div>
    </div>
  );
}
