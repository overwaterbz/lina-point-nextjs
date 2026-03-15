'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthError } from '@/types/supabase';

interface AuthFormProps {
  mode?: 'login' | 'signup';
  onSuccess?: () => void;
}

export function AuthForm({ mode = 'login', onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthday, setBirthday] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [specialEvents, setSpecialEvents] = useState<Array<{ name: string; date: string }>>([]);
  const [musicStyle, setMusicStyle] = useState<string>('EDM');
  const [mayaInterests, setMayaInterests] = useState<string[]>([]);
  const [optInMagic, setOptInMagic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';

  const normalizePhone = (value: string) =>
    value.trim().replace(/^whatsapp:/i, '').replace(/\s+/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          setError(signInError.message || 'Failed to sign in');
          return;
        }

        setSuccess(true);
        onSuccess?.();
        // Full page load to ensure auth cookies are picked up
        window.location.href = returnTo;
        return;
      } else {
        const prefs = {
          phone_number: phoneNumber ? normalizePhone(phoneNumber) : null,
          birthday: birthday || null,
          anniversary: anniversary || null,
          special_events: specialEvents.length ? specialEvents : null,
          music_style: musicStyle,
          maya_interests: mayaInterests.length ? mayaInterests : null,
          opt_in_magic: optInMagic,
        } as any;

        const { error: signUpError } = await signUp(email, password, fullName, prefs);

        if (signUpError) {
          setError(signUpError.message || 'Failed to sign up');
          return;
        }

        setSuccess(true);
        onSuccess?.();
        router.push('/auth/verify-email');
      }
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          {/* Full name input (signup only) */}
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="John Doe"
                disabled={loading}
              />
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="+1 555 123 4567"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Use your WhatsApp number in E.164 format.</p>
            </div>
          )}

          {/* Preferences - birthday & anniversary (signup only) */}
          {!isLogin && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                Birthday
              </label>
              <input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="anniversary" className="block text-sm font-medium text-gray-700 mb-2">
                Anniversary
              </label>
              <input
                id="anniversary"
                type="date"
                value={anniversary}
                onChange={(e) => setAnniversary(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={loading}
              />
            </div>
          </div>
          )}

          {/* Special events list (signup only) */}
          {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Special Events</label>
            {specialEvents.map((ev, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Name"
                  aria-label={`Event ${idx + 1} name`}
                  value={ev.name}
                  onChange={(e) => {
                    const copy = [...specialEvents];
                    copy[idx].name = e.target.value;
                    setSpecialEvents(copy);
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                  disabled={loading}
                />
                <input
                  type="date"
                  aria-label={`Event ${idx + 1} date`}
                  value={ev.date}
                  onChange={(e) => {
                    const copy = [...specialEvents];
                    copy[idx].date = e.target.value;
                    setSpecialEvents(copy);
                  }}
                  className="w-40 px-3 py-2 border rounded"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setSpecialEvents(specialEvents.filter((_, i) => i !== idx))}
                  className="text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSpecialEvents([...specialEvents, { name: '', date: '' }])}
              className="text-sm text-blue-600 hover:text-blue-700 mt-2"
              disabled={loading}
            >
              + Add event
            </button>
          </div>
          )}

          {/* Music style select (signup only) */}
          {!isLogin && (
          <div>
            <label htmlFor="musicStyle" className="block text-sm font-medium text-gray-700 mb-2">Music Style</label>
            <select
              id="musicStyle"
              value={musicStyle}
              onChange={(e) => setMusicStyle(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              disabled={loading}
            >
              <option value="EDM">EDM</option>
              <option value="Pop">Pop</option>
              <option value="Ambient">Ambient</option>
              <option value="Maya Fusion">Maya Fusion</option>
            </select>
          </div>
          )}

          {/* Maya interests multiselect - signup only */}
          {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maya Interests</label>
            <div className="flex flex-wrap gap-2">
              {['Ruins', 'Cuisine', 'Wellness', 'Kundalini'].map((item) => (
                <label key={item} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mayaInterests.includes(item)}
                    onChange={(e) => {
                      if (e.target.checked) setMayaInterests([...mayaInterests, item]);
                      else setMayaInterests(mayaInterests.filter((m) => m !== item));
                    }}
                    disabled={loading}
                  />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>
          )}

          {/* Opt in magic (signup only) */}
          {!isLogin && (
          <div className="flex items-center gap-2">
            <input
              id="optInMagic"
              type="checkbox"
              checked={optInMagic}
              onChange={(e) => setOptInMagic(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="optInMagic" className="text-sm text-gray-700">Opt in to magic recommendations</label>
          </div>
          )}

          {/* Password input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                {isLogin
                  ? 'Successfully signed in!'
                  : 'Account created! Please check your email to verify.'}
              </p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !email || !password || (!isLogin && !fullName)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={toggleMode}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
