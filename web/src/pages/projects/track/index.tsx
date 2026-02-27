import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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

export default function ProjectDetailPage() {
  const { name } = useParams<{ name: string }>();
  const location = useLocation();
  const projectDescription = location.state.description;
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
  const [traceData, setTraceData] = useState<Trace[]>([]);
  const [tracePagination, setTracePagination] = useState<PaginationState>({pageIndex: 0, pageSize: 10})
  const [tracePageCount, setTracePageCount] = useState<number>(0);

  const refreshStepData = async () => {
    const response = await http.get(
      `/v0/step/${encodeURIComponent(name as string)}?page=${pagination.pageIndex}&pageSize=${pagination.pageSize}`
    );
    const responseData = response.data.data;
    const data = responseData.data;
    const newPageCount = responseData.pageCount;
    setPageCount(newPageCount);
    if (data.length === 0 && pagination.pageIndex > 0) {
      const lastPage = Math.max(0, newPageCount - 1);
      setPagination({ ...pagination, pageIndex: lastPage });
      return;
    }
    setStepData(data);
  };

  const refreshTraceData = async () => {
    const response = await http.get(
      `/v0/trace/${encodeURIComponent(name as string)}?page=${tracePagination.pageIndex}&pageSize=${tracePagination.pageSize}`
    );
    const responseData = response.data.data;
    const data = responseData.data;
    const newPageCount = responseData.pageCount;
    setTracePageCount(newPageCount);
    if (data.length === 0 && tracePagination.pageIndex > 0) {
      const lastPage = Math.max(0, newPageCount - 1);
      setTracePagination({ ...tracePagination, pageIndex: lastPage });
      return;
    }
    setTraceData(data);
  };

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
    const loadStepDataOfProject = async () => {
      const response = await http.get(
        `/v0/step/${encodeURIComponent(name as string)}?page=${pagination.pageIndex}&pageSize=${pagination.pageSize}`
      );
      const responseData = response.data.data;
      const data = responseData.data;
      const pageCount = responseData.pageCount;
      setStepData(data);
      setPageCount(pageCount)
    };
    const loadTraceDataOfProject = async () => {
      const response = await http.get(
        `/v0/trace/${encodeURIComponent(name as string)}?page=${tracePagination.pageIndex}&pageSize=${tracePagination.pageSize}`
      );
      const responseData = response.data.data;
      const data = responseData.data;
      const pageCount = responseData.pageCount;
      setTraceData(data);
      setTracePageCount(pageCount)
    };
    loadStepDataOfProject();
    loadTraceDataOfProject();
  }, [pagination, name, tracePagination]);

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
        <StepTable table={stepTable} />
      ) : navButtonType === "trace" ? (
        <div>
          <TraceTable table={traceTable} />
        </div>
      ) : (
        t("track.unknown")
      )}
    </div>
  );
}
