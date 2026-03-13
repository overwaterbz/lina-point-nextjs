'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface TourOtaPrice {
  platform: string;
  ota_name: string;
  ota_price: number;
  ota_rating: number | null;
  our_price: number;
  scraped_at: string;
}

interface Tour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_hours: number;
  category: string;
  max_guests: number;
  image_url: string | null;
  active: boolean;
  tour_ota_prices?: TourOtaPrice[];
}

const CATEGORIES = ['water', 'culture', 'nature', 'adventure', 'wellness', 'dining'];

export default function AdminToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showOta, setShowOta] = useState<string | null>(null);

  const fetchTours = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      const { data } = await supabase
        .from('tours')
        .select('*, tour_ota_prices(*)')
        .order('category')
        .order('name');
      setTours(data || []);
    } catch (err) { console.error(err) } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name') as string,
      description: form.get('description') as string,
      price: parseFloat(form.get('price') as string),
      duration_hours: parseFloat(form.get('duration_hours') as string),
      category: form.get('category') as string,
      max_guests: parseInt(form.get('max_guests') as string, 10),
      active: form.get('active') === 'on',
    };

    const supabase = createBrowserSupabaseClient();
    if (editing) {
      const { error } = await supabase.from('tours').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Tour updated');
    } else {
      const { error } = await supabase.from('tours').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Tour created');
    }
    setEditing(null);
    setShowForm(false);
    fetchTours();
  };

  const handleToggleActive = async (tour: Tour) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('tours').update({ active: !tour.active }).eq('id', tour.id);
    fetchTours();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage Dee Kay&apos;s Tours catalog</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          + Add Tour
        </button>
      </header>

      {/* Form modal */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Tour' : 'New Tour'}</h2>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input name="name" defaultValue={editing?.name} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea name="description" defaultValue={editing?.description} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price (USD)</label>
              <input name="price" type="number" step="0.01" defaultValue={editing?.price} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (hours)</label>
              <input name="duration_hours" type="number" step="0.5" defaultValue={editing?.duration_hours} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select name="category" defaultValue={editing?.category || 'water'} className="w-full border rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Guests</label>
              <input name="max_guests" type="number" defaultValue={editing?.max_guests || 10} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} className="rounded" />
              <label className="text-sm text-gray-700">Active (visible to guests)</label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                {editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setEditing(null); setShowForm(false); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Tour</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Our Price</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">OTA Prices</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Duration</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((tour) => {
                const otaPrices = tour.tour_ota_prices || [];
                const lowestOta = otaPrices.length > 0
                  ? Math.min(...otaPrices.map(p => p.ota_price))
                  : null;
                const beating = lowestOta ? tour.price < lowestOta : false;
                return (
                <React.Fragment key={tour.id}>
                <tr className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{tour.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{tour.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{tour.category}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">${tour.price}</td>
                  <td className="px-4 py-3">
                    {otaPrices.length > 0 ? (
                      <button
                        onClick={() => setShowOta(showOta === tour.id ? null : tour.id)}
                        className="flex items-center gap-1.5"
                      >
                        <span className={`inline-block w-2 h-2 rounded-full ${beating ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium text-gray-700">
                          {beating
                            ? `Beating by ${Math.round(((lowestOta! - tour.price) / lowestOta!) * 100)}%`
                            : `Above OTA`}
                        </span>
                        <span className="text-xs text-gray-400">{showOta === tour.id ? '▲' : '▼'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No data</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tour.duration_hours}h</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(tour)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${tour.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {tour.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditing(tour); setShowForm(true); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
                {showOta === tour.id && otaPrices.length > 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-2 bg-slate-50">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {otaPrices.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border text-xs">
                            <div>
                              <span className="font-medium text-gray-700 capitalize">{p.platform}</span>
                              {p.ota_rating && <span className="ml-1 text-yellow-600">★ {p.ota_rating}</span>}
                            </div>
                            <div className="text-right">
                              <span className="text-red-400 line-through">${p.ota_price}</span>
                              <span className="ml-2 font-bold text-green-600">${p.our_price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Last scraped: {otaPrices[0]?.scraped_at ? new Date(otaPrices[0].scraped_at).toLocaleString() : 'N/A'}
                      </p>
                    </td>
                  </tr>
                )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
