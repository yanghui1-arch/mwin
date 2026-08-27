import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { stepColumns, type Step } from "./step-columns";
import { Separator } from "@/components/ui/separator";
import { StepTable } from "@/components/step-table";
import { traceColumns, type Trace } from "./trace-columns";
import { TraceTable } from "@/components/trace-table";
import http from "@/api/http";
import { useManulPaginationDataTable } from "@/hooks/use-datatable";
import { type PaginationState} from "@tanstack/react-table";
import { normalizeStep, normalizeTrace } from "@/lib/track";

export default function ProjectDetailPage() {
  const { name } = useParams<{ name: string }>();
  const location = useLocation();
  const projectDescription = location.state?.description ?? "";
  const { t } = useTranslation();

  const [navButtonType, setNavButtonType] = useState<
    "step" | "trace" | "conversation"
  >("step");
  const isNavButtonDisabled = (buttonType: string) => {
    return navButtonType === buttonType;
  };

  const [stepData, setStepData] = useState<Step[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 10})
  const [pageCount, setPageCount] = useState<number>(0);
  const [stepLoading, setStepLoading] = useState(true);
  const [traceData, setTraceData] = useState<Trace[]>([]);
  const [tracePagination, setTracePagination] = useState<PaginationState>({pageIndex: 0, pageSize: 10})
  const [tracePageCount, setTracePageCount] = useState<number>(0);
  const [traceLoading, setTraceLoading] = useState(true);

  const refreshStepData = useCallback(async () => {
    setStepLoading(true);
    try {
      const response = await http.get(
        `/v0/step/${encodeURIComponent(name as string)}?page=${pagination.pageIndex}&pageSize=${pagination.pageSize}`
      );
      const responseData = response.data.data;
      const data = responseData.data;
      const newPageCount = responseData.pageCount;
      setPageCount(newPageCount);
      if (data.length === 0 && pagination.pageIndex > 0) {
        const lastPage = Math.max(0, newPageCount - 1);
        setPagination((current) => ({ ...current, pageIndex: lastPage }));
        return;
      }
      setStepData(data.map(normalizeStep));
    } catch (error) {
      console.error("Failed to load steps:", error);
      setStepData([]);
    } finally {
      setStepLoading(false);
    }
  }, [name, pagination.pageIndex, pagination.pageSize]);

  const refreshTraceData = useCallback(async () => {
    setTraceLoading(true);
    try {
      const response = await http.get(
        `/v0/trace/${encodeURIComponent(name as string)}?page=${tracePagination.pageIndex}&pageSize=${tracePagination.pageSize}`
      );
      const responseData = response.data.data;
      const data = responseData.data;
      const newPageCount = responseData.pageCount;
      setTracePageCount(newPageCount);
      if (data.length === 0 && tracePagination.pageIndex > 0) {
        const lastPage = Math.max(0, newPageCount - 1);
        setTracePagination((current) => ({ ...current, pageIndex: lastPage }));
        return;
      }
      setTraceData(data.map(normalizeTrace));
    } catch (error) {
      console.error("Failed to load traces:", error);
      setTraceData([]);
    } finally {
      setTraceLoading(false);
    }
  }, [name, tracePagination.pageIndex, tracePagination.pageSize]);

  const { table: stepTable } = useManulPaginationDataTable({
    columns: stepColumns,
    data: stepData,
    pagination: pagination,
    pageCount: pageCount,
    setPagination: setPagination,
    onRefresh: refreshStepData,
  });

  const { table: traceTable } = useManulPaginationDataTable({
    columns: traceColumns,
    data: traceData,
    pagination: tracePagination,
    pageCount: tracePageCount,
    setPagination: setTracePagination,
    onRefresh: refreshTraceData,
  });

  useEffect(() => {
    if (navButtonType === "step") void refreshStepData();
  }, [navButtonType, refreshStepData]);

  useEffect(() => {
    if (navButtonType === "trace") void refreshTraceData();
  }, [navButtonType, refreshTraceData]);

  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6">
      <h2 className="text-xl font-semibold">{name}</h2>
      <p className="text-muted-foreground mt-2 truncate">
        {projectDescription}
      </p>
      <div className="mt-4">
        <Link to="/projects" className="underline">
          {t("track.backToProjects")}
        </Link>
      </div>
      <div className="flex gap-4 py-2">
        <Button
          variant="link"
          className={isNavButtonDisabled("step") ? "bg-primary text-primary-foreground" : ""}
          onClick={() => {
            if (isNavButtonDisabled("step")) {
              return;
            }
            setNavButtonType("step");
          }}
        >
          {t("track.step")}
        </Button>
        <Button
          variant="link"
          className={isNavButtonDisabled("trace") ? "bg-primary text-primary-foreground" : ""}
          onClick={() => {
            if (isNavButtonDisabled("trace")) {
              return;
            }
            setNavButtonType("trace");
          }}
        >
          {t("track.trace")}
        </Button>
        <Button
          variant="link"
          className={
            isNavButtonDisabled("conversation") ? "bg-primary text-primary-foreground" : ""
          }
          onClick={() => {
            if (isNavButtonDisabled("conversation")) {
              return;
            }
            setNavButtonType("conversation");
          }}
        >
          {t("track.conversation")}
        </Button>
      </div>
      <Separator />
      {navButtonType === "step" ? (
        <StepTable table={stepTable} isLoading={stepLoading} />
      ) : navButtonType === "trace" ? (
        <div>
          <TraceTable table={traceTable} isLoading={traceLoading} />
        </div>
      ) : (
        t("track.unknown")
      )}
    </div>
  );
}
