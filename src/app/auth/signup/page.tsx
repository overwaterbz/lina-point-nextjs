import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = {
  title: 'Sign Up',
  description: 'Create a new account',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
