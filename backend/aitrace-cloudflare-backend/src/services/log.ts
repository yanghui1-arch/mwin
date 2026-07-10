import { isPositive, toDecimalString } from '../lib/decimal.js';
import { calcUsageCost } from './pricing.js';
import type { ProjectService } from './project.js';
import { stringField } from './project.js';
import type { JsonObject, LogRequest, Project, Step, StepMeta, Trace } from '../domain/types.js';
import { mergeStep } from './mappers.js';

interface LogRepositories {
  upsertTraceForUser(userId: string, trace: Trace): Promise<void>;
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
    const traceName = stringField(request.trace_name ?? request.traceName, 'trace name');
    const conversationId = stringField(request.conversation_id ?? request.conversationId, 'conversation id');
    const startTime = stringField(request.start_time ?? request.startTime, 'start time');
    const lastUpdateTimestamp = stringField(request.last_update_timestamp ?? request.lastUpdateTimestamp, 'last update timestamp');
    const project = await this.projectService.ensureProject(userId, projectName);
    await this.repositories.upsertTraceForUser(userId, {
      id: traceId, projectName, projectId: project.id, name: traceName, conversationId, tags: request.tags ?? [],
      input: request.input ?? null, output: request.output ?? null, errorInfo: request.error_info ?? request.errorInfo ?? null,
      startTime, lastUpdateTimestamp,
    });
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
}

function toIncomingStep(request: LogRequest, project: Project): Step {
  return {
    id: stringField(request.step_id ?? request.stepId, 'step id'),
    name: stringField(request.step_name ?? request.stepName, 'step name'),
    traceId: stringField(request.trace_id ?? request.traceId, 'trace id'),
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
