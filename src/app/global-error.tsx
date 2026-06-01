"use client";

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("[GLOBAL ERROR BOUNDARY]", error);

  return (
    <html>
      <body className="bg-dark-900">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Critical error</h1>
            <p className="text-gray-400 mb-8 text-sm">
              A critical error occurred. Please check your environment configuration.
            </p>
            <button onClick={reset}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm hover:from-purple-500 hover:to-blue-500 transition-all">
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
