import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import type { Trace } from "@/pages/projects/track/trace-columns";
import { TraceDialogIOPanel } from "./trace-dialog-io";
import { TraceDialogProcessPanel } from "./trace-dailog-process-flow";
import { type Track } from "@/api/trace";
import { useTranslation } from "react-i18next";

interface TraceDialogMainProps {
  data: Trace;
  tracks: Track[];
}

export function TraceDialogMain({ data, tracks }: TraceDialogMainProps) {
  const [displayType, setDisplayType] = useState<"io" | "process">("io");
  const { t } = useTranslation();

  return (
    <div className="flex gap-4 flex-col">
      <div className="flex gap-2">
        <Button
          variant="link"
          className={displayType === "io" ? "bg-foreground text-black" : ""}
          onClick={() => {
            setDisplayType("io");
          }}
        >
          <Label>{t("traceDialog.inputOutput")}</Label>
        </Button>
        <Button
          variant="link"
          className={
            displayType === "process" ? "bg-foreground text-black" : ""
          }
          onClick={() => {
            setDisplayType("process");
          }}
        >
          <Label>{t("traceDialog.processFlow")}</Label>
        </Button>
      </div>
      <div>
        {displayType === "io" && <TraceDialogIOPanel data={data}/>}
        {displayType === "process" && <TraceDialogProcessPanel tracks={tracks} input={data.input} output={data.output?.func_output} errorInfo={data.errorInfo}/>}
      </div>
    </div>
  );
}
