"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface Room {
  id: string;
  name: string;
  room_number: string;
  fish_name: string;
  room_type: string;
  floor: number | null;
  status: string;
  base_rate_usd: number;
  capacity: number;
  amenities: string[] | null;
  description: string | null;
  ical_url: string | null;
  last_ical_sync: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  suite_1st_floor: "1st Floor Hotel Suite",
  suite_2nd_floor: "2nd Floor Hotel Suite",
  cabana_1br: "1BR Overwater Cabana",
  cabana_2br: "2BR Overwater Cabana",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  available: "bg-green-100 text-green-700",
  occupied: "bg-blue-100 text-blue-700",
  maintenance: "bg-orange-100 text-orange-700",
  cleaning: "bg-yellow-100 text-yellow-700",
  blocked: "bg-red-100 text-red-700",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [icalEditId, setIcalEditId] = useState<string | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      const { data } = await supabase
        .from("rooms")
        .select(
          "id, name, room_number, fish_name, room_type, floor, status, base_rate_usd, capacity, amenities, description, ical_url, last_ical_sync",
        )
        .order("sort_order");
      setRooms(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (room: Room) => {
    const supabase = createBrowserSupabaseClient();
    await supabase
      .from("rooms")
      .update({ status: editStatus })
      .eq("id", room.id);
    setEditingId(null);
    fetchRooms();
  };

  const handleIcalSave = async (room: Room) => {
    const supabase = createBrowserSupabaseClient();
    await supabase
      .from("rooms")
      .update({ ical_url: icalUrl || null })
      .eq("id", room.id);
    setIcalEditId(null);
    fetchRooms();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "ical-sync" }),
      });
      const data = await res.json();
      alert(
        `Sync complete: ${data.rooms} rooms, +${data.blocked} blocked, -${data.released} released, ${data.errors?.length || 0} errors`,
      );
      fetchRooms();
    } catch {
      alert("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const copyFeedUrl = (room: Room) => {
    const url = `${window.location.origin}/api/ical/${room.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const roomsByType = rooms.reduce<Record<string, Room[]>>((acc, room) => {
    if (!acc[room.room_type]) acc[room.room_type] = [];
    acc[room.room_type].push(room);
    return acc;
  }, {});

  const stats = {
    total: rooms.length,
    available: rooms.filter(
      (r) => r.status === "active" || r.status === "available",
    ).length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    maintenance: rooms.filter(
      (r) => r.status === "maintenance" || r.status === "cleaning",
    ).length,
    synced: rooms.filter((r) => r.ical_url).length,
  };

  const formatSyncTime = (ts: string | null) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            16 rooms across 4 types — FreeToBook iCal sync — paste Feed URLs
            into Airbnb/Booking.com
          </p>
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {syncing ? "Syncing…" : "Sync iCal Now"}
        </button>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Occupied</p>
          <p className="text-2xl font-bold text-blue-600">{stats.occupied}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Maintenance</p>
          <p className="text-2xl font-bold text-orange-600">
            {stats.maintenance}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">iCal Linked</p>
          <p className="text-2xl font-bold text-purple-600">
            {stats.synced}/{stats.total}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(roomsByType).map(([type, typeRooms]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                {TYPE_LABELS[type] || type} ({typeRooms.length})
              </h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        #
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        Name
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        Status
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        Rate
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        iCal Sync
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        Feed
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeRooms.map((room) => (
                      <tr key={room.id} className="border-t">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {room.room_number}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">
                            {room.name}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">
                            · {room.description}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === room.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                              >
                                {Object.keys(STATUS_BADGE).map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleStatusUpdate(room)}
                                className="text-xs text-indigo-600 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-gray-400"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[room.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {room.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          ${room.base_rate_usd}/night
                        </td>
                        <td className="px-4 py-3">
                          {icalEditId === room.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="url"
                                value={icalUrl}
                                onChange={(e) => setIcalUrl(e.target.value)}
                                placeholder="https://freetobook.com/ical/..."
                                className="text-xs border rounded px-2 py-1 w-48"
                              />
                              <button
                                onClick={() => handleIcalSave(room)}
                                className="text-xs text-indigo-600 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setIcalEditId(null)}
                                className="text-xs text-gray-400"
                              >
                                ×
                              </button>
                            </div>
                          ) : room.ical_url ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 bg-green-400 rounded-full" />
                              <span className="text-xs text-gray-500">
                                {formatSyncTime(room.last_ical_sync)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not linked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => copyFeedUrl(room)}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                            title="Copy outbound iCal feed URL for Airbnb/Booking.com"
                          >
                            {copiedId === room.id
                              ? "✓ Copied!"
                              : "Copy Feed URL"}
                          </button>
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingId(room.id);
                              setEditStatus(room.status);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Status
                          </button>
                          <button
                            onClick={() => {
                              setIcalEditId(room.id);
                              setIcalUrl(room.ical_url || "");
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                          >
                            iCal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
