import { useMemo, useState } from "react";
import { AlertTriangle, Clock, DollarSign, Loader2 } from "lucide-react";

import { traceApi, type Track } from "@/api/trace";
import { TraceDialogMain } from "@/components/trace-dialog/trace-dialog-main";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Trace } from "@/pages/projects/track/trace-columns";

type TrackState = { trace: Trace; tracks: Track[]; isLoading: boolean };

const formatDuration = (trace: Trace) => {
  const duration = new Date(trace.lastUpdateTimestamp).getTime() - new Date(trace.startTime).getTime();
  if (!Number.isFinite(duration) || duration < 0) return "--";
  return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
};

const formatCost = (cost: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(cost);

export function ConversationTraceTimeline({ traces }: { traces: Trace[] }) {
  const [trackState, setTrackState] = useState<TrackState | null>(null);
  const sortedTraces = useMemo(
    () => [...traces].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [traces],
  );

  const openTraceDetail = async (trace: Trace) => {
    setTrackState({ trace, tracks: [], isLoading: true });
    const response = await traceApi.getTracks(trace.id);
    setTrackState({ trace, tracks: response.data.code === 200 ? response.data.data : [], isLoading: false });
  };

  if (sortedTraces.length === 0) {
    return <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No traces in this conversation.</div>;
  }

  return (
    <div className="space-y-4">
      {sortedTraces.map((trace, index) => {
        const hasError = Boolean(trace.errorInfo);
        return (
          <Card key={trace.id} className={cn("relative ml-4", hasError && "border-destructive/60 bg-destructive/5")}>
            <div className={cn("absolute -left-4 top-8 h-full border-l", index === sortedTraces.length - 1 && "h-0")} />
            <div className={cn("absolute -left-[22px] top-7 size-4 rounded-full border bg-background", hasError && "border-destructive bg-destructive")} />
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {trace.name}
                    {hasError && <Badge variant="destructive"><AlertTriangle />Error</Badge>}
                  </CardTitle>
                  <CardDescription>{new Date(trace.startTime).toLocaleString()}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => openTraceDetail(trace)}>View details</Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline"><Clock />{formatDuration(trace)}</Badge>
              {trace.tags?.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              {hasError && <p className="w-full truncate text-destructive">{trace.errorInfo}</p>}
            </CardContent>
          </Card>
        );
      })}
      <Dialog open={Boolean(trackState)} onOpenChange={(open) => !open && setTrackState(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          {trackState && <>
            <DialogHeader><DialogTitle>{trackState.trace.name}</DialogTitle></DialogHeader>
            {trackState.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading trace details...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline"><Clock />{formatDuration(trackState.trace)}</Badge>
                  <Badge variant="outline"><DollarSign />{formatCost(trackState.tracks.reduce((sum, track) => sum + (track.cost ?? 0), 0))}</Badge>
                </div>
                <TraceDialogMain data={trackState.trace} tracks={trackState.tracks} />
              </div>
            )}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
