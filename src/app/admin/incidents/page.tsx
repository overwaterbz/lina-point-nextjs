"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface Room {
  id: string;
  room_number: string | null;
  room_type: string;
}

interface Incident {
  id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  incident_date: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  rooms?: { room_number: string | null; room_type: string } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  investigating: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const BLANK_FORM = {
  title: "",
  description: "",
  room_id: "",
  severity: "low",
  incident_date: new Date().toISOString().split("T")[0],
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [form, setForm] = useState(BLANK_FORM);
  const [statusFilter, setStatusFilter] = useState("open");

  async function load() {
    setLoading(true);
    try {
      const [incRes, roomRes] = await Promise.all([
        fetch(
          `/api/admin/incidents${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`,
        ),
        import("@/lib/supabase").then(
          async ({ createBrowserSupabaseClient }) => {
            const supabase = createBrowserSupabaseClient();
            return supabase
              .from("rooms")
              .select("id, room_number, room_type")
              .eq("status", "active");
          },
        ),
      ]);
      setIncidents(await incRes.json());
      const rr = roomRes as { data: Room[] | null; error: unknown };
      if (!rr.error) setRooms(rr.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, room_id: form.room_id || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Incident reported");
      setShowModal(false);
      setForm(BLANK_FORM);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: string,
    notes?: string,
  ) {
    const res = await fetch("/api/admin/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, resolution_notes: notes }),
    });
    if (res.ok) {
      toast.success("Status updated");
      setResolveModal(null);
      await load();
    } else {
      toast.error("Update failed");
    }
  }

  const openCount = incidents.filter((i) => i.status === "open").length;
  const criticalCount = incidents.filter(
    (i) => i.severity === "critical" && i.status !== "closed",
  ).length;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Property damage, maintenance issues, and safety incidents
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium"
        >
          + Report Incident
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open", value: openCount, color: "text-red-600" },
          { label: "Critical", value: criticalCount, color: "text-red-700" },
          {
            label: "Investigating",
            value: incidents.filter((i) => i.status === "investigating").length,
            color: "text-yellow-600",
          },
          {
            label: "Resolved",
            value: incidents.filter((i) => i.status === "resolved").length,
            color: "text-green-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl shadow p-4 text-center"
          >
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "open", "investigating", "resolved", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[inc.severity]}`}
                    >
                      {inc.severity}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inc.status]}`}
                    >
                      {inc.status}
                    </span>
                    {inc.rooms && (
                      <span className="text-xs text-gray-500">
                        Room {inc.rooms.room_number || inc.rooms.room_type}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {inc.incident_date}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mt-2">
                    {inc.title}
                  </h3>
                  {inc.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {inc.description}
                    </p>
                  )}
                  {inc.resolution_notes && (
                    <p className="text-xs text-green-700 bg-green-50 rounded p-2 mt-2">
                      <strong>Resolution:</strong> {inc.resolution_notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {inc.status === "open" && (
                    <button
                      onClick={() =>
                        handleStatusChange(inc.id, "investigating")
                      }
                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-medium"
                    >
                      Investigate
                    </button>
                  )}
                  {(inc.status === "open" ||
                    inc.status === "investigating") && (
                    <button
                      onClick={() => {
                        setResolveModal(inc.id);
                        setResolveNotes("");
                      }}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                    >
                      Resolve
                    </button>
                  )}
                  {inc.status === "resolved" && (
                    <button
                      onClick={() => handleStatusChange(inc.id, "closed")}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-medium"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              No incidents for this filter — great news! 🎉
            </div>
          )}
        </div>
      )}

      {/* New Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Report Incident</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. Broken AC unit in Cabana 2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Room (optional)
                </label>
                <select
                  value={form.room_id}
                  onChange={(e) =>
                    setForm({ ...form, room_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">— No specific room —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_number || r.room_type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm({ ...form, severity: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.incident_date}
                onChange={(e) =>
                  setForm({ ...form, incident_date: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Describe the incident in detail..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.title}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {saving ? "Saving…" : "Report Incident"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              Resolve Incident
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Resolution Notes
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Describe how the incident was resolved..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusChange(resolveModal, "resolved", resolveNotes)
                }
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
