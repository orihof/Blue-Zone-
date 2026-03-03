import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md text-3xl">
          📬
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            A sign-in link has been sent to your email address.
            <br />
            Click the link in the email to sign in to Blue Zone.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 text-left space-y-2 text-sm text-gray-600">
          <p className="font-medium text-gray-900">Didn&apos;t receive it?</p>
          <ul className="space-y-1 list-disc list-inside text-xs">
            <li>Check your spam or junk folder</li>
            <li>The link expires in 24 hours</li>
            <li>Make sure you entered the correct email</li>
          </ul>
        </div>

        <Link
          href="/auth/signin"
          className="inline-block text-sm text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
