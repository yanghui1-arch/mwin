import { isPositive, toDecimalString } from '../lib/decimal.js';
import { calcUsageCost } from './pricing.js';
import type { ProjectService } from './project.js';
import { stringField } from './project.js';
import type { BatchStepWrite, JsonObject, LogRequest, LogTraceTreeRequest, Project, Step, StepMeta, Trace } from '../domain/types.js';
import { mergeStep } from './mappers.js';

interface LogRepositories {
  upsertTraceForUser(userId: string, trace: Trace): Promise<void>;
  upsertBatchForUser(userId: string, traces: Trace[], steps: BatchStepWrite[], projectIds: number[]): Promise<void>;
  findStepForUser(userId: string, stepId: string): Promise<Step | null>;
  findStepMetaForUser(userId: string, stepId: string): Promise<StepMeta | null>;
  upsertStepForUser(userId: string, step: Step, metadata: JsonObject, cost: string): Promise<void>;
}

export class LogService {
  constructor(private readonly repositories: LogRepositories, private readonly projectService: Pick<ProjectService, 'ensureProject'>) {}

  /** Validates a trace, then writes it and its aggregate update as one D1 transaction. */
  async logTrace(userId: string, request: LogRequest): Promise<string> {
    const projectName = stringField(request.project_name ?? request.projectName, 'project name');
    const traceId = stringField(request.trace_id ?? request.traceId, 'trace id');
    const project = await this.projectService.ensureProject(userId, projectName);
    await this.repositories.upsertTraceForUser(userId, toIncomingTrace(request, project));
    return traceId;
  }

  /** Validates a step, then atomically writes the step, metadata, and project-cost delta. */
  async logStep(userId: string, request: LogRequest): Promise<string> {
    const projectName = stringField(request.project_name ?? request.projectName, 'project name');
    const stepId = stringField(request.step_id ?? request.stepId, 'step id');
    const project = await this.projectService.ensureProject(userId, projectName);
    const existing = await this.repositories.findStepForUser(userId, stepId);
    const step = mergeStep(existing, toIncomingStep(request, project));
    const previousMeta = await this.repositories.findStepMetaForUser(userId, stepId);
    const previousCost = previousMeta?.cost ?? toDecimalString(0);
    const newCost = calcUsageCost(request.llm_provider ?? request.llmProvider, step.model, step.usage);
    const mergedCost = isPositive(newCost) ? newCost : previousCost;
    const oldMetadata = previousMeta ? JSON.parse(previousMeta.metadata) as { description?: string } : {};
    await this.repositories.upsertStepForUser(
      userId,
      step,
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
    const projects = new Map<string, Project>();
    for (const projectName of projectNames) {
      projects.set(projectName, await this.projectService.ensureProject(userId, projectName));
    }

    const traces = traceRequests.map((item) => {
      const projectName = stringField(item.project_name ?? item.projectName, 'project name');
      return toIncomingTrace(item, projects.get(projectName)!);
    });
    const steps = stepRequests.map((item): BatchStepWrite => {
      const projectName = stringField(item.project_name ?? item.projectName, 'project name');
      const step = toIncomingStep(item, projects.get(projectName)!);
      return {
        step,
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

function toIncomingTrace(request: LogRequest, project: Project): Trace {
  return {
    id: stringField(request.trace_id ?? request.traceId, 'trace id'),
    parentTraceId: request.parent_trace_id ?? request.parentTraceId ?? null,
    projectName: project.name,
    projectId: project.id,
    name: stringField(request.trace_name ?? request.traceName, 'trace name'),
    conversationId: stringField(request.conversation_id ?? request.conversationId, 'conversation id'),
    tags: request.tags ?? [],
    input: request.input ?? null,
    output: request.output ?? null,
    errorInfo: request.error_info ?? request.errorInfo ?? null,
    startTime: stringField(request.start_time ?? request.startTime, 'start time'),
    lastUpdateTimestamp: stringField(
      request.last_update_timestamp ?? request.lastUpdateTimestamp,
      'last update timestamp',
    ),
  };
}

function toIncomingStep(request: LogRequest, project: Project): Step {
  const traceId = request.trace_id ?? request.traceId;
  return {
    id: stringField(request.step_id ?? request.stepId, 'step id'),
    name: stringField(request.step_name ?? request.stepName, 'step name'),
    traceId: traceId === undefined ? null : stringField(traceId, 'trace id'),
    parentStepId: request.parent_step_id ?? request.parentStepId ?? null,
    type: stringField(request.step_type ?? request.stepType, 'step type'),
    tags: request.tags ?? [],
    input: request.input ?? null,
    output: request.output ?? null,
    errorInfo: request.error_info ?? request.errorInfo ?? null,
    model: request.model ?? null,
    usage: request.usage ?? null,
    projectName: project.name,
    projectId: project.id,
    startTime: stringField(request.start_time ?? request.startTime, 'start time'),
    endTime: request.end_time ?? request.endTime ?? null,
  };
}
