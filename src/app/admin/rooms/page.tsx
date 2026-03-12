'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number | null;
  status: string;
  base_price: number;
  max_occupancy: number;
  amenities: string[] | null;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  cabana_1br: '1BR Cabana',
  cabana_2br: '2BR Cabana',
  suite_2nd_floor: 'Reef Suite',
  overwater_suite: 'Overwater Suite',
};

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  occupied: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  cleaning: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .order('room_type')
        .order('room_number');
      setRooms(data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (room: Room) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('rooms').update({ status: editStatus }).eq('id', room.id);
    setEditingId(null);
    fetchRooms();
  };

  const roomsByType = rooms.reduce<Record<string, Room[]>>((acc, room) => {
    if (!acc[room.room_type]) acc[room.room_type] = [];
    acc[room.room_type].push(room);
    return acc;
  }, {});

  const stats = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance' || r.status === 'cleaning').length,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
        <p className="text-sm text-gray-600 mt-1">16-room inventory across 4 room types</p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
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
          <p className="text-2xl font-bold text-orange-600">{stats.maintenance}</p>
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
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Room #</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Price</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Capacity</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeRooms.map((room) => (
                      <tr key={room.id} className="border-t">
                        <td className="px-4 py-3 font-medium text-gray-900">{room.room_number}</td>
                        <td className="px-4 py-3">
                          {editingId === room.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                              >
                                {Object.keys(STATUS_BADGE).map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <button onClick={() => handleStatusUpdate(room)} className="text-xs text-indigo-600 font-medium">Save</button>
                              <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                            </div>
                          ) : (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[room.status] || 'bg-gray-100 text-gray-600'}`}>
                              {room.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">${room.base_price}/night</td>
                        <td className="px-4 py-3 text-gray-700">{room.max_occupancy}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setEditingId(room.id); setEditStatus(room.status); }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Edit Status
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
