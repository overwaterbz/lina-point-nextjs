"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface RefundPolicy {
  id: string;
  name: string;
  days_before: number;
  refund_pct: number;
  notes: string | null;
  active: boolean;
  sort_order: number;
}

const EMPTY: Omit<RefundPolicy, "id"> = {
  name: "",
  days_before: 0,
  refund_pct: 100,
  notes: "",
  active: true,
  sort_order: 0,
};

export default function RefundPolicyPage() {
  const [policies, setPolicies] = useState<RefundPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RefundPolicy | null>(null);
  const [form, setForm] = useState<Omit<RefundPolicy, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function fetchPolicies() {
    const res = await fetch("/api/admin/refund-policy");
    if (res.ok) setPolicies(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchPolicies();
  }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(p: RefundPolicy) {
    setEditing(p);
    setForm({
      name: p.name,
      days_before: p.days_before,
      refund_pct: p.refund_pct,
      notes: p.notes ?? "",
      active: p.active,
      sort_order: p.sort_order,
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch("/api/admin/refund-policy", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast.success(editing ? "Policy updated" : "Policy created");
      setShowModal(false);
      fetchPolicies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this refund policy?")) return;
    const res = await fetch(`/api/admin/refund-policy?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Deleted");
      fetchPolicies();
    } else toast.error("Delete failed");
  }

  async function toggleActive(p: RefundPolicy) {
    const res = await fetch("/api/admin/refund-policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    if (res.ok) fetchPolicies();
  }

  const pctColor = (pct: number) =>
    pct === 100
      ? "bg-emerald-100 text-emerald-800"
      : pct === 0
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Policy</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tiered cancellation rules applied automatically to guest
            cancellations
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Rule
        </button>
      </header>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>How it works:</strong> When a guest cancels, the system checks
        how many days remain until check-in and applies the first matching rule
        (ordered by sort order, highest days_before first). Rules set to
        inactive are skipped.
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Rule Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Days Before
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Refund %
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Notes
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Active
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t ${!p.active ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.days_before}+ days
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${pctColor(p.refund_pct)}`}
                    >
                      {p.refund_pct}% refund
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                    {p.notes}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.active ? "bg-indigo-600" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${p.active ? "translate-x-4" : "translate-x-1"}`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No policies defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editing ? "Edit Rule" : "New Refund Rule"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rule Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Full Refund Window"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Days Before Arrival (≥)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.days_before}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        days_before: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Refund % (0–100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.refund_pct}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        refund_pct: Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value) || 0),
                        ),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sort Order (lower = checked first)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes (shown to guests)
                </label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="rounded"
                />
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
