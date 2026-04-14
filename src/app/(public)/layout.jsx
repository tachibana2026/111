import PublicHeader from '@/components/Layout/PublicHeader';
import MobileNav from '@/components/Layout/MobileNav';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16">
      <PublicHeader />
      <main className="flex-grow container mx-auto px-4 py-6 md:py-10">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
