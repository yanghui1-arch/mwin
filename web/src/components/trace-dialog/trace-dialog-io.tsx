import { LLMJsonCard } from "../llm-json-card";
import { FunctionIOCard } from "../fn-io-card";
import { useTranslation } from "react-i18next";
import type { TracePayload } from "@/api/payload";

interface TraceDialogIOPanelProps {
  payload: TracePayload | null;
  payloadError: string | null;
  errorInfo?: string | null;
}

export function TraceDialogIOPanel({
  payload,
  payloadError,
  errorInfo,
}: TraceDialogIOPanelProps) {
  if (payloadError) {
    return <LLMJsonCard errorInfo={payloadError} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <TraceDialogInputPanel input={payload?.input ?? undefined} />
      <TraceDialogOutputPanel
        output={payload?.output?.func_output}
        errorInfo={errorInfo}
      />
    </div>
  );
}

interface TraceDialogInputProps {
  input?: Record<string, unknown>;
}

function TraceDialogInputPanel({ input }: TraceDialogInputProps) {
  const { t } = useTranslation();
  return <LLMJsonCard labelTitle={t("traceDialog.input")} jsonObject={input} />;
}

interface TraceDialogOutputProps {
  output?: unknown;
  errorInfo?: string | null;
}

function TraceDialogOutputPanel({ output, errorInfo }: TraceDialogOutputProps) {
  const { t } = useTranslation();
  return (
    <FunctionIOCard labelTitle={t("traceDialog.output")} data={output} errorInfo={errorInfo} />
  );
}
