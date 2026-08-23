import { isPositive, toDecimalString } from '../lib/decimal.js';
import { calcUsageCost } from './pricing.js';
import type { ProjectService } from './project.js';
import { stringField } from './project.js';
import type { BatchStepWrite, BatchTraceWrite, JsonObject, LogRequest, LogTraceTreeRequest, Project, S3CompatibleObject, Step, StepMeta, StepPayload, Trace, TracePayload } from '../domain/types.js';
import type { PayloadObjectStorage } from '../storage/aliyun-oss.js';

interface LogRepositories {
  upsertTraceForUser(userId: string, trace: Trace, payloadObject: S3CompatibleObject): Promise<void>;
  upsertBatchForUser(userId: string, traces: BatchTraceWrite[], steps: BatchStepWrite[], projectIds: number[]): Promise<void>;
  findStepMetaForUser(userId: string, stepId: string): Promise<StepMeta | null>;
  upsertStepForUser(userId: string, step: Step, payloadObject: S3CompatibleObject, metadata: JsonObject, cost: string): Promise<void>;
}

export class LogService {
  constructor(
    private readonly repositories: LogRepositories,
    private readonly projectService: Pick<ProjectService, 'ensureProject'>,
    private readonly payloadStorage: PayloadObjectStorage,
  ) {}

  /** Validates a trace, then writes it and its aggregate update as one D1 transaction. */
  async logTrace(userId: string, request: LogRequest): Promise<string> {
    const projectName = stringField(request.project_name ?? request.projectName, 'project name');
    const traceId = stringField(request.trace_id ?? request.traceId, 'trace id');
    const project = await this.projectService.ensureProject(userId, projectName);
    const incoming = toIncomingTrace(request, project);
    const payloadObject = await this.payloadStorage.storeTrace(traceId, incoming.payload);
    await this.repositories.upsertTraceForUser(
      userId,
      { ...incoming.trace, payloadObjectKey: payloadObject.objectKey },
      payloadObject,
    );
    return traceId;
  }

  /** Validates a step, then atomically writes the step, metadata, and project-cost delta. */
  async logStep(userId: string, request: LogRequest): Promise<string> {
    const projectName = stringField(request.project_name ?? request.projectName, 'project name');
    const stepId = stringField(request.step_id ?? request.stepId, 'step id');
    const project = await this.projectService.ensureProject(userId, projectName);
    const incoming = toIncomingStep(request, project);
    const payloadObject = await this.payloadStorage.storeStep(stepId, incoming.payload);
    const step: Step = { ...incoming.step, payloadObjectKey: payloadObject.objectKey };
    const previousMeta = await this.repositories.findStepMetaForUser(userId, stepId);
    const previousCost = previousMeta?.cost ?? toDecimalString(0);
    const newCost = calcUsageCost(request.llm_provider ?? request.llmProvider, step.model, step.usage);
    const mergedCost = isPositive(newCost) ? newCost : previousCost;
    const oldMetadata = previousMeta ? JSON.parse(previousMeta.metadata) as { description?: string } : {};
    await this.repositories.upsertStepForUser(
      userId,
      step,
      payloadObject,
      { description: request.description ?? oldMetadata.description ?? null },
      mergedCost,
    );
    return stepId;
  }

  /** Writes one complete trace-tree snapshot in one D1 transaction. */
  async logTraceTree(userId: string, request: LogTraceTreeRequest) {
    if (!Array.isArray(request.traces) || !Array.isArray(request.steps)) {
      throw new Error('A trace tree must contain traces and steps arrays');
    }

    const traceRequests = request.traces;
    const stepRequests = request.steps;

    const projectNames = new Set(
      [...traceRequests, ...stepRequests].map((item) =>
        stringField(item.project_name ?? item.projectName, 'project name')),
    );
    if (projectNames.size > 1) {
      throw new Error('A TraceTree must belong to exactly one project');
    }
    const projects = new Map<string, Project>();
    for (const projectName of projectNames) {
      projects.set(projectName, await this.projectService.ensureProject(userId, projectName));
    }

    const traces = await mapWithConcurrency(traceRequests, 4, async (item): Promise<BatchTraceWrite> => {
      const projectName = stringField(item.project_name ?? item.projectName, 'project name');
      const incoming = toIncomingTrace(item, projects.get(projectName)!);
      const payloadObject = await this.payloadStorage.storeTrace(incoming.trace.id, incoming.payload);
      return {
        trace: { ...incoming.trace, payloadObjectKey: payloadObject.objectKey },
        payloadObject,
      };
    });
    const steps = await mapWithConcurrency(stepRequests, 4, async (item): Promise<BatchStepWrite> => {
      const projectName = stringField(item.project_name ?? item.projectName, 'project name');
      const incoming = toIncomingStep(item, projects.get(projectName)!);
      const payloadObject = await this.payloadStorage.storeStep(incoming.step.id, incoming.payload);
      const step: Step = { ...incoming.step, payloadObjectKey: payloadObject.objectKey };
      return {
        step,
        payloadObject,
        metadata: { description: item.description ?? null },
        cost: calcUsageCost(item.llm_provider ?? item.llmProvider, step.model, step.usage),
      };
    });
    await this.repositories.upsertBatchForUser(
      userId,
      traces,
      steps,
      [...projects.values()].map((project) => project.id),
    );
    return {
      traces: traces.length,
      steps: steps.length,
    };
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }));
  return results;
}

interface IncomingTrace {
  trace: Omit<Trace, 'payloadObjectKey'>;
  payload: TracePayload;
}

interface IncomingStep {
  step: Omit<Step, 'payloadObjectKey'>;
  payload: StepPayload;
}

function toIncomingTrace(request: LogRequest, project: Project): IncomingTrace {
  return {
    trace: {
      id: stringField(request.trace_id ?? request.traceId, 'trace id'),
      parentTraceId: request.parent_trace_id ?? request.parentTraceId ?? null,
      projectName: project.name,
      projectId: project.id,
      name: stringField(request.trace_name ?? request.traceName, 'trace name'),
      conversationId: stringField(request.conversation_id ?? request.conversationId, 'conversation id'),
      tags: request.tags ?? [],
      errorInfo: request.error_info ?? request.errorInfo ?? null,
      startTime: stringField(request.start_time ?? request.startTime, 'start time'),
      lastUpdateTimestamp: stringField(
        request.last_update_timestamp ?? request.lastUpdateTimestamp,
        'last update timestamp',
      ),
    },
    payload: {
      input: request.input ?? null,
      output: request.output ?? null,
    },
  };
}

function toIncomingStep(request: LogRequest, project: Project): IncomingStep {
  const traceId = request.trace_id ?? request.traceId;
  return {
    step: {
      id: stringField(request.step_id ?? request.stepId, 'step id'),
      name: stringField(request.step_name ?? request.stepName, 'step name'),
      traceId: traceId === undefined ? null : stringField(traceId, 'trace id'),
      parentStepId: request.parent_step_id ?? request.parentStepId ?? null,
      type: stringField(request.step_type ?? request.stepType, 'step type'),
      tags: request.tags ?? [],
      errorInfo: request.error_info ?? request.errorInfo ?? null,
      model: request.model ?? null,
      usage: request.usage ?? null,
      projectName: project.name,
      projectId: project.id,
      startTime: stringField(request.start_time ?? request.startTime, 'start time'),
      endTime: request.end_time ?? request.endTime ?? null,
    },
    payload: {
      input: request.input ?? null,
      output: request.output ?? null,
    },
  };
}
