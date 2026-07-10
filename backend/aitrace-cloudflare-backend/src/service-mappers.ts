export function toProjectInfo(project) {
  return {
    projectId: project.id,
    projectName: project.name,
    description: project.description,
    averageDuration: project.averageDuration,
    cost: project.cost,
    createdTimestamp: project.createdTimestamp,
    lastUpdateTimestamp: project.lastUpdateTimestamp,
  };
}

export function mergeStep(existing, incoming) {
  if (!existing) return incoming;
  const tags = [...new Set([...(incoming.tags ?? []), ...(existing.tags ?? [])].filter(Boolean))];
  const oldInput = existing.input ?? {};
  const newInput = incoming.input ?? {};
  const oldOutput = existing.output ?? {};
  const newOutput = incoming.output ?? {};
  return {
    ...existing,
    tags,
    input: {
      func_inputs: newInput.func_inputs ?? oldInput.func_inputs,
      llm_inputs: newInput.llm_inputs ?? oldInput.llm_inputs,
    },
    output: {
      func_output: newOutput.func_output ?? oldOutput.func_output,
      llm_outputs: newOutput.llm_outputs ?? oldOutput.llm_outputs,
    },
    model: incoming.model ?? existing.model,
    usage: incoming.usage ?? existing.usage,
    errorInfo: incoming.errorInfo ?? existing.errorInfo,
    endTime: incoming.endTime ?? existing.endTime,
  };
}

export function projectTemplate(userId, name, description, cost, timestamp) {
  return {
    userId,
    name,
    description,
    strategy: null,
    averageDuration: 0,
    cost,
    createdTimestamp: timestamp,
    lastUpdateTimestamp: timestamp,
  };
}
