import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { grokLLM } from '@/lib/grokIntegration';
import { spawnSync } from 'child_process';
import type { SupabaseClient } from '@supabase/supabase-js';
import { savePromptVersion, getActivePrompt } from '@/lib/agents/promptManager';

export type SelfImproveInputs = {
  logsSummary: string;
  bookingSummary: string;
  prefsSummary: string;
  conversionSummary: string;
};

export type SelfImproveOutputs = {
  promptUpdates: Array<{ agent_name: string; prompt_text: string }>;
  insights: string[];
  score: number;
  mlInsights?: string[];
  crewSummary?: string;
};

const SelfImproveAnnotation = Annotation.Root({
  logsSummary: Annotation<string>,
  bookingSummary: Annotation<string>,
  prefsSummary: Annotation<string>,
  conversionSummary: Annotation<string>,
  insights: Annotation<string[]>,
  promptUpdates: Annotation<Array<{ agent_name: string; prompt_text: string }>>,
  score: Annotation<number>,
  mlInsights: Annotation<string[]>,
  crewSummary: Annotation<string>,
  iteration: Annotation<number>,
});

function buildSystemPrompt() {
  return `You are the Lina Point Self-Improvement Agent. Analyze system logs, bookings, preferences, and conversions.\n\nReturn JSON with:\n- insights: array of short insights\n- prompt_updates: array of { agent_name, prompt_text }\n- score: number between 0 and 1 measuring confidence/quality\n\nPrioritize concrete, minimal prompt changes to improve conversion and clarity.`;
}

function runMlTrendAnalysis(inputs: SelfImproveInputs): string[] {
  try {
    const result = spawnSync(
      'python',
      [
        'scripts/self_improve_ml.py',
        JSON.stringify({
          bookings: inputs.bookingSummary,
          prefs: inputs.prefsSummary,
          conversions: inputs.conversionSummary,
        }),
      ],
      { encoding: 'utf-8' }
    );

    if (result.error || result.status !== 0) {
      return [];
    }

    const stdout = result.stdout?.trim();
    if (!stdout) return [];

    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed?.insights)) {
      return parsed.insights.map((insight: unknown) => String(insight));
    }
  } catch {
    // fall through
  }

  return [];
}

async function runCrewSynthesis(inputs: SelfImproveInputs, mlInsights: string[]) {
  const response = await grokLLM.invoke([
    {
      role: 'system',
      content:
        'You are a CrewAI-style orchestrator. Summarize cross-agent improvements and highlight one prompt change per agent.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        logs: inputs.logsSummary,
        bookings: inputs.bookingSummary,
        prefs: inputs.prefsSummary,
        conversions: inputs.conversionSummary,
        mlInsights,
      }),
    },
  ]);

  return typeof response.content === 'string' ? response.content : String(response.content);
}

async function evaluateAndUpdate(state: typeof SelfImproveAnnotation.State) {
  const mlInsights = runMlTrendAnalysis({
    logsSummary: state.logsSummary,
    bookingSummary: state.bookingSummary,
    prefsSummary: state.prefsSummary,
    conversionSummary: state.conversionSummary,
  });

  const crewSummary = await runCrewSynthesis(
    {
      logsSummary: state.logsSummary,
      bookingSummary: state.bookingSummary,
      prefsSummary: state.prefsSummary,
      conversionSummary: state.conversionSummary,
    },
    mlInsights
  );

  const response = await grokLLM.invoke([
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'user',
      content: JSON.stringify({
        logs: state.logsSummary,
        bookings: state.bookingSummary,
        prefs: state.prefsSummary,
        conversions: state.conversionSummary,
        ml_insights: mlInsights,
        crew_summary: crewSummary,
      }),
    },
  ]);

  const content = typeof response.content === 'string' ? response.content : String(response.content);
  let parsed: any = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = null;
  }

  const insights = Array.isArray(parsed?.insights) ? parsed.insights.slice(0, 8) : [];
  const promptUpdates = Array.isArray(parsed?.prompt_updates) ? parsed.prompt_updates : [];
  const score = typeof parsed?.score === 'number' ? parsed.score : 0.5;

  return {
    ...state,
    insights,
    promptUpdates,
    score,
    mlInsights,
    crewSummary,
  };
}

function shouldRefine(state: typeof SelfImproveAnnotation.State) {
  if (state.score >= 0.8) return 'done';
  if (state.iteration >= 3) return 'done';
  return 'refine';
}

async function refine(state: typeof SelfImproveAnnotation.State) {
  return {
    ...state,
    iteration: state.iteration + 1,
  };
}

export async function runSelfImprovementAgent(inputs: SelfImproveInputs): Promise<SelfImproveOutputs> {
  const graph = new StateGraph(SelfImproveAnnotation)
    .addNode('evaluate', evaluateAndUpdate)
    .addNode('refine', refine)
    .addEdge(START, 'evaluate')
    .addConditionalEdges('evaluate', shouldRefine, {
      refine: 'refine',
      done: END,
    })
    .addEdge('refine', 'evaluate');

  const finalState = await graph.compile().invoke({
    ...inputs,
    insights: [],
    promptUpdates: [],
    score: 0,
    mlInsights: [],
    crewSummary: '',
    iteration: 1,
  });

  return {
    promptUpdates: finalState.promptUpdates || [],
    insights: finalState.insights || [],
    score: finalState.score || 0,
    mlInsights: finalState.mlInsights || [],
    crewSummary: finalState.crewSummary || '',
  };
}

export async function savePromptUpdates(
  supabase: SupabaseClient<any>,
  updates: Array<{ agent_name: string; prompt_text: string }>
): Promise<void> {
  if (updates.length === 0) return;

  for (const update of updates) {
    // Get the current active prompt to store as previous
    const currentPrompt = await getActivePrompt(update.agent_name, '');

    // Classify change type: directional changes affect guest experience / brand
    const changeType = await classifyChangeType(update.agent_name, update.prompt_text, currentPrompt);

    await savePromptVersion(
      update.agent_name,
      update.prompt_text,
      changeType,
      currentPrompt || undefined,
    );
  }
}

/**
 * Classify whether a prompt change is operational (auto-apply) or
 * directional (needs admin review). Uses Grok for nuanced classification.
 */
async function classifyChangeType(
  agentName: string,
  newPrompt: string,
  previousPrompt: string,
): Promise<'operational' | 'directional'> {
  try {
    const classificationPrompt = `You are classifying an AI prompt change for the "${agentName}" agent at Lina Point hotel.

Previous prompt: ${previousPrompt || '(none)'}
New prompt: ${newPrompt}

Classify this change as ONE of:
- "operational" = performance tuning, wording polish, clarity fixes, bug fixes, efficiency improvements
- "directional" = new features, pricing strategy changes, brand voice shifts, new guest-facing functionality, significant behavior changes

Reply with ONLY the word "operational" or "directional".`;

    const response = await grokLLM.invoke(classificationPrompt);
    const text = typeof response === 'string' ? response : response?.content?.toString() || '';
    return text.trim().toLowerCase().includes('directional') ? 'directional' : 'operational';
  } catch {
    // If classification fails, be safe and require review
    return 'directional';
  }
}

export async function runSelfImprovementAndPersist(
  supabase: SupabaseClient<any>,
  inputs: SelfImproveInputs
): Promise<SelfImproveOutputs> {
  const result = await runSelfImprovementAgent(inputs);
  await savePromptUpdates(supabase, result.promptUpdates);
  return result;
}
