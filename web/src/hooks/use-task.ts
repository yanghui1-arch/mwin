import { useEffect, useRef } from "react";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type TaskStatus<TData> = {
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  data: TData
}

type UseTaskPollingOptions<TData> = {
    taskId: string | null;
    enabled: boolean;
    intervalMs?: number;
    fetchStatus: (
      taskId: string,
      signal: AbortSignal
    ) => Promise<TaskStatus<TData>>;
    onUpdate?: (data: TaskStatus<TData>) => void;
    onDone?: (data: TaskStatus<TData>) => void;
  };


/**
 * Post requests in the beckend every intervalMs ms to fetch task status.
 * It's automatically to request when calling useTaskPolling() and will stop when task is done.
 * 
 * @param taskId task id
 * @param enabled whether allowed to post requests
 * @param intervalMs interval
 * @param fetchStatus a function to get task status
 * @param onUpdate a function to do something after get task status.
 * @param onDone a function if task is done.
 */
export function useTaskPolling<TData>({
  taskId,
  enabled,
  intervalMs = 100,
  fetchStatus,
  onUpdate,
  onDone,
}: UseTaskPollingOptions<TData>) {
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    // disable or task id is null
    if (!enabled || !taskId) return;

    // abort previous subscription
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    runningRef.current = true;

    const poll = async () => {
      while (runningRef.current) {
        try {
          const data = await fetchStatus(taskId, controller.signal);
          onUpdate?.(data);

          if (data.status === "SUCCESS" || data.status === "FAILURE") {
            onDone?.(data);
            break;
          }
        } catch (err) {
          if (controller.signal.aborted) break;
          console.error("polling error:", err);
        }

        await sleep(intervalMs);
      }
    };

    poll();

    return () => {
      runningRef.current = false;
      controller.abort();
    };
  }, [taskId, enabled, intervalMs, fetchStatus, onUpdate, onDone]);
}