/**
 * Home Page - Server Component
 * 
 * Landing page - sadece client component'i çağırır
 */

import { HomeView } from '@/features/home/views/HomeView';

/**
 * Home Page - Server Component
 * 
 * Client-side logic: HomeView component'inde
 */
export default function HomePage() {
  return <HomeView />;
}
