"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_booking_amount: number;
  max_discount: number | null;
  valid_from: string;
  valid_to: string | null;
  max_uses: number | null;
  current_uses: number;
  single_use_per_guest: boolean;
  room_type: string | null;
  active: boolean;
  created_at: string;
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percent" as "fixed" | "percent",
    discount_value: 10,
    min_booking_amount: 0,
    max_discount: "",
    valid_to: "",
    max_uses: "",
    single_use_per_guest: true,
    room_type: "",
  });

  const fetchPromos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/promos");
      const data = await res.json();
      setPromos(data.promos || []);
    } catch {
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase().trim(),
          max_discount: form.max_discount ? Number(form.max_discount) : null,
          valid_to: form.valid_to || null,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          room_type: form.room_type || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Promo code created");
      setShowCreate(false);
      setForm({ code: "", description: "", discount_type: "percent", discount_value: 10, min_booking_amount: 0, max_discount: "", valid_to: "", max_uses: "", single_use_per_guest: true, room_type: "" });
      fetchPromos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create promo");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch("/api/admin/promos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      setPromos(prev => prev.map(p => p.id === id ? { ...p, active: !active } : p));
      toast.success(active ? "Promo deactivated" : "Promo activated");
    } catch {
      toast.error("Failed to update promo");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-600 mt-1">Manage discount codes for direct bookings</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Promo"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Summer direct booking discount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm(f => ({ ...f, discount_type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value ({form.discount_type === "percent" ? "%" : "$"})
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                min={0}
                step={form.discount_type === "percent" ? 1 : 5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Booking ($)</label>
              <input
                type="number"
                value={form.min_booking_amount}
                onChange={(e) => setForm(f => ({ ...f, min_booking_amount: Number(e.target.value) }))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Cap ($)</label>
              <input
                type="number"
                value={form.max_discount}
                onChange={(e) => setForm(f => ({ ...f, max_discount: e.target.value }))}
                placeholder="No cap"
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
              <input
                type="date"
                value={form.valid_to}
                onChange={(e) => setForm(f => ({ ...f, valid_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited"
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <select
                value={form.room_type}
                onChange={(e) => setForm(f => ({ ...f, room_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Room Types</option>
                <option value="suite_1st_floor">1st Floor Suite</option>
                <option value="suite_2nd_floor">2nd Floor Suite</option>
                <option value="cabana_1br">1BR Cabana</option>
                <option value="cabana_2br">2BR Cabana</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="single_use"
                checked={form.single_use_per_guest}
                onChange={(e) => setForm(f => ({ ...f, single_use_per_guest: e.target.checked }))}
                className="h-4 w-4 text-teal-600 rounded"
              />
              <label htmlFor="single_use" className="text-sm text-gray-700">Single use per guest</label>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
          >
            {saving ? "Creating..." : "Create Promo Code"}
          </button>
        </form>
      )}

      {/* Promo Table */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No promo codes yet</p>
          <p className="text-sm mt-1">Create your first promo code to incentivize direct bookings</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Discount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promos.map((p) => (
                <tr key={p.id} className={!p.active ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-800">{p.code}</span>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-green-700">
                      {p.discount_type === "percent" ? `${p.discount_value}%` : `$${p.discount_value}`}
                    </span>
                    {p.max_discount && <span className="text-xs text-gray-400 ml-1">(max ${p.max_discount})</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {p.valid_to || "Never"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.current_uses}{p.max_uses ? `/${p.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(p.id, p.active)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
