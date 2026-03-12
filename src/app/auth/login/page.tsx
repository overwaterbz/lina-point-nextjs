import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
