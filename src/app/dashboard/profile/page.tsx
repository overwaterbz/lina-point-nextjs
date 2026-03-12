import { createServerSupabaseClient } from '@/lib/supabase-server';
import ProfileForm from '@/components/ProfileForm';
import { updateProfileAction } from './actions';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Should be redirected by middleware; render fallback
    return <p>Unauthorized</p>;
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Profile Preferences</h1>
      <div className="bg-white p-6 rounded shadow">
        <ProfileForm action={updateProfileAction} initial={profile} />
      </div>
    </div>
  );
}
