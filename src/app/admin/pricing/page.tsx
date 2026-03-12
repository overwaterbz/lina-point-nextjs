'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface RoomPricing {
  id: string;
  room_type: string;
  base_price: number;
}

interface PriceOverride {
  id: string;
  room_type: string;
  date_start: string;
  date_end: string;
  price: number;
  label: string | null;
}

const ROOM_LABELS: Record<string, string> = {
  cabana_1br: '1BR Cabana',
  cabana_2br: '2BR Cabana',
  suite_2nd_floor: 'Reef Suite',
  overwater_suite: 'Overwater Suite',
};

const ROOM_TYPES = Object.keys(ROOM_LABELS);

export default function PricingPage() {
  const [rooms, setRooms] = useState<RoomPricing[]>([]);
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBase, setEditingBase] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const fetchData = async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      const [roomsRes, overridesRes] = await Promise.all([
        supabase.from('rooms').select('id, room_type, base_price').order('room_type'),
        supabase.from('price_overrides').select('*').gte('date_end', new Date().toISOString().split('T')[0]).order('date_start'),
      ]);
      setRooms(roomsRes.data || []);
      setOverrides(overridesRes.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Deduplicate to one price per room type
  const basePrices = ROOM_TYPES.map((rt) => {
    const room = rooms.find((r) => r.room_type === rt);
    return { room_type: rt, base_price: room?.base_price || 0 };
  });

  const handleUpdateBase = async (roomType: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) { toast.error('Invalid price'); return; }
    const supabase = createBrowserSupabaseClient();
    await supabase.from('rooms').update({ base_price: price }).eq('room_type', roomType);
    setEditingBase(null);
    fetchData();
    toast.success('Base price updated');
  };

  const handleAddOverride = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      room_type: form.get('room_type') as string,
      date_start: form.get('date_start') as string,
      date_end: form.get('date_end') as string,
      price: parseFloat(form.get('price') as string),
      label: (form.get('label') as string) || null,
    };
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from('price_overrides').insert(payload);
    if (error) { toast.error('Failed to add override'); return; }
    toast.success('Price override added');
    setShowOverrideForm(false);
    fetchData();
  };

  const handleDeleteOverride = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('price_overrides').delete().eq('id', id);
    fetchData();
    toast.success('Override removed');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
        <p className="text-sm text-gray-600 mt-1">Set base rates and seasonal / event overrides</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Base Prices */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Base Nightly Rates</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {basePrices.map((bp) => (
                <div key={bp.room_type} className="border rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">{ROOM_LABELS[bp.room_type]}</p>
                  {editingBase === bp.room_type ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm"
                      />
                      <button onClick={() => handleUpdateBase(bp.room_type)} className="text-xs text-indigo-600 font-medium">Save</button>
                      <button onClick={() => setEditingBase(null)} className="text-xs text-gray-400">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-2xl font-bold text-gray-900">${bp.base_price}</p>
                      <button
                        onClick={() => { setEditingBase(bp.room_type); setNewPrice(String(bp.base_price)); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Price Overrides */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Price Overrides</h2>
              <button
                onClick={() => setShowOverrideForm(!showOverrideForm)}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                + Add Override
              </button>
            </div>

            {showOverrideForm && (
              <form onSubmit={handleAddOverride} className="grid gap-3 sm:grid-cols-5 mb-4 p-4 bg-slate-50 rounded-lg">
                <select name="room_type" required className="border rounded-lg px-2 py-1.5 text-sm">
                  {ROOM_TYPES.map((rt) => <option key={rt} value={rt}>{ROOM_LABELS[rt]}</option>)}
                </select>
                <input name="date_start" type="date" required className="border rounded-lg px-2 py-1.5 text-sm" />
                <input name="date_end" type="date" required className="border rounded-lg px-2 py-1.5 text-sm" />
                <input name="price" type="number" step="0.01" placeholder="Price" required className="border rounded-lg px-2 py-1.5 text-sm" />
                <div className="flex items-center gap-2">
                  <input name="label" placeholder="Label (optional)" className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
                  <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg">Add</button>
                </div>
              </form>
            )}

            {overrides.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active overrides</p>
            ) : (
              <div className="space-y-2">
                {overrides.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ROOM_LABELS[o.room_type]} — ${o.price}/night
                        {o.label && <span className="text-gray-500 ml-2">({o.label})</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(o.date_start).toLocaleDateString()} – {new Date(o.date_end).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(o.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
