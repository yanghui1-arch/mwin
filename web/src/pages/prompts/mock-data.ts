import type { Project, Pipeline, PerformanceDataPoint, RecommendedCombination } from "./types"

export const mockProjects: Project[] = [
  { id: "customer-service", name: "Customer Service Bot", description: "AI-powered customer support agent" },
  { id: "code-assistant",   name: "Code Assistant",       description: "Developer productivity and code review agent" },
  { id: "content-gen",      name: "Content Generator",    description: "Marketing content creation and optimization agent" },
]

// ─── Customer Service Bot ─────────────────────────────────────────────────────

export const mockPipelines: Pipeline[] = [
  {
    id: "intent-recognition",
    projectId: "customer-service",
    name: "Intent Recognition",
    description: "Classifies user queries into structured intent categories",
    status: "active",
    chartColor: "#C96442",
    createdAt: "2024-09-01T08:00:00Z",
    lastUsedAt: "2025-03-10T14:23:00Z",
    prompts: [
      {
        id: "ir-classifier",
        name: "Classifier System Prompt",
        description: "Core role definition, category list, and reasoning instructions",
        versions: [
          {
            id: "ir-cls-v2",
            version: "v2.0",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2025-01-20T09:00:00Z",
            changelog: "Upgraded to GPT-4o with chain-of-thought reasoning. Structured JSON output. Major accuracy improvement on ambiguous cases.",
            metrics: { latencyMs: 312, tokenCostPer1k: 8.7, successRate: 94.2, usageCount: 48750 },
            performanceHistory: [
              { date: "Jan 27", successRate: 89.8, latencyMs: 324, tokenCostPer1k: 8.7 },
              { date: "Feb 3",  successRate: 91.2, latencyMs: 318, tokenCostPer1k: 8.7 },
              { date: "Feb 10", successRate: 92.4, latencyMs: 315, tokenCostPer1k: 8.7 },
              { date: "Feb 17", successRate: 93.1, latencyMs: 313, tokenCostPer1k: 8.7 },
              { date: "Feb 24", successRate: 93.6, latencyMs: 312, tokenCostPer1k: 8.7 },
              { date: "Mar 3",  successRate: 94.0, latencyMs: 312, tokenCostPer1k: 8.7 },
              { date: "Mar 10", successRate: 94.2, latencyMs: 312, tokenCostPer1k: 8.7 },
            ],
            content: `You are an expert intent classifier for a customer service AI system.

## Intent Categories
- **QUESTION**: User seeks information (order status, product details, policies)
- **COMPLAINT**: User expresses dissatisfaction or reports a problem
- **REQUEST**: User asks for a specific action (cancel, refund, change)
- **FEEDBACK**: User shares experience or suggestions
- **ESCALATION**: User explicitly requests a human agent
- **OTHER**: Does not fit any above category

## Analysis Process
1. Identify key phrases and emotional tone
2. Determine the primary intent
3. Assess confidence level

## Input
User message: {message}
History (last 3 turns): {history}

## Output
{
  "intent": "<CATEGORY>",
  "confidence": <0.0-1.0>,
  "key_signals": ["<phrase>"],
  "reasoning": "<one sentence>"
}`,
          },
          {
            id: "ir-cls-v1-1",
            version: "v1.1",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-11-15T10:30:00Z",
            changelog: "Added few-shot examples. Added ESCALATION category.",
            metrics: { latencyMs: 231, tokenCostPer1k: 5.1, successRate: 87.4, usageCount: 31920 },
            performanceHistory: [
              { date: "Nov 22", successRate: 85.8, latencyMs: 238, tokenCostPer1k: 5.1 },
              { date: "Nov 29", successRate: 87.4, latencyMs: 231, tokenCostPer1k: 5.1 },
              { date: "Dec 6",  successRate: 87.0, latencyMs: 234, tokenCostPer1k: 5.1 },
              { date: "Dec 13", successRate: 86.8, latencyMs: 235, tokenCostPer1k: 5.1 },
              { date: "Jan 6",  successRate: 86.9, latencyMs: 233, tokenCostPer1k: 5.1 },
              { date: "Jan 13", successRate: 86.5, latencyMs: 236, tokenCostPer1k: 5.1 },
            ],
            content: `You are an intent classifier for a customer service system.

Categories:
- QUESTION, COMPLAINT, REQUEST, FEEDBACK, ESCALATION, OTHER

Examples:
User: "Where is my order?" → QUESTION
User: "Product broke after 2 days" → COMPLAINT
User: "Cancel my subscription" → REQUEST

User message: {message}
Intent:`,
          },
          {
            id: "ir-cls-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-09-01T08:00:00Z",
            changelog: "Initial release. Basic classification, no examples.",
            metrics: { latencyMs: 198, tokenCostPer1k: 4.2, successRate: 83.1, usageCount: 12480 },
            performanceHistory: [
              { date: "Sep 8",  successRate: 81.2, latencyMs: 195, tokenCostPer1k: 4.2 },
              { date: "Sep 22", successRate: 83.1, latencyMs: 198, tokenCostPer1k: 4.2 },
              { date: "Oct 6",  successRate: 82.8, latencyMs: 201, tokenCostPer1k: 4.2 },
              { date: "Oct 20", successRate: 82.0, latencyMs: 204, tokenCostPer1k: 4.2 },
              { date: "Nov 3",  successRate: 80.5, latencyMs: 207, tokenCostPer1k: 4.2 },
              { date: "Nov 10", successRate: 79.8, latencyMs: 210, tokenCostPer1k: 4.2 },
            ],
            content: `Classify the user message into: QUESTION, COMPLAINT, REQUEST, FEEDBACK, OTHER.

User message: {message}

Category:`,
          },
        ],
      },
      {
        id: "ir-output-format",
        name: "Output Format Schema",
        description: "JSON schema that constrains the model's output structure",
        versions: [
          {
            id: "ir-of-v1-1",
            version: "v1.1",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2025-01-20T09:00:00Z",
            changelog: "Added confidence and key_signals fields for downstream filtering.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.4, successRate: 98.1, usageCount: 48750 },
            performanceHistory: [
              { date: "Jan 27", successRate: 97.2, latencyMs: 0, tokenCostPer1k: 0.4 },
              { date: "Feb 10", successRate: 97.8, latencyMs: 0, tokenCostPer1k: 0.4 },
              { date: "Mar 10", successRate: 98.1, latencyMs: 0, tokenCostPer1k: 0.4 },
            ],
            content: `Respond with valid JSON matching this schema exactly:
{
  "intent": "QUESTION" | "COMPLAINT" | "REQUEST" | "FEEDBACK" | "ESCALATION" | "OTHER",
  "confidence": number,   // 0.0 – 1.0
  "key_signals": string[],
  "reasoning": string
}

Do not include any text outside the JSON object.`,
          },
          {
            id: "ir-of-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-09-01T08:00:00Z",
            changelog: "Initial schema — intent only.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.2, successRate: 88.4, usageCount: 44400 },
            content: `Respond with only the intent category as a single word. No other text.`,
          },
        ],
      },
    ],
  },
  {
    id: "response-generation",
    projectId: "customer-service",
    name: "Response Generation",
    description: "Generates empathetic, contextual customer service responses",
    status: "active",
    chartColor: "#9C7BB5",
    createdAt: "2024-09-01T08:00:00Z",
    lastUsedAt: "2025-03-10T14:23:00Z",
    prompts: [
      {
        id: "rg-agent-persona",
        name: "Agent Persona",
        description: "Defines the agent's identity, tone, and communication style",
        versions: [
          {
            id: "rg-ap-v2",
            version: "v2.0",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2024-12-01T11:00:00Z",
            changelog: "Added empathy-first guideline, brand voice rules, and proactive follow-up instructions.",
            metrics: { latencyMs: 487, tokenCostPer1k: 11.2, successRate: 91.7, usageCount: 44210 },
            performanceHistory: [
              { date: "Dec 8",  successRate: 87.3, latencyMs: 512, tokenCostPer1k: 11.2 },
              { date: "Dec 22", successRate: 90.4, latencyMs: 491, tokenCostPer1k: 11.2 },
              { date: "Jan 6",  successRate: 91.0, latencyMs: 489, tokenCostPer1k: 11.2 },
              { date: "Feb 10", successRate: 91.6, latencyMs: 487, tokenCostPer1k: 11.2 },
              { date: "Mar 10", successRate: 91.7, latencyMs: 487, tokenCostPer1k: 11.2 },
            ],
            content: `You are Alex, a senior customer service specialist with deep product knowledge.

## Your Persona
- **Empathetic**: Acknowledge feelings before solving the problem
- **Efficient**: Clear and actionable, no filler
- **Professional**: Warm and friendly, never casual
- **Proactive**: Anticipate follow-up questions

Keep responses under 200 words.`,
          },
          {
            id: "rg-ap-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-09-01T08:00:00Z",
            changelog: "Initial generic assistant persona.",
            metrics: { latencyMs: 421, tokenCostPer1k: 6.3, successRate: 78.5, usageCount: 12480 },
            performanceHistory: [
              { date: "Sep 8",  successRate: 76.2, latencyMs: 438, tokenCostPer1k: 6.3 },
              { date: "Sep 22", successRate: 78.5, latencyMs: 421, tokenCostPer1k: 6.3 },
              { date: "Oct 20", successRate: 77.4, latencyMs: 429, tokenCostPer1k: 6.3 },
              { date: "Nov 3",  successRate: 76.8, latencyMs: 433, tokenCostPer1k: 6.3 },
            ],
            content: `You are a helpful customer service assistant. Answer the customer's question politely and concisely.`,
          },
        ],
      },
      {
        id: "rg-context-template",
        name: "Context Injection Template",
        description: "Structures the conversation context passed into each generation call",
        versions: [
          {
            id: "rg-ct-v1-1",
            version: "v1.1",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2025-01-10T10:00:00Z",
            changelog: "Added available_tools and extracted entities to context block.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.8, successRate: 93.2, usageCount: 44210 },
            performanceHistory: [
              { date: "Jan 13", successRate: 91.4, latencyMs: 0, tokenCostPer1k: 0.8 },
              { date: "Feb 3",  successRate: 92.5, latencyMs: 0, tokenCostPer1k: 0.8 },
              { date: "Mar 10", successRate: 93.2, latencyMs: 0, tokenCostPer1k: 0.8 },
            ],
            content: `## Conversation Context
- Customer Intent: {intent}
- Extracted Entities: {entities}
- Conversation History: {history}
- Available Actions: {available_tools}

## Customer Message
{message}`,
          },
          {
            id: "rg-ct-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-09-01T08:00:00Z",
            changelog: "Initial basic context template.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.5, successRate: 85.4, usageCount: 12480 },
            content: `Customer Intent: {intent}
History: {history}
Message: {message}`,
          },
        ],
      },
    ],
  },
  {
    id: "entity-extraction",
    projectId: "customer-service",
    name: "Entity Extraction",
    description: "Extracts structured entities from customer messages",
    status: "active",
    chartColor: "#5A9E92",
    createdAt: "2024-10-15T08:00:00Z",
    lastUsedAt: "2025-03-10T14:23:00Z",
    prompts: [
      {
        id: "ee-extractor",
        name: "Extractor System Prompt",
        description: "Instructions for extracting and classifying entities",
        versions: [
          {
            id: "ee-ext-v1-3",
            version: "v1.3",
            status: "current",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2025-02-14T10:00:00Z",
            changelog: "Added confidence scores and sentiment analysis. Context-aware extraction.",
            metrics: { latencyMs: 224, tokenCostPer1k: 4.8, successRate: 91.3, usageCount: 18560 },
            performanceHistory: [
              { date: "Feb 17", successRate: 88.6, latencyMs: 231, tokenCostPer1k: 4.8 },
              { date: "Feb 24", successRate: 89.8, latencyMs: 228, tokenCostPer1k: 4.8 },
              { date: "Mar 3",  successRate: 90.5, latencyMs: 226, tokenCostPer1k: 4.8 },
              { date: "Mar 10", successRate: 91.3, latencyMs: 224, tokenCostPer1k: 4.8 },
            ],
            content: `You are a precise entity extraction system.

Extract entities with confidence scores from: {message}
Context: {conversation_context}

Return JSON matching the entity schema.`,
          },
          {
            id: "ee-ext-v1-2",
            version: "v1.2",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2025-01-08T09:00:00Z",
            changelog: "Added urgency and issue category.",
            metrics: { latencyMs: 201, tokenCostPer1k: 4.2, successRate: 86.8, usageCount: 28940 },
            performanceHistory: [
              { date: "Jan 13", successRate: 84.2, latencyMs: 208, tokenCostPer1k: 4.2 },
              { date: "Jan 27", successRate: 86.8, latencyMs: 201, tokenCostPer1k: 4.2 },
              { date: "Feb 10", successRate: 85.9, latencyMs: 205, tokenCostPer1k: 4.2 },
            ],
            content: `Extract order_id, product, date, email, issue_category, and urgency from: {message}`,
          },
          {
            id: "ee-ext-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-10-15T08:00:00Z",
            changelog: "Initial extraction — basic fields only.",
            metrics: { latencyMs: 182, tokenCostPer1k: 3.8, successRate: 81.2, usageCount: 10230 },
            content: `Extract: order_id, product_name, date, customer_name from {message}.`,
          },
        ],
      },
      {
        id: "ee-entity-schema",
        name: "Entity Schema",
        description: "JSON schema defining extractable entity fields and types",
        versions: [
          {
            id: "ee-es-v2",
            version: "v2.0",
            status: "current",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2025-02-14T10:00:00Z",
            changelog: "Full nested schema with confidence scores per field and sentiment.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.6, successRate: 94.7, usageCount: 18560 },
            content: `{
  "order_id":  { "value": string|null, "confidence": 0.0-1.0 },
  "product":   { "name": string|null, "sku": string|null, "confidence": 0.0-1.0 },
  "temporal":  { "date": string|null, "relative": string|null },
  "contact":   { "name": string|null, "email": string|null },
  "issue":     { "category": enum, "urgency": enum, "sentiment_score": -1.0..1.0 }
}`,
          },
          {
            id: "ee-es-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-10-15T08:00:00Z",
            changelog: "Initial flat schema.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.3, successRate: 82.1, usageCount: 38700 },
            content: `{
  "order_id": string|null,
  "product_name": string|null,
  "date": string|null,
  "customer_name": string|null
}`,
          },
        ],
      },
    ],
  },
  {
    id: "tool-router",
    projectId: "customer-service",
    name: "Tool Router",
    description: "Selects and orchestrates the right tools for each request",
    status: "active",
    chartColor: "#C9954A",
    createdAt: "2024-11-01T08:00:00Z",
    lastUsedAt: "2025-03-10T14:23:00Z",
    prompts: [
      {
        id: "tr-router",
        name: "Router System Prompt",
        description: "Strategy and reasoning instructions for tool orchestration",
        versions: [
          {
            id: "tr-rtr-v2",
            version: "v2.0",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2025-02-01T09:30:00Z",
            changelog: "Multi-tool orchestration, dependency chains, parallel execution planning.",
            metrics: { latencyMs: 298, tokenCostPer1k: 9.1, successRate: 93.6, usageCount: 21340 },
            performanceHistory: [
              { date: "Feb 3",  successRate: 88.4, latencyMs: 312, tokenCostPer1k: 9.1 },
              { date: "Feb 17", successRate: 91.3, latencyMs: 302, tokenCostPer1k: 9.1 },
              { date: "Mar 3",  successRate: 93.1, latencyMs: 298, tokenCostPer1k: 9.1 },
              { date: "Mar 10", successRate: 93.6, latencyMs: 298, tokenCostPer1k: 9.1 },
            ],
            content: `You are a tool orchestration system. Select and sequence tools to resolve the customer request.

Request context: intent={intent}, entities={entities}
Available tools: {tools_json}

Output: primary_tool, fallback_tool, parallel_tools, reasoning.`,
          },
          {
            id: "tr-rtr-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2024-11-01T08:00:00Z",
            changelog: "Initial single-tool selection.",
            metrics: { latencyMs: 267, tokenCostPer1k: 7.2, successRate: 82.4, usageCount: 8920 },
            content: `Select the best tool for: {message}. Available: {tools}. Return tool name only.`,
          },
        ],
      },
      {
        id: "tr-tool-manifest",
        name: "Tool Manifest Template",
        description: "How tool capabilities are described to the model",
        versions: [
          {
            id: "tr-tm-v1",
            version: "v1.0",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2024-11-01T08:00:00Z",
            changelog: "Initial tool manifest format.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.5, successRate: 96.2, usageCount: 30260 },
            content: `Each tool is described as:
{
  "name": "<tool_name>",
  "description": "<what it does>",
  "required_inputs": ["<field>"],
  "reliability_score": 0.0-1.0,
  "avg_latency_ms": number
}`,
          },
        ],
      },
    ],
  },
  {
    id: "context-summarizer",
    projectId: "customer-service",
    name: "Context Summarizer",
    description: "Compresses long conversation history for context management",
    status: "archived",
    chartColor: "#B86070",
    createdAt: "2024-09-15T08:00:00Z",
    lastUsedAt: "2025-01-15T11:00:00Z",
    prompts: [
      {
        id: "cs-summarizer",
        name: "Summarizer System Prompt",
        description: "Instructions for creating structured conversation summaries",
        versions: [
          {
            id: "cs-sum-v1-1",
            version: "v1.1",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-11-30T14:00:00Z",
            changelog: "Structured JSON output. Preserves action items, pending items, and next-step recommendations.",
            metrics: { latencyMs: 398, tokenCostPer1k: 5.8, successRate: 89.1, usageCount: 14520 },
            performanceHistory: [
              { date: "Dec 7",  successRate: 87.2, latencyMs: 412, tokenCostPer1k: 5.8 },
              { date: "Dec 21", successRate: 89.1, latencyMs: 398, tokenCostPer1k: 5.8 },
              { date: "Jan 6",  successRate: 88.8, latencyMs: 401, tokenCostPer1k: 5.8 },
            ],
            content: `Summarize the conversation and return JSON:
{
  "customer_summary": string,
  "core_issues": string[],
  "actions_taken": string[],
  "pending_items": string[],
  "sentiment": "positive"|"neutral"|"negative"|"frustrated",
  "next_step": string
}`,
          },
          {
            id: "cs-sum-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-09-15T08:00:00Z",
            changelog: "Initial plain-text summarization.",
            metrics: { latencyMs: 356, tokenCostPer1k: 5.1, successRate: 86.3, usageCount: 7830 },
            content: `Summarize the following customer service conversation in under 100 words, preserving all key information.

Conversation: {conversation}`,
          },
        ],
      },
    ],
  },

  // ── Code Assistant ────────────────────────────────────────────────────────
  {
    id: "code-review",
    projectId: "code-assistant",
    name: "Code Review",
    description: "Analyzes code for bugs, style, security, and improvement opportunities",
    status: "active",
    chartColor: "#C96442",
    createdAt: "2024-10-01T08:00:00Z",
    lastUsedAt: "2025-03-09T11:00:00Z",
    prompts: [
      {
        id: "cr-reviewer",
        name: "Reviewer System Prompt",
        description: "Reviewer role, scope, and analysis dimensions",
        versions: [
          {
            id: "cr-rev-v2",
            version: "v2.0",
            status: "current",
            modelConfig: { model: "claude-sonnet-4-6", temperature: 0.7, topK: 50, topP: 0.95 },
            createdAt: "2025-01-10T09:00:00Z",
            changelog: "Added security analysis, OWASP top-10 checking, and performance pattern detection.",
            metrics: { latencyMs: 524, tokenCostPer1k: 12.4, successRate: 92.1, usageCount: 31200 },
            performanceHistory: [
              { date: "Jan 13", successRate: 88.0, latencyMs: 548, tokenCostPer1k: 12.4 },
              { date: "Feb 3",  successRate: 90.4, latencyMs: 531, tokenCostPer1k: 12.4 },
              { date: "Mar 10", successRate: 92.1, latencyMs: 524, tokenCostPer1k: 12.4 },
            ],
            content: `You are a senior code reviewer. Analyze the provided code across: correctness, security (OWASP Top 10), performance, readability, and maintainability.`,
          },
          {
            id: "cr-rev-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2024-10-01T08:00:00Z",
            changelog: "Initial review prompt — style and correctness only.",
            metrics: { latencyMs: 412, tokenCostPer1k: 9.8, successRate: 79.3, usageCount: 18400 },
            content: `Review the following code for bugs and style issues. List problems and suggestions.`,
          },
        ],
      },
      {
        id: "cr-severity-rules",
        name: "Severity Classification Rules",
        description: "Rules for classifying issue severity: critical / major / minor",
        versions: [
          {
            id: "cr-sev-v1-1",
            version: "v1.1",
            status: "current",
            modelConfig: { model: "claude-sonnet-4-6", temperature: 0.7, topK: 50, topP: 0.95 },
            createdAt: "2025-02-01T09:00:00Z",
            changelog: "Refined severity boundaries with concrete examples per category.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.4, successRate: 94.8, usageCount: 31200 },
            content: `Severity levels:
- CRITICAL: Security vulnerabilities, data loss, crashes
- MAJOR: Logic errors, broken functionality, significant performance issues
- MINOR: Style issues, minor inefficiencies, readability`,
          },
          {
            id: "cr-sev-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2024-10-01T08:00:00Z",
            changelog: "Initial severity rules.",
            metrics: { latencyMs: 0, tokenCostPer1k: 0.3, successRate: 87.2, usageCount: 18400 },
            content: `Use: critical, major, or minor severity labels for each issue found.`,
          },
        ],
      },
    ],
  },
  {
    id: "test-generation",
    projectId: "code-assistant",
    name: "Test Generation",
    description: "Generates unit and integration tests for given code",
    status: "active",
    chartColor: "#9C7BB5",
    createdAt: "2024-11-01T08:00:00Z",
    lastUsedAt: "2025-03-08T15:00:00Z",
    prompts: [
      {
        id: "tg-generator",
        name: "Test Generator System Prompt",
        description: "Test strategy, coverage requirements, and framework conventions",
        versions: [
          {
            id: "tg-gen-v1-1",
            version: "v1.1",
            status: "current",
            modelConfig: { model: "claude-sonnet-4-6", temperature: 0.7, topK: 50, topP: 0.95 },
            createdAt: "2025-02-01T10:00:00Z",
            changelog: "Added edge case strategy, property-based test suggestions, and security test cases.",
            metrics: { latencyMs: 618, tokenCostPer1k: 14.1, successRate: 88.4, usageCount: 14600 },
            content: `Generate comprehensive tests: happy path, edge cases (null, empty, boundary), error paths, and security scenarios. Use {test_framework} for {language}.`,
          },
          {
            id: "tg-gen-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2024-11-01T08:00:00Z",
            changelog: "Initial test generation.",
            metrics: { latencyMs: 523, tokenCostPer1k: 11.2, successRate: 81.7, usageCount: 9800 },
            content: `Write unit tests for the following code. Cover the main functionality.`,
          },
        ],
      },
    ],
  },

  // ── Content Generator ──────────────────────────────────────────────────────
  {
    id: "brief-generation",
    projectId: "content-gen",
    name: "Brief Generation",
    description: "Creates structured content briefs from product and audience data",
    status: "active",
    chartColor: "#C96442",
    createdAt: "2024-12-01T08:00:00Z",
    lastUsedAt: "2025-03-10T10:00:00Z",
    prompts: [
      {
        id: "bg-strategist",
        name: "Content Strategist Prompt",
        description: "Strategist role, brief structure, and output requirements",
        versions: [
          {
            id: "bg-str-v1-1",
            version: "v1.1",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2025-02-10T09:00:00Z",
            changelog: "Added competitor analysis section and SEO keyword integration.",
            metrics: { latencyMs: 442, tokenCostPer1k: 10.1, successRate: 90.3, usageCount: 8920 },
            content: `You are a senior content strategist. Create a detailed brief with: headline options, key message, audience pain points, content outline, SEO keywords, tone guidelines, and CTA.`,
          },
          {
            id: "bg-str-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-12-01T08:00:00Z",
            changelog: "Initial brief generation.",
            metrics: { latencyMs: 318, tokenCostPer1k: 6.8, successRate: 81.6, usageCount: 4300 },
            content: `Create a content brief: headline, key message, outline, CTA.`,
          },
        ],
      },
    ],
  },
  {
    id: "seo-optimization",
    projectId: "content-gen",
    name: "SEO Optimization",
    description: "Rewrites and optimizes content for search engine performance",
    status: "active",
    chartColor: "#9C7BB5",
    createdAt: "2024-12-15T08:00:00Z",
    lastUsedAt: "2025-03-09T14:00:00Z",
    prompts: [
      {
        id: "seo-optimizer",
        name: "SEO Optimizer Prompt",
        description: "Optimization strategy, E-E-A-T guidance, and keyword rules",
        versions: [
          {
            id: "seo-opt-v1-1",
            version: "v1.1",
            status: "current",
            modelConfig: { model: "gpt-4o", temperature: 0.7, topP: 0.95 },
            createdAt: "2025-01-25T10:00:00Z",
            changelog: "Added E-E-A-T signals and semantic keyword clusters.",
            metrics: { latencyMs: 511, tokenCostPer1k: 11.8, successRate: 87.9, usageCount: 7640 },
            content: `Optimize content for SEO: rewrite title/meta, adjust keyword density, improve headings, add E-E-A-T signals, suggest internal links.`,
          },
          {
            id: "seo-opt-v1",
            version: "v1.0",
            status: "deprecated",
            modelConfig: { model: "gpt-4o-mini", temperature: 0.5, topP: 0.9 },
            createdAt: "2024-12-15T08:00:00Z",
            changelog: "Initial SEO optimization.",
            metrics: { latencyMs: 389, tokenCostPer1k: 7.4, successRate: 79.2, usageCount: 3810 },
            content: `Optimize the content for the target keyword. Improve keyword usage and headings.`,
          },
        ],
      },
    ],
  },
]

// ─── Performance trends (success rate per pipeline over time) ─────────────────

export const mockPerformanceData: Record<string, PerformanceDataPoint[]> = {
  "customer-service": [
    { period: "Sep '24", "intent-recognition": 83.1, "response-generation": 78.5, "entity-extraction": 81.2, "tool-router": 82.4, "context-summarizer": 86.3 },
    { period: "Nov '24", "intent-recognition": 87.4, "response-generation": 80.2, "entity-extraction": 83.5, "tool-router": 83.6, "context-summarizer": 89.1 },
    { period: "Dec '24", "intent-recognition": 87.8, "response-generation": 91.7, "entity-extraction": 84.9, "tool-router": 85.1 },
    { period: "Jan '25", "intent-recognition": 89.3, "response-generation": 91.7, "entity-extraction": 86.8, "tool-router": 87.4 },
    { period: "Feb '25", "intent-recognition": 91.0, "response-generation": 91.7, "entity-extraction": 91.3, "tool-router": 91.8 },
    { period: "Mar '25", "intent-recognition": 94.2, "response-generation": 91.7, "entity-extraction": 91.3, "tool-router": 93.6 },
  ],
  "code-assistant": [
    { period: "Oct '24", "code-review": 79.3, "test-generation": 81.7 },
    { period: "Jan '25", "code-review": 92.1, "test-generation": 83.0 },
    { period: "Mar '25", "code-review": 92.1, "test-generation": 88.4 },
  ],
  "content-gen": [
    { period: "Dec '24", "brief-generation": 81.6, "seo-optimization": 79.2 },
    { period: "Feb '25", "brief-generation": 90.3, "seo-optimization": 87.9 },
    { period: "Mar '25", "brief-generation": 90.3, "seo-optimization": 87.9 },
  ],
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export const mockRecommendations: RecommendedCombination[] = [
  {
    id: "rec-cs-1",
    projectId: "customer-service",
    title: "Optimal Performance Stack",
    description: "Use all current prompt versions across active pipelines",
    rationale: "Running all current versions together yields a 12% uplift in first-contact resolution. The confidence scores from the Classifier v2.0 directly inform the Context Injection Template, reducing generation errors.",
    estimatedImprovement: 12,
    pipelineIds: ["intent-recognition", "entity-extraction", "response-generation", "tool-router"],
    promptIds: ["ir-classifier", "ir-output-format", "ee-extractor", "rg-agent-persona", "tr-router"],
    confidence: "high",
    tradeoffs: ["~23ms avg latency increase", "38% higher token cost vs baseline"],
  },
  {
    id: "rec-cs-2",
    projectId: "customer-service",
    title: "Restore Context Summarizer",
    description: "Re-enable the archived pipeline for long sessions",
    rationale: "31% of unresolved cases occur in sessions over 10 turns. Summarizer v1.1 reduced those failures by 27%. Net cost per session is minimal — only 18% of traffic exceeds 10 turns.",
    estimatedImprovement: 19,
    pipelineIds: ["context-summarizer", "response-generation"],
    promptIds: ["cs-summarizer", "rg-context-template"],
    confidence: "high",
    tradeoffs: ["~400ms extra latency on long sessions", "Additional token cost per summarization"],
  },
  {
    id: "rec-cs-3",
    projectId: "customer-service",
    title: "Cost-Optimized Classifier",
    description: "Route simple queries to Classifier v1.1 to save 42% on token costs",
    rationale: "Classifier v1.1 achieves 87% success on single-intent queries (est. 60% of traffic). A confidence fallback to v2.0 preserves quality on hard cases.",
    estimatedImprovement: 7,
    pipelineIds: ["intent-recognition"],
    promptIds: ["ir-classifier"],
    confidence: "medium",
    tradeoffs: ["6.8% lower accuracy on complex queries", "Requires threshold tuning (0.82)"],
  },
  {
    id: "rec-ca-1",
    projectId: "code-assistant",
    title: "Security-First Review Stack",
    description: "Pair Reviewer v2.0 with Severity Rules v1.1 for all PRs",
    rationale: "Reviewer v2.0 finds 3.4× more security issues. Combined with refined severity rules, teams close critical issues 2× faster.",
    estimatedImprovement: 24,
    pipelineIds: ["code-review", "test-generation"],
    promptIds: ["cr-reviewer", "cr-severity-rules", "tg-generator"],
    confidence: "high",
    tradeoffs: ["~30% higher latency per review", "Higher cost per PR"],
  },
  {
    id: "rec-cg-1",
    projectId: "content-gen",
    title: "Full-Stack Content Pipeline",
    description: "Chain Brief Generator → SEO Optimizer for end-to-end content",
    rationale: "Chaining both reduces editing cycles by 31%. The structured brief output maps directly to SEO's keyword injection step.",
    estimatedImprovement: 21,
    pipelineIds: ["brief-generation", "seo-optimization"],
    promptIds: ["bg-strategist", "seo-optimizer"],
    confidence: "high",
    tradeoffs: ["~950ms combined latency", "Higher cost per generation"],
  },
]
