import { LLMJsonCard } from "./llm-json-card";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface FunctionIOCardProps {
  labelTitle: string;
  data?: string | Record<string, unknown>;
  errorInfo?: string;
  className?: string;
}
/**
 * Tracked function input or output card
 * The component renders input or output as a card
 * 
 * @example
 * ```tsx
 * const data = {foo: "bar"}
 * <FunctionIOCard data={data} labelTitle="input" errorInfo="Errors" />
 * ```
 */
export function FunctionIOCard({
  labelTitle,
  data,
  errorInfo,
  className,
}: FunctionIOCardProps) {
  const { t } = useTranslation()
  return (
    <div className={cn("flex flex-col flex-1 gap-4", className)}>
      {data && typeof data === "string" ? (
        <>
          <Label>{labelTitle}</Label>
          <Card>
            <CardContent>
              <ScrollArea className="max-h-58 overflow-auto rounded-md">
                <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words [overflow-wrap:anywhere] text-left">
                  <code>
                    {JSON.stringify(
                      data ? data : errorInfo ?? t("common.somethingErrors"),
                      null,
                      2
                    )}
                  </code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : (
        <LLMJsonCard
          labelTitle={labelTitle}
          jsonObject={data as Record<string, undefined>}
          errorInfo={errorInfo}
          llmJsonLight={false}
        />
      )}
    </div>
  );
}
