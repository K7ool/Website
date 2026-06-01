import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-600/10 flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
          <span className="text-4xl font-bold gradient-text">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/"
          className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm hover:from-purple-500 hover:to-blue-500 transition-all">
          Go Home
        </Link>
      </div>
    </div>
  );
}
