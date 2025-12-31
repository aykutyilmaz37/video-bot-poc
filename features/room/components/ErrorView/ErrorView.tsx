/**
 * Error View Component
 * 
 * Hata durumunda gösterilen error state
 */

interface ErrorViewProps {
  error: string;
}

export function ErrorView({ error }: ErrorViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">Hata</h1>
        <p className="text-gray-600 whitespace-pre-line">{error}</p>
      </div>
    </div>
  );
}

