export function buildPromptIdentifier(pipelineName: string, promptName: string, version: string): string | null {
  const pipeline = pipelineName.trim()
  const prompt = promptName.trim()
  const v = version.trim()
  if (!pipeline || !prompt || !v) return null
  return `${pipeline}/${prompt}@${v}`
}
