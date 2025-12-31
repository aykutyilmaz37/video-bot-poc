/**
 * Completed View - Client Component
 * 
 * Görüşme tamamlandı sayfası client-side logic
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getAllVideos, type UploadVideoResult } from '../../room/utils/fileUpload';

/**
 * Completed View Component
 * 
 * Görüşme tamamlandı sayfası
 */
export function CompletedView() {
  const router = useRouter();
  const [videoDataList, setVideoDataList] = useState<UploadVideoResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Tüm kayıtları al (fileUpload utils'den)
    getAllVideos()
      .then((dataList) => {
        if (dataList && dataList.length > 0) {
          setVideoDataList(dataList);
          console.log('✅ Video data loaded:', dataList.length, 'recordings');
          dataList.forEach((data, index) => {
            console.log(`  ${index + 1}. ${data.fileName}`);
          });
        } else {
          console.log('⚠️ No recording data found');
          setVideoDataList([]);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('❌ Error loading videos:', error);
        setIsLoading(false);
        setVideoDataList([]);
      });
  }, []);

  const handleDownloadRecording = (videoData: UploadVideoResult) => {
    if (!videoData) {
      console.error('❌ Video data not available');
      alert('Kayıt bulunamadı. Lütfen tekrar görüşme yapın.');
      return;
    }

    try {
      // Download URL'i kullan (zaten blob URL)
      const link = document.createElement('a');
      link.href = videoData.downloadUrl;
      link.download = videoData.fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        link.remove();
        globalThis.URL.revokeObjectURL(videoData.downloadUrl);
      }, 100);
      
      console.log('✅ Recording download started:', videoData.fileName);
    } catch (error) {
      console.error('❌ Error downloading recording:', error);
      alert('Kayıt indirilemedi. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
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
            Zaman ayırdığınız için teşekkür ederiz. 
            Görüşme sonuçları değerlendirildikten sonra size geri dönüş yapılacaktır.
          </p>
          {!isLoading && videoDataList.length > 0 && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                {videoDataList.length === 1 
                  ? 'Görüşme kaydınız hazır. Aşağıdaki butona tıklayarak kaydı indirebilirsiniz.'
                  : `${videoDataList.length} görüşme kaydı hazır. İstediğiniz kaydı indirebilirsiniz.`}
              </p>
              <div className="space-y-2">
                {videoDataList.map((videoData, index) => (
                  <button
                    key={videoData.fileId}
                    onClick={() => handleDownloadRecording(videoData)}
                    className="block w-full rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    📥 {videoDataList.length > 1 ? `Kayıt ${index + 1}: ` : ''}{videoData.fileName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isLoading && videoDataList.length === 0 && (
            <div className="mb-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Kayıt bulunamadı. Lütfen tekrar görüşme yapın.
              </p>
            </div>
          )}
          {isLoading && (
            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Kayıt yükleniyor...</p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </main>
    </div>
  );
}

