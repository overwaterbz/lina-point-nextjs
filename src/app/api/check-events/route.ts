import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logger';
import { handleServiceError } from '@/lib/errorHandler';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return handleServiceError('Supabase', 'Service key not configured');
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Optimized query - only select necessary fields
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id,user_id,birthday,anniversary,opt_in_magic');
    
    if (error) {
      return handleServiceError('Supabase', error);
    }

    const today = new Date();
    const todayMonth = today.getUTCMonth() + 1;
    const todayDay = today.getUTCDate();

    const triggers: Array<{ user_id: string; reason: string }> = [];

    profiles?.forEach((profile) => {
      if (!profile.user_id) return;

      if (profile.birthday) {
        try {
          const birthDate = new Date(profile.birthday);
          if (birthDate.getUTCMonth() + 1 === todayMonth && birthDate.getUTCDate() === todayDay) {
            logDebug(`Birthday trigger for user ${profile.user_id}`);
            triggers.push({ user_id: profile.user_id, reason: 'birthday' });
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (profile.anniversary) {
        try {
          const anniversaryDate = new Date(profile.anniversary);
          if (anniversaryDate.getUTCMonth() + 1 === todayMonth && anniversaryDate.getUTCDate() === todayDay) {
            logDebug(`Anniversary trigger for user ${profile.user_id}`);
            triggers.push({ user_id: profile.user_id, reason: 'anniversary' });
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    return NextResponse.json({ triggers });
  } catch (err) {
    logError('check-events failed', err);
    return handleServiceError('Event Check', err);
  }
}
