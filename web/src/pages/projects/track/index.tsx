import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { stepColumns, type Step } from "./step-columns";
import { Separator } from "@/components/ui/separator";
import { StepTable } from "@/components/step-table";
import { traceColumns, type Trace } from "./trace-columns";
import { TraceTable } from "@/components/trace-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import http from "@/api/http";
import { useManulPaginationDataTable } from "@/hooks/use-datatable";
import { type PaginationState} from "@tanstack/react-table";

type Conversation = {
  id: string;
  traceCount: number;
  startTime: string;
  lastUpdateTimestamp: string;
};

type ConversationPage = {
  data: Conversation[];
  pageCount: number;
};

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString("sv-SE").replace("T", " ") : "";
}

function ConversationPanel({ projectName }: { projectName: string }) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get<{ data: ConversationPage }>(
          `/v0/conversations/${encodeURIComponent(projectName)}`
        );
        setConversations(response.data.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [projectName]);

  if (loading) {
    return <div className="py-6 text-center text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="py-6 text-center text-destructive">{error}</div>;
  }

  if (conversations.length === 0) {
    return <div className="py-6 text-center text-muted-foreground">No conversations.</div>;
  }

  return (
    <ScrollArea className="w-full rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors">
            <th className="h-10 px-4 text-left align-middle font-medium">ID</th>
            <th className="h-10 px-4 text-center align-middle font-medium">{t("track.trace")}</th>
            <th className="h-10 px-4 text-center align-middle font-medium">{t("track.columns.startTime")}</th>
            <th className="h-10 px-4 text-center align-middle font-medium">{t("track.columns.lastUpdate")}</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {conversations.map((conversation) => (
            <tr key={conversation.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="p-4 align-middle font-mono text-xs">
                <div className="w-48 truncate">{conversation.id}</div>
              </td>
              <td className="p-4 text-center align-middle">{conversation.traceCount}</td>
              <td className="p-4 text-center align-middle">{formatDateTime(conversation.startTime)}</td>
              <td className="p-4 text-center align-middle">{formatDateTime(conversation.lastUpdateTimestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

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
        <ConversationPanel projectName={name as string} />
      )}
    </div>
  );
}
