/**
 * Prompt Manager — Runtime prompt versioning with DB-backed hot-reload.
 *
 * Agents call getActivePrompt(agentName) instead of hardcoding prompts.
 * The self-improvement agent writes new versions; this manager serves them.
 *
 * Design:
 * - 5-minute in-memory cache per agent to minimize DB round-trips
 * - Falls back to hardcoded defaults if no DB prompt exists
 * - Supports approval_status: 'auto_applied' | 'approved' are active
 * - 'pending_review' requires admin approval before becoming active
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

interface CachedPrompt {
  promptText: string
  fetchedAt: number
}

const cache = new Map<string, CachedPrompt>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get the active prompt for an agent. Looks up DB first (with cache),
 * falls back to the provided default.
 */
export async function getActivePrompt(
  agentName: string,
  defaultPrompt: string,
): Promise<string> {
  const cached = cache.get(agentName)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.promptText
  }

  try {
    const { data } = await supabase
      .from('agent_prompts')
      .select('prompt_text')
      .eq('agent_name', agentName)
      .in('approval_status', ['auto_applied', 'approved'])
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.prompt_text) {
      cache.set(agentName, { promptText: data.prompt_text, fetchedAt: Date.now() })
      return data.prompt_text
    }
  } catch {
    // DB unavailable — use default
  }

  return defaultPrompt
}

/**
 * Save a new prompt version from the self-improvement agent.
 * Uses autonomy-first model: operational tweaks auto-apply,
 * strategic/directional changes go to pending_review.
 */
export async function savePromptVersion(
  agentName: string,
  promptText: string,
  changeType: 'operational' | 'directional',
  previousPrompt?: string,
): Promise<{ id: string; status: string } | null> {
  // Get the next version number
  const { data: latest } = await supabase
    .from('agent_prompts')
    .select('version')
    .eq('agent_name', agentName)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version || 0) + 1
  const approvalStatus = changeType === 'operational' ? 'auto_applied' : 'pending_review'

  const { data, error } = await supabase
    .from('agent_prompts')
    .insert({
      agent_name: agentName,
      prompt_text: promptText,
      previous_prompt: previousPrompt || null,
      version: nextVersion,
      approval_status: approvalStatus,
      change_type: changeType,
      updated_at: new Date().toISOString(),
    })
    .select('id, approval_status')
    .single()

  if (error) {
    console.error('[PromptManager] Failed to save prompt version:', error.message)
    return null
  }

  // If auto-applied, refresh cache immediately
  if (approvalStatus === 'auto_applied') {
    cache.set(agentName, { promptText, fetchedAt: Date.now() })
  }

  return data ? { id: data.id, status: data.approval_status } : null
}

/**
 * Admin approves a pending prompt update.
 */
export async function approvePrompt(promptId: string): Promise<boolean> {
  const { error } = await supabase
    .from('agent_prompts')
    .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', promptId)
    .eq('approval_status', 'pending_review')

  if (error) return false

  // Invalidate cache so next getActivePrompt picks up the new version
  refreshCache()
  return true
}

/**
 * Admin rejects a pending prompt update.
 */
export async function rejectPrompt(promptId: string): Promise<boolean> {
  const { error } = await supabase
    .from('agent_prompts')
    .update({ approval_status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', promptId)
    .eq('approval_status', 'pending_review')

  return !error
}

/**
 * Clear the prompt cache — forces fresh DB reads on next call.
 */
export function refreshCache(): void {
  cache.clear()
}

/**
 * Get all prompt versions for an agent (for admin UI).
 */
export async function getPromptHistory(agentName?: string) {
  let query = supabase
    .from('agent_prompts')
    .select('id, agent_name, prompt_text, previous_prompt, version, approval_status, change_type, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (agentName) {
    query = query.eq('agent_name', agentName)
  }

  const { data, error } = await query
  if (error) return []
  return data || []
}

/**
 * Get pending prompts awaiting admin review.
 */
export async function getPendingPrompts() {
  const { data, error } = await supabase
    .from('agent_prompts')
    .select('id, agent_name, prompt_text, previous_prompt, version, change_type, updated_at')
    .eq('approval_status', 'pending_review')
    .order('updated_at', { ascending: false })

  if (error) return []
  return data || []
}
