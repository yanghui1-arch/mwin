import { LLMJsonHighlight } from "./json-highlight";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { useTranslation } from "react-i18next";

interface StepDetailProp {
  labelTitle?: string;
  jsonObject?: Record<string, unknown>;
  errorInfo?: string;
  llmJsonLight?: boolean;
}

export function LLMJsonCard({
  labelTitle,
  jsonObject,
  errorInfo,
  llmJsonLight = true,
}: StepDetailProp) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <Label>{labelTitle}</Label>
      <Card>
        <CardContent>
          <ScrollArea className="max-h-58 overflow-auto rounded-md">
            <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words [overflow-wrap:anywhere] text-left pr-4">
              <code>
                {jsonObject ? (
                  llmJsonLight ? (
                    <LLMJsonHighlight jsonObject={jsonObject} />
                  ) : (
                    <>{JSON.stringify(jsonObject, null, 2)}</>
                  )
                ) : (
                  errorInfo ? errorInfo : t("common.noContent")
                )}
              </code>
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
