import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { WorkRouteAccess } from '@/components/WorkRouteAccess';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'BrewLite',
  description: 'BrewLite - Đặt đồ uống trực tuyến, theo dõi đơn hàng và quản lý cửa hàng.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-amber-50 text-slate-800">
        <Header />
        <WorkRouteAccess>{children}</WorkRouteAccess>
        <Toaster 
          position="top-right" 
          richColors 
          offset="80px" 
          visibleToasts={1} 
          duration={2000} 
        />
      </body>
    </html>
  );
}