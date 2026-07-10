import { add, isPositive, subtract, toDecimalString } from './decimal.js';
import { calcUsageCost } from './pricing.js';
import { mergeStep } from './service-mappers.js';
import { durationMillis } from './utils.js';

export class LogService {
  constructor(repositories, projectService) {
    this.repositories = repositories;
    this.projectService = projectService;
  }

  async logTrace(userId, request) {
    const projectName = request.project_name ?? request.projectName;
    const project = await this.projectService.ensureProject(userId, projectName);
    const traceId = request.trace_id ?? request.traceId;
    const existing = await this.repositories.findTrace(traceId);
    await this.repositories.upsertTrace({
      id: traceId,
      projectName,
      projectId: project.id,
      name: request.trace_name ?? request.traceName,
      conversationId: request.conversation_id ?? request.conversationId,
      tags: request.tags ?? [],
      input: request.input,
      output: request.output,
      errorInfo: request.error_info ?? request.errorInfo ?? null,
      startTime: request.start_time ?? request.startTime,
      lastUpdateTimestamp: request.last_update_timestamp ?? request.lastUpdateTimestamp,
    });

    const count = await this.repositories.countTraces(project.id);
    const newDuration = durationMillis(request.start_time ?? request.startTime, request.last_update_timestamp ?? request.lastUpdateTimestamp);
    const previousDuration = existing ? durationMillis(existing.startTime, existing.lastUpdateTimestamp) : project.averageDuration;
    const averageDuration = Math.trunc(project.averageDuration + (newDuration - previousDuration) / count);
    await this.repositories.updateProjectAverageDuration(project.id, averageDuration);
    return traceId;
  }

  async logStep(userId, request) {
    const projectName = request.project_name ?? request.projectName;
    const project = await this.projectService.ensureProject(userId, projectName);
    const stepId = request.step_id ?? request.stepId;
    const incoming = toIncomingStep(request, project);
    const step = mergeStep(await this.repositories.findStep(stepId), incoming);
    await this.repositories.upsertStep(step);

    const previousMeta = await this.repositories.findStepMeta(stepId);
    const previousCost = previousMeta?.cost ?? toDecimalString(0);
    const newCost = calcUsageCost(request.llm_provider ?? request.llmProvider, step.model, step.usage);
    const mergedCost = isPositive(newCost) ? newCost : previousCost;
    const description = request.description ?? JSON.parse(previousMeta?.metadata ?? '{}').description ?? null;
    await this.repositories.upsertStepMeta(stepId, { description }, mergedCost);

    const projectCost = add(project.cost, subtract(mergedCost, previousCost));
    await this.repositories.updateProjectCost(project.id, toDecimalString(projectCost));
    return stepId;
  }
}

function toIncomingStep(request, project) {
  return {
    id: request.step_id ?? request.stepId,
    name: request.step_name ?? request.stepName,
    traceId: request.trace_id ?? request.traceId,
    parentStepId: request.parent_step_id ?? request.parentStepId ?? null,
    type: request.step_type ?? request.stepType,
    tags: request.tags ?? [],
    input: request.input ?? null,
    output: request.output ?? null,
    errorInfo: request.error_info ?? request.errorInfo ?? null,
    model: request.model ?? null,
    usage: request.usage ?? null,
    projectName: project.name,
    projectId: project.id,
    startTime: request.start_time ?? request.startTime,
    endTime: request.end_time ?? request.endTime ?? null,
  };
}
