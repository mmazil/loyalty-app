"use client";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4">
          Welcome to My App
        </h1>
        <p className="text-gray-600 text-center">
          This is a simple Next.js application with Tailwind CSS.
        </p>
      </div>
    </div>
  );
}
