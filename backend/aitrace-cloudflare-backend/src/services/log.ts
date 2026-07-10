import { add, isPositive, subtract, toDecimalString } from './decimal.js';
import { calcUsageCost } from './pricing.js';
import type { ProjectService } from './project-service.js';
import { stringField } from './project-service.js';
import type { JsonObject, LogRequest, Project, Step, StepMeta, Trace } from './types.js';
import { mergeStep } from './service-mappers.js';
import { durationMillis } from './utils.js';

interface LogRepositories {
  findTrace(id: string): Promise<Trace | null>; upsertTrace(trace: Trace): Promise<void>; countTraces(projectId: number): Promise<number>;
  updateProjectAverageDuration(projectId: number, duration: number): Promise<void>; findStep(id: string): Promise<Step | null>;
  upsertStep(step: Step): Promise<void>; findStepMeta(id: string): Promise<StepMeta | null>;
  upsertStepMeta(id: string, metadata: JsonObject, cost: string): Promise<StepMeta>; updateProjectCost(id: number, cost: string): Promise<void>;
}

export class LogService {
  constructor(private readonly repositories: LogRepositories, private readonly projectService: Pick<ProjectService, 'ensureProject'>) {}
  async logTrace(userId: string, request: LogRequest): Promise<string> {
    const projectName = stringField(request.project_name ?? request.projectName, 'project name');
    const project = await this.projectService.ensureProject(userId, projectName);
    const traceId = stringField(request.trace_id ?? request.traceId, 'trace id');
    const startTime = stringField(request.start_time ?? request.startTime, 'start time');
    const updated = stringField(request.last_update_timestamp ?? request.lastUpdateTimestamp, 'last update timestamp');
    const existing = await this.repositories.findTrace(traceId);
    await this.repositories.upsertTrace({ id: traceId, projectName, projectId: project.id,
      name: stringField(request.trace_name ?? request.traceName, 'trace name'),
      conversationId: stringField(request.conversation_id ?? request.conversationId, 'conversation id'), tags: request.tags ?? [],
      input: request.input ?? null, output: request.output ?? null, errorInfo: request.error_info ?? request.errorInfo ?? null,
      startTime, lastUpdateTimestamp: updated });
    const count = await this.repositories.countTraces(project.id);
    const previous = existing ? durationMillis(existing.startTime, existing.lastUpdateTimestamp) : project.averageDuration;
    await this.repositories.updateProjectAverageDuration(project.id, Math.trunc(project.averageDuration + (durationMillis(startTime, updated) - previous) / count));
    return traceId;
  }
  async logStep(userId: string, request: LogRequest): Promise<string> {
    const project = await this.projectService.ensureProject(userId, stringField(request.project_name ?? request.projectName, 'project name'));
    const stepId = stringField(request.step_id ?? request.stepId, 'step id');
    const step = mergeStep(await this.repositories.findStep(stepId), toIncomingStep(request, project));
    await this.repositories.upsertStep(step);
    const previousMeta = await this.repositories.findStepMeta(stepId);
    const previousCost = previousMeta?.cost ?? toDecimalString(0);
    const newCost = calcUsageCost(request.llm_provider ?? request.llmProvider, step.model, step.usage);
    const mergedCost = isPositive(newCost) ? newCost : previousCost;
    const oldMetadata = previousMeta ? JSON.parse(previousMeta.metadata) as { description?: string } : {};
    await this.repositories.upsertStepMeta(stepId, { description: request.description ?? oldMetadata.description ?? null }, mergedCost);
    await this.repositories.updateProjectCost(project.id, toDecimalString(add(project.cost, subtract(mergedCost, previousCost))));
    return stepId;
  }
}
function toIncomingStep(request: LogRequest, project: Project): Step {
  return { id: stringField(request.step_id ?? request.stepId, 'step id'), name: stringField(request.step_name ?? request.stepName, 'step name'),
    traceId: stringField(request.trace_id ?? request.traceId, 'trace id'), parentStepId: request.parent_step_id ?? request.parentStepId ?? null,
    type: stringField(request.step_type ?? request.stepType, 'step type'), tags: request.tags ?? [], input: request.input ?? null,
    output: request.output ?? null, errorInfo: request.error_info ?? request.errorInfo ?? null, model: request.model ?? null,
    usage: request.usage ?? null, projectName: project.name, projectId: project.id,
    startTime: stringField(request.start_time ?? request.startTime, 'start time'), endTime: request.end_time ?? request.endTime ?? null };
}
