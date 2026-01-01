/**
 * Completed View - Client Component
 *
 * Görüşme tamamlandı sayfası client-side logic
 */

"use client";

import { useRouter } from "next/navigation";

/**
 * Completed View Component
 *
 * Görüşme tamamlandı sayfası
 */
export function CompletedView() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <main className="w-full max-w-2xl text-center px-8">
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
            Görüşme Tamamlandı
          </h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Zaman ayırdığınız için teşekkür ederiz. Görüşme sonuçları
            değerlendirildikten sonra size geri dönüş yapılacaktır.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </main>
    </div>
  );
}
