"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

interface Guest {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_tier: string | null;
  loyalty_points: number | null;
  total_stays: number;
  created_at: string;
}

function exportCsv(rows: Guest[]) {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Tier",
    "Points",
    "Stays",
    "Joined",
  ];
  const lines = rows.map((g) =>
    [
      g.full_name ?? "",
      g.email ?? "",
      g.phone ?? "",
      g.loyalty_tier ?? "Bronze",
      String(g.loyalty_points ?? 0),
      String(g.total_stays ?? 0),
      new Date(g.created_at).toLocaleDateString(),
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `guests-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const { data } = await supabase
          .from("profiles")
          .select(
            "user_id, full_name, email, phone, loyalty_tier, loyalty_points, total_stays, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(200);
        setGuests(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = guests.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.full_name?.toLowerCase().includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.phone?.includes(q)
    );
  });

  const allSelected =
    filtered.length > 0 && filtered.every((g) => selected.has(g.user_id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((g) => next.delete(g.user_id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((g) => next.add(g.user_id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedGuests = filtered.filter((g) => selected.has(g.user_id));

  const tierColor: Record<string, string> = {
    Bronze: "text-amber-700 bg-amber-100",
    Silver: "text-gray-600 bg-gray-200",
    Gold: "text-yellow-700 bg-yellow-100",
    Platinum: "text-purple-700 bg-purple-100",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest CRM</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage guest profiles, loyalty tiers, and history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{guests.length} guests</span>
          {selected.size > 0 && (
            <button
              onClick={() => exportCsv(selectedGuests)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium"
            >
              Export {selected.size} selected
            </button>
          )}
          <button
            onClick={() => exportCsv(filtered)}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
          >
            Export All CSV
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Guest
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Tier
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Points
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Stays
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Joined
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr
                    key={g.user_id}
                    className={`border-t hover:bg-slate-50 ${selected.has(g.user_id) ? "bg-indigo-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(g.user_id)}
                        onChange={() => toggleOne(g.user_id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {g.full_name || "Unknown"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <p>{g.email}</p>
                      {g.phone && <p className="text-xs">{g.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierColor[g.loyalty_tier || "Bronze"] || "bg-gray-100 text-gray-600"}`}
                      >
                        {g.loyalty_tier || "Bronze"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(g.loyalty_points || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {g.total_stays || 0}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/guests/${g.user_id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No guests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
