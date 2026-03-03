import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification:
    "The sign-in link has expired or has already been used. Please request a new one.",
  Default: "An error occurred during sign in. Please try again.",
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { error } = searchParams;
  const message = ERROR_MESSAGES[error ?? "Default"] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md text-3xl">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Sign-in error</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
        </div>

        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 text-sm font-medium"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
