import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin";
import { runSelfImproveAction, triggerN8nAction } from "./actions";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  await requireAdmin();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service role not configured");
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: agentRuns } = await supabase
    .from("agent_runs")
    .select("id, agent_name, status, duration_ms, started_at")
    .order("started_at", { ascending: false })
    .limit(10);

  const { data: bookingAnalytics } = await supabase
    .from("booking_analytics")
    .select("id, room_type, total_cost, savings_percent, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: magicContent } = await supabase
    .from("magic_content")
    .select("id, content_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: promptUpdates } = await supabase
    .from("agent_prompts")
    .select("id, agent_name, prompt_text, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System metrics, agent performance, and manual triggers.</p>
        </header>

        {/* Quick Navigation */}
        <section className="grid gap-4 md:grid-cols-3">
          <a href="/admin/revenue" className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg shadow p-6 text-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold">📊 Revenue Dashboard</h2>
            <p className="text-sm mt-1 opacity-90">Occupancy, revenue breakdown, upsell performance</p>
          </a>
          <a href="/admin/marketing-dashboard" className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow p-6 text-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold">📱 Marketing Dashboard</h2>
            <p className="text-sm mt-1 opacity-90">Campaigns, social media, content calendar</p>
          </a>
          <a href="/admin/whatsapp" className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow p-6 text-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold">💬 WhatsApp Concierge</h2>
            <p className="text-sm mt-1 opacity-90">Guest conversations, automated responses</p>
          </a>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <form action={triggerN8nAction} className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Trigger n8n Workflow</h2>
            <p className="text-sm text-gray-600">
              Stubbed workflow: booking → curate → content → email/social.
            </p>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
            >
              Trigger Workflow
            </button>
          </form>

          <form action={runSelfImproveAction} className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Run Self-Improvement</h2>
            <p className="text-sm text-gray-600">
              Analyze logs, bookings, and preferences and persist prompt updates.
            </p>
            <button
              type="submit"
              className="rounded bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700"
            >
              Run Self-Improve
            </button>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Agent Runs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2">Agent</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Started</th>
                  <th className="py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {(agentRuns || []).map((run) => (
                  <tr key={run.id} className="border-t">
                    <td className="py-2 text-gray-800">{run.agent_name}</td>
                    <td className="py-2 text-gray-800">{run.status}</td>
                    <td className="py-2 text-gray-500">
                      {run.started_at ? new Date(run.started_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-2 text-gray-500">{run.duration_ms ? `${run.duration_ms}ms` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Bookings</h2>
            <div className="space-y-3">
              {(bookingAnalytics || []).map((booking) => (
                <div key={booking.id} className="border rounded p-3 text-sm">
                  <div className="text-gray-900">{booking.room_type}</div>
                  <div className="text-gray-500">
                    {booking.created_at ? new Date(booking.created_at).toLocaleString() : "-"}
                  </div>
                  <div className="text-gray-700">
                    Total: ${booking.total_cost} | Savings: {booking.savings_percent}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Magic Content</h2>
            <div className="space-y-3">
              {(magicContent || []).map((item) => (
                <div key={item.id} className="border rounded p-3 text-sm">
                  <div className="text-gray-900 capitalize">{item.content_type}</div>
                  <div className="text-gray-500">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                  </div>
                  <div className="text-gray-700">Status: {item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Prompt Updates</h2>
          <div className="space-y-3">
            {(promptUpdates || []).map((prompt) => (
              <div key={prompt.id} className="border rounded p-3 text-sm">
                <div className="text-gray-900">{prompt.agent_name}</div>
                <div className="text-gray-500">
                  {prompt.updated_at ? new Date(prompt.updated_at).toLocaleString() : "-"}
                </div>
                <p className="text-gray-700 mt-2">{prompt.prompt_text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
