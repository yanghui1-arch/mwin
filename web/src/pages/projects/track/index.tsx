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
import { conversationApi } from "@/api/conversation";
import { ConversationTable } from "@/components/conversation-table";
import { conversationColumns, toConversationRow, type Conversation } from "./conversation-columns";

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
  const [conversationData, setConversationData] = useState<Conversation[]>([]);
  const [conversationPagination, setConversationPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 10})
  const [conversationPageCount, setConversationPageCount] = useState<number>(0);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

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

  const refreshConversationData = async () => {
    setConversationLoading(true);
    setConversationError(null);
    try {
      const responseData = await conversationApi.getConversations({
        projectName: name as string,
        page: conversationPagination.pageIndex,
        pageSize: conversationPagination.pageSize,
      });
      const data = responseData.data.map(toConversationRow);
      const newPageCount = responseData.pageCount;
      setConversationPageCount(newPageCount);
      if (data.length === 0 && conversationPagination.pageIndex > 0) {
        const lastPage = Math.max(0, newPageCount - 1);
        setConversationPagination({ ...conversationPagination, pageIndex: lastPage });
        return;
      }
      setConversationData(data);
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : String(error));
    } finally {
      setConversationLoading(false);
    }
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

  const { table: conversationTable } = useManulPaginationDataTable({
    columns: conversationColumns,
    data: conversationData,
    pagination: conversationPagination,
    pageCount: conversationPageCount,
    setPagination: setConversationPagination,
    onRefresh: refreshConversationData,
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

  useEffect(() => {
    void refreshConversationData();
  }, [conversationPagination, name]);

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
        <ConversationTable
          table={conversationTable}
          loading={conversationLoading}
          error={conversationError}
        />
      )}
    </div>
  );
}
