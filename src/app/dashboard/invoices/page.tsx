'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Invoice {
  id: string;
  reservation_id: string | null;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  items: Array<{ description: string; amount: number }> | null;
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('guest_id', user.id)
          .order('created_at', { ascending: false });
        setInvoices(data || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-600 mt-1">View your billing history and payment receipts</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-3xl mb-3">📄</p>
          <h2 className="text-lg font-semibold text-gray-900">No invoices yet</h2>
          <p className="text-sm text-gray-500 mt-1">Invoices will appear here after you make a booking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                className="w-full p-5 flex flex-col sm:flex-row sm:items-center gap-3 text-left hover:bg-slate-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{inv.invoice_number}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(inv.created_at).toLocaleDateString()}
                    {inv.issued_at && ` · Issued ${new Date(inv.issued_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">${inv.total.toFixed(2)}</p>
                  {inv.paid_at && (
                    <p className="text-xs text-green-600">Paid {new Date(inv.paid_at).toLocaleDateString()}</p>
                  )}
                </div>
              </button>

              {expanded === inv.id && (
                <div className="border-t px-5 py-4 bg-slate-50 space-y-3">
                  {inv.items && inv.items.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-2">Line Items</p>
                      {inv.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span className="text-gray-700">{item.description}</span>
                          <span className="text-gray-900 font-medium">${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="border-t pt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span>${inv.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax</span>
                      <span>${inv.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span>${inv.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
