/**
 * WhatsApp Concierge Agent
 * Uses LangGraph to handle WhatsApp conversations with Grok-4
 * Integrates with Supabase for user lookup and session management
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Grok LLM
const grokLLM = new ChatOpenAI({
  openAIApiKey: process.env.GROK_API_KEY || "",
  modelName: "grok-2",
  temperature: 0.7,
  maxTokens: 500,
  configuration: {
    baseURL: process.env.GROK_BASE_URL || "https://api.x.ai/v1",
  } as any,
});

// State schema for the agent
const WhatsAppAgentState = Annotation.Root({
  phoneNumber: Annotation<string>,
  messageBody: Annotation<string>,
  userId: Annotation<string>,
  userProfile: Annotation<Record<string, any>>,
  sessionId: Annotation<string>,
  conversationHistory: Annotation<BaseMessage[]>,
  intent: Annotation<string>,
  response: Annotation<string>,
  actionToTrigger: Annotation<string>,
  actionPayload: Annotation<Record<string, any>>,
  error: Annotation<string>,
});

/**
 * Step 1: Look up or create user and session
 */
async function lookupUser(state: typeof WhatsAppAgentState.State) {
  console.log(`[WhatsAppAgent] Looking up user for phone: ${state.phoneNumber}`);

  try {
    // Try to find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone_number", state.phoneNumber)
      .single();

    let userId = state.userId;
    let userProfile = state.userProfile || {};

    if (!profileError && profile) {
      userId = profile.user_id;
      userProfile = profile;
      console.log(`[WhatsAppAgent] Found existing user: ${userId}`);
    } else {
      console.log(`[WhatsAppAgent] No user found for phone ${state.phoneNumber}`);
      // User not found - will be treated as guest
      userProfile = {
        name: "Guest",
        phone_number: state.phoneNumber,
      };
    }

    // Get or create session
    let { data: session, error: sessionError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", state.phoneNumber)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !session) {
      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from("whatsapp_sessions")
        .insert({
          phone_number: state.phoneNumber,
          user_id: userId || null,
          context: {},
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error("[WhatsAppAgent] Error creating session:", createError);
        throw new Error("Failed to create session");
      }

      session = newSession;
      console.log(`[WhatsAppAgent] Created new session: ${session.id}`);
    } else {
      console.log(`[WhatsAppAgent] Using existing session: ${session.id}`);
    }

    // Load conversation history
    const { data: messages, error: messagesError } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(10); // Last 10 messages for context

    const conversationHistory: BaseMessage[] = [];
    if (!messagesError && messages) {
      for (const msg of messages) {
        if (msg.direction === "inbound") {
          conversationHistory.push(new HumanMessage(msg.message_body));
        } else if (msg.direction === "outbound") {
          conversationHistory.push(new AIMessage(msg.message_body));
        }
      }
    }

    return {
      ...state,
      userId,
      userProfile,
      sessionId: session.id,
      conversationHistory,
    };
  } catch (error) {
    console.error("[WhatsAppAgent] Error in lookupUser:", error);
    return {
      ...state,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Step 2: Analyze intent and generate response with Grok
 */
async function analyzeAndRespond(state: typeof WhatsAppAgentState.State) {
  if (state.error) return state;

  console.log(`[WhatsAppAgent] Analyzing message: "${state.messageBody}"`);

  try {
    // Build system prompt
    const userPrefs = state.userProfile;
    const systemPrompt = `You are Maya Guide, the AI concierge at Lina Point Resort in Belize. You provide warm, friendly, personalized assistance via WhatsApp.

**Your Role:**
- Help guests with bookings, activities, and personalized magic experiences
- Promote direct bookings (save commissions vs OTAs)
- Use guest preferences to personalize responses
- Keep replies SHORT and conversational for WhatsApp (2-3 sentences max)
- Use emojis sparingly but naturally ✨🌴🎵

**Guest Info:**
${userPrefs.name ? `- Name: ${userPrefs.name}` : "- New guest (no profile yet)"}
${userPrefs.birthday ? `- Birthday: ${userPrefs.birthday}` : ""}
${userPrefs.anniversary ? `- Anniversary: ${userPrefs.anniversary}` : ""}
${userPrefs.special_events ? `- Events: ${JSON.stringify(userPrefs.special_events)}` : ""}
${userPrefs.music_style ? `- Music Style: ${userPrefs.music_style}` : ""}
${userPrefs.maya_interests ? `- Maya Interests: ${userPrefs.maya_interests.join(", ")}` : ""}
${userPrefs.opt_in_magic ? "- Opted in for magic experiences ✨" : ""}

**Magic Experiences:**
- Personalized songs & videos (Grok + Suno + AI video)
- Maya spiritual themes, kundalini energy
- Mantra: "The Magic is You"

**Actions You Can Trigger:**
- "BOOK_ROOM" - When guest wants to book
- "GENERATE_MAGIC" - When guest wants personalized content
- "EXPLAIN_MAGIC" - When guest asks about magic experiences
- "HELP" - General assistance

**Response Format:**
Respond naturally in 2-3 sentences. If action is needed, include [ACTION:action_name] at the end.

Examples:
- "I'd love to help you book! What dates are you thinking? 🌴 [ACTION:BOOK_ROOM]"
- "Our magic experiences create personalized songs & videos for your special moments! ✨ Want me to create one? [ACTION:EXPLAIN_MAGIC]"
`;

    // Build conversation messages
    const messages: BaseMessage[] = [
      new HumanMessage(systemPrompt),
      ...state.conversationHistory,
      new HumanMessage(state.messageBody),
    ];

    // Get response from Grok
    const response = await grokLLM.invoke(messages);
    const responseText =
      response.content && typeof response.content === "string"
        ? response.content
        : "I'm here to help! What can I do for you today?";

    // Parse for actions
    let actionToTrigger = "";
    let cleanResponse = responseText;
    const actionMatch = responseText.match(/\[ACTION:(\w+)\]/);
    if (actionMatch) {
      actionToTrigger = actionMatch[1];
      cleanResponse = responseText.replace(/\[ACTION:\w+\]/, "").trim();
    }

    // Detect intent
    const messageLower = state.messageBody.toLowerCase();
    let intent = "general";
    if (
      messageLower.includes("book") ||
      messageLower.includes("reservation") ||
      messageLower.includes("room")
    ) {
      intent = "booking";
      actionToTrigger = actionToTrigger || "BOOK_ROOM";
    } else if (
      messageLower.includes("magic") ||
      messageLower.includes("song") ||
      messageLower.includes("video")
    ) {
      intent = "magic";
      actionToTrigger = actionToTrigger || "EXPLAIN_MAGIC";
    }

    console.log(`[WhatsAppAgent] Intent: ${intent}, Action: ${actionToTrigger}`);
    console.log(`[WhatsAppAgent] Response: ${cleanResponse}`);

    return {
      ...state,
      intent,
      response: cleanResponse,
      actionToTrigger,
    };
  } catch (error) {
    console.error("[WhatsAppAgent] Error in analyzeAndRespond:", error);

    // Fallback response
    return {
      ...state,
      intent: "error",
      response: "I'm having a bit of trouble right now, but I'm here to help! Could you try again? 🌟",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Step 3: Execute action if needed
 */
async function executeAction(state: typeof WhatsAppAgentState.State) {
  if (state.error || !state.actionToTrigger) return state;

  console.log(`[WhatsAppAgent] Executing action: ${state.actionToTrigger}`);

  try {
    const actionPayload: Record<string, any> = {
      action: state.actionToTrigger,
      userId: state.userId,
      phoneNumber: state.phoneNumber,
      timestamp: new Date().toISOString(),
    };

    switch (state.actionToTrigger) {
      case "BOOK_ROOM":
        // Log booking intent - actual booking would be handled by /api/book-flow
        actionPayload.note = "Guest expressed booking interest";
        actionPayload.nextStep = "redirect_to_booking_flow";
        break;

      case "GENERATE_MAGIC":
        // Log magic generation intent - would trigger /api/gen-magic-content
        actionPayload.note = "Guest wants personalized magic content";
        actionPayload.nextStep = "trigger_content_generation";
        break;

      case "EXPLAIN_MAGIC":
        // Just informational, no action needed
        actionPayload.note = "Explained magic experiences";
        break;

      default:
        actionPayload.note = "General conversation";
    }

    return {
      ...state,
      actionPayload,
    };
  } catch (error) {
    console.error("[WhatsAppAgent] Error in executeAction:", error);
    return {
      ...state,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Step 4: Save conversation to database
 */
async function saveConversation(state: typeof WhatsAppAgentState.State) {
  console.log(`[WhatsAppAgent] Saving conversation for session: ${state.sessionId}`);

  try {
    // Save inbound message
    await supabase.from("whatsapp_messages").insert({
      session_id: state.sessionId,
      phone_number: state.phoneNumber,
      direction: "inbound",
      message_body: state.messageBody,
    });

    // Save outbound response
    if (state.response) {
      await supabase.from("whatsapp_messages").insert({
        session_id: state.sessionId,
        phone_number: state.phoneNumber,
        direction: "outbound",
        message_body: state.response,
        agent_response: {
          intent: state.intent,
          action: state.actionToTrigger,
          payload: state.actionPayload,
        },
      });
    }

    // Update session
    await supabase
      .from("whatsapp_sessions")
      .update({
        last_message_at: new Date().toISOString(),
        context: {
          lastIntent: state.intent,
          lastAction: state.actionToTrigger,
        },
      })
      .eq("id", state.sessionId);

    console.log(`[WhatsAppAgent] Conversation saved successfully`);

    return state;
  } catch (error) {
    console.error("[WhatsAppAgent] Error saving conversation:", error);
    return {
      ...state,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run the WhatsApp Concierge Agent
 */
export async function runWhatsAppConciergeAgent(
  phoneNumber: string,
  messageBody: string
): Promise<{
  response: string;
  intent: string;
  action?: string;
  error?: string;
}> {
  console.log(`[WhatsAppAgent] Starting agent for ${phoneNumber}`);

  // Build LangGraph workflow
  const workflow = new StateGraph(WhatsAppAgentState)
    .addNode("lookup_user", lookupUser)
    .addNode("analyze_respond", analyzeAndRespond)
    .addNode("execute_action", executeAction)
    .addNode("save_conversation", saveConversation)
    .addEdge(START, "lookup_user")
    .addEdge("lookup_user", "analyze_respond")
    .addEdge("analyze_respond", "execute_action")
    .addEdge("execute_action", "save_conversation")
    .addEdge("save_conversation", END);

  const graph = workflow.compile();

  // Initial state
  const initialState = {
    phoneNumber,
    messageBody,
    userId: "",
    userProfile: {},
    sessionId: "",
    conversationHistory: [],
    intent: "",
    response: "",
    actionToTrigger: "",
    actionPayload: {},
    error: "",
  };

  try {
    const result = await graph.invoke(initialState);

    return {
      response: result.response,
      intent: result.intent,
      action: result.actionToTrigger,
      error: result.error,
    };
  } catch (error) {
    console.error("[WhatsAppAgent] Workflow failed:", error);
    return {
      response: "I apologize, but I'm experiencing technical difficulties. Please try again shortly! 🌟",
      intent: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
