'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LoyaltyInfo {
  points: number;
  tier: string;
  referral_code: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  category: string;
  active: boolean;
}

interface ReferralRecord {
  id: string;
  referred_email: string;
  status: string;
  points_earned: number;
  created_at: string;
}

const TIER_THRESHOLDS = [
  { name: 'New', min: 0, color: 'text-gray-600 bg-gray-200', discount: 0, perks: ['Base rate pricing'] },
  { name: 'Returning', min: 500, color: 'text-blue-700 bg-blue-100', discount: 5, perks: ['5% off all stays', '1 pt per $1'] },
  { name: 'Loyal', min: 2000, color: 'text-purple-700 bg-purple-100', discount: 10, perks: ['10% off all stays', '1.5x points', 'Free early check-in'] },
  { name: 'VIP', min: 5000, color: 'text-amber-700 bg-amber-100', discount: 15, perks: ['15% off all stays', '2x points', 'Free upgrades', 'Welcome gift', 'Priority concierge'] },
];

export default function LoyaltyPage() {
  const { user, profile } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createBrowserSupabaseClient();

    (async () => {
      try {
        const [profileRes, rewardsRes, referralsRes] = await Promise.all([
          supabase.from('profiles').select('loyalty_points, loyalty_tier, referral_code').eq('user_id', user.id).single(),
          supabase.from('loyalty_rewards').select('*').eq('active', true).order('points_cost'),
          supabase.from('referrals').select('id, referred_email, status, points_earned, created_at').eq('referrer_id', user.id).order('created_at', { ascending: false }),
        ]);
        if (profileRes.data) {
          setLoyalty({
            points: profileRes.data.loyalty_points || 0,
            tier: profileRes.data.loyalty_tier || 'Bronze',
            referral_code: profileRes.data.referral_code || '',
          });
        }
        setRewards(rewardsRes.data || []);
        setReferrals(referralsRes.data || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleRedeem = async (reward: Reward) => {
    if (!loyalty || loyalty.points < reward.points_cost) {
      toast.error('Not enough points');
      return;
    }
    toast.success(`Redeemed: ${reward.name}! A staff member will reach out to arrange details.`);
  };

  const copyReferralLink = () => {
    if (!loyalty?.referral_code) return;
    const link = `${window.location.origin}?ref=${loyalty.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentTier = TIER_THRESHOLDS.findLast((t) => (loyalty?.points || 0) >= t.min) || TIER_THRESHOLDS[0];
  const nextTier = TIER_THRESHOLDS.find((t) => t.min > (loyalty?.points || 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Loyalty & Referrals</h1>
        <p className="text-sm text-gray-600 mt-1">Earn points for every stay, tour, and referral</p>
      </header>

      {/* Points summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="text-center sm:text-left">
            <p className="text-4xl font-bold text-teal-700">{loyalty?.points?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">Points Available</p>
          </div>
          <div>
            <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${currentTier.color}`}>
              {currentTier.name} Member
            </span>
            {nextTier && (
              <p className="text-xs text-gray-400 mt-1">
                {nextTier.min - (loyalty?.points || 0)} more points to {nextTier.name}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {nextTier && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((loyalty?.points || 0) / nextTier.min) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Referral section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Refer a Friend</h2>
        <p className="text-sm text-gray-600 mb-4">
          Share your code and earn 250 points when your friend completes their first stay!
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-slate-100 px-4 py-2 rounded-lg text-sm font-mono text-slate-700 truncate">
            {loyalty?.referral_code || 'Loading...'}
          </code>
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700"
          >
            Copy Link
          </button>
          <button
            onClick={() => {
              const msg = encodeURIComponent(
                `Book at Lina Point Resort with my code ${loyalty?.referral_code} for $25 off! ${window.location.origin}?ref=${loyalty?.referral_code}`
              );
              window.open(`https://wa.me/?text=${msg}`, '_blank');
            }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
          >
            WhatsApp
          </button>
        </div>
        {referrals.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase">Your Referrals</p>
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-700">{r.referred_email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {r.status} {r.points_earned > 0 && `(+${r.points_earned} pts)`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier Benefits */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Tier Benefits</h2>
        <p className="text-sm text-gray-600 mb-4">
          Book direct to save 6% below any OTA — plus unlock loyalty discounts up to 15% off.
        </p>
        <div className="space-y-2">
          {TIER_THRESHOLDS.map((tier) => (
            <div
              key={tier.name}
              className={`p-3 rounded-lg border ${
                tier.name.toLowerCase() === (loyalty?.tier?.toLowerCase() || 'new')
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${tier.color}`}>
                  {tier.name.toLowerCase() === (loyalty?.tier?.toLowerCase() || 'new') ? '► ' : ''}{tier.name}
                </span>
                <span className="text-xs text-gray-500">{tier.min}+ points</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5 mt-1">
                {tier.perks.map(p => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards catalog */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Redeem Rewards</h2>
        {rewards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-sm">Rewards catalog coming soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => (
              <div key={r.id} className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-900">{r.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-bold text-teal-700">{r.points_cost} pts</span>
                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={(loyalty?.points || 0) < r.points_cost}
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-teal-600 text-white hover:bg-teal-700"
                  >
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
