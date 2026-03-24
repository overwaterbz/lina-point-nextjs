"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface Invoice {
  id: string;
  invoice_number: string;
  guest_id: string;
  reservation_id: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  guest?: { full_name: string | null; email: string | null };
}

interface InvoiceItem {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const refetch = async (currentFilter: string) => {
    const supabase = createBrowserSupabaseClient();
    let query = supabase
      .from("invoices")
      .select("*, guest:profiles!invoices_guest_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (currentFilter !== "all") query = query.eq("status", currentFilter);
    const { data } = await query;
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      let query = supabase
        .from("invoices")
        .select("*, guest:profiles!invoices_guest_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") query = query.eq("status", filter);
      const { data } = await query;
      if (active) {
        setInvoices(data || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/invoices?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json();
      console.error("Invoice update failed:", j.error);
      return;
    }
    refetch(filter);
  };

  const totals = {
    draft: invoices
      .filter((i) => i.status === "draft")
      .reduce((s, i) => s + i.total, 0),
    sent: invoices
      .filter((i) => i.status === "sent")
      .reduce((s, i) => s + i.total, 0),
    paid: invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.total, 0),
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage guest invoices
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {invoices.length} invoices
        </span>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Draft</p>
          <p className="text-xl font-bold text-gray-900">
            ${totals.draft.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Outstanding (Sent)</p>
          <p className="text-xl font-bold text-blue-700">
            ${totals.sent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Collected</p>
          <p className="text-xl font-bold text-green-700">
            ${totals.paid.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "sent", "paid", "void"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filter === s
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No invoices found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Invoice #
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">Guest</th>
                <th className="px-4 py-3 font-medium text-gray-600">Issued</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">
                  Total
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <>
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                      <button
                        onClick={() =>
                          setExpanded(expanded === inv.id ? null : inv.id)
                        }
                        className="hover:underline"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {inv.guest?.full_name || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inv.guest?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.issued_at
                        ? new Date(inv.issued_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {inv.currency} ${inv.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] || STATUS_COLORS.draft}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {inv.status === "draft" && (
                          <button
                            onClick={() => handleStatusChange(inv.id, "sent")}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Send
                          </button>
                        )}
                        {inv.status === "sent" && (
                          <button
                            onClick={() => handleStatusChange(inv.id, "paid")}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        {inv.status !== "void" && inv.status !== "paid" && (
                          <button
                            onClick={() => handleStatusChange(inv.id, "void")}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === inv.id && (
                    <tr key={`${inv.id}-detail`}>
                      <td colSpan={6} className="px-4 pb-4 bg-gray-50">
                        <div className="rounded-lg border border-gray-200 overflow-hidden mt-1">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">
                                  Description
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">
                                  Qty
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">
                                  Unit
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(inv.items || []).map((item, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-gray-800">
                                    {item.description}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">
                                    {item.qty}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">
                                    ${item.unit_price}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    ${item.amount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 text-xs">
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-3 py-1.5 text-right text-gray-500"
                                >
                                  Subtotal
                                </td>
                                <td className="px-3 py-1.5 text-right font-medium">
                                  ${inv.subtotal}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-3 py-1.5 text-right text-gray-500"
                                >
                                  GST ({(inv.tax_rate * 100).toFixed(1)}%)
                                </td>
                                <td className="px-3 py-1.5 text-right font-medium">
                                  ${inv.tax_amount}
                                </td>
                              </tr>
                              <tr className="font-semibold">
                                <td
                                  colSpan={3}
                                  className="px-3 py-1.5 text-right"
                                >
                                  Total
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  ${inv.total}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
