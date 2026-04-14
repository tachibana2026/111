import { createClient } from '@/lib/supabase/server';
import AnnouncementList from '@/components/public/AnnouncementList';
import Hero from '@/components/public/Hero';
import InfoCards from '@/components/public/InfoCards';
import { Megaphone } from 'lucide-react';

export const revalidate = false; // On-demand Revalidation only

async function getAnnouncements() {
  const supabase = createClient();
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('date', { ascending: false })
    .limit(10);
  return data || [];
}

export default async function HomePage() {
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-10 pb-12">
      <Hero />
      <InfoCards />
      
      {/* Announcements Section */}
      <section className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm mx-2">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Megaphone size={18} className="text-brand-600" />
            <h2 className="text-lg font-black text-slate-900">お知らせ</h2>
          </div>
        </div>
        <AnnouncementList initialData={announcements} />
      </section>
    </div>
  );
}
