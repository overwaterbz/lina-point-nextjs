'use client';

import { useEffect, useState, useCallback } from 'react';
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

interface OTARate {
  room_type: string;
  date: string;
  ota_name: string;
  ota_price: number;
  our_rate: number | null;
  is_live: boolean;
  scraped_at: string;
}

const ROOM_LABELS: Record<string, string> = {
  suite_2nd_floor: '2nd Floor Suite',
  suite_1st_floor: '1st Floor Suite',
  cabana_duplex: '1 Bed Duplex Cabana',
  cabana_1br: '1BR Cabana',
  cabana_2br: '2BR Cabana',
};

const ROOM_TYPES = Object.keys(ROOM_LABELS);

export default function PricingPage() {
  const [rooms, setRooms] = useState<RoomPricing[]>([]);
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [otaRates, setOtaRates] = useState<OTARate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBase, setEditingBase] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      const [roomsRes, overridesRes, otaRes] = await Promise.all([
        supabase.from('rooms').select('id, room_type, base_price').order('room_type'),
        supabase.from('price_overrides').select('*').gte('date_end', new Date().toISOString().split('T')[0]).order('date_start'),
        supabase.from('daily_ota_rates').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(100),
      ]);
      setRooms(roomsRes.data || []);
      setOverrides(overridesRes.data || []);
      setOtaRates(otaRes.data || []);
    } catch (err) { console.error(err) } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

          {/* OTA Price Comparison */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">OTA Price Comparison</h2>
                <p className="text-xs text-gray-500 mt-1">Auto-scraped rates — our prices beat OTAs by 6%</p>
              </div>
              {otaRates.length > 0 && (
                <p className="text-xs text-gray-400">
                  Last scraped: {new Date(otaRates[0].scraped_at).toLocaleString()}
                </p>
              )}
            </div>

            {otaRates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No OTA data yet — runs daily via cron</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Room Type</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">OTA</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">OTA Price</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Our Rate</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Savings</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otaRates.map((rate) => {
                      const savings = rate.our_rate ? Math.round(((rate.ota_price - rate.our_rate) / rate.ota_price) * 100) : 0;
                      const isBeating = savings > 0;
                      return (
                        <tr key={`${rate.room_type}-${rate.date}-${rate.ota_name}`} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2 text-gray-600">{new Date(rate.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{ROOM_LABELS[rate.room_type] || rate.room_type}</td>
                          <td className="px-3 py-2 text-gray-600 capitalize">
                            {rate.ota_name}
                            {!rate.is_live && <span className="ml-1 text-xs text-amber-500">(est.)</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500 line-through">${rate.ota_price}</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{rate.our_rate ? `$${rate.our_rate}` : '—'}</td>
                          <td className="px-3 py-2 text-right text-sm">{savings > 0 ? `${savings}%` : '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block w-2 h-2 rounded-full ${isBeating ? 'bg-green-500' : savings === 0 ? 'bg-yellow-400' : 'bg-red-500'}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
