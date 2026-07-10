import type { NewProject, Project, Step } from '../domain/types.js';

export function toProjectInfo(project: Project) {
  return { projectId: project.id, projectName: project.name, description: project.description, averageDuration: project.averageDuration,
    cost: project.cost, createdTimestamp: project.createdTimestamp, lastUpdateTimestamp: project.lastUpdateTimestamp };
}
export function mergeStep(existing: Step | null, incoming: Step): Step {
  if (!existing) return incoming;
  const oldInput = existing.input ?? {}, newInput = incoming.input ?? {};
  const oldOutput = existing.output ?? {}, newOutput = incoming.output ?? {};
  return { ...existing, tags: [...new Set([...incoming.tags, ...existing.tags].filter(Boolean))],
    input: { func_inputs: newInput.func_inputs ?? oldInput.func_inputs, llm_inputs: newInput.llm_inputs ?? oldInput.llm_inputs },
    output: { func_output: newOutput.func_output ?? oldOutput.func_output, llm_outputs: newOutput.llm_outputs ?? oldOutput.llm_outputs },
    model: incoming.model ?? existing.model, usage: incoming.usage ?? existing.usage,
    errorInfo: incoming.errorInfo ?? existing.errorInfo, endTime: incoming.endTime ?? existing.endTime };
}
export function projectTemplate(userId: string, name: string, description: string | null, cost: string, timestamp: string): NewProject {
  return { userId, name, description, strategy: null, averageDuration: 0, cost, createdTimestamp: timestamp, lastUpdateTimestamp: timestamp };
}
