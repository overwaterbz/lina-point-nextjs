export const metadata = {
  title: "Verify Email",
  description: "Verify your email address",
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4 text-center text-gray-900">
            Check Your Email
          </h1>
          <p className="text-gray-600 text-center mb-6">
            We&apos;ve sent you a confirmation link. Please check your email and
            click the link to verify your account.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              If you don&apos;t see the email, please check your spam folder.
            </p>
          </div>
          <a
            href="/auth/login"
            className="mt-6 block text-center text-blue-600 hover:text-blue-700 font-semibold transition"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
