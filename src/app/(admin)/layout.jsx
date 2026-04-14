import AdminHeader from '@/components/Layout/AdminHeader';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
