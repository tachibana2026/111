import { createClient } from '@/lib/supabase/server';
import GroupListContainer from '@/components/Groups/GroupListContainer';

export const revalidate = false;

async function getGroupsData() {
  const supabase = createClient();
  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .order('department', { ascending: true })
    .order('grade', { ascending: true })
    .order('class_name', { ascending: true });
    
  const { data: performances } = await supabase
    .from('performances')
    .select('*')
    .order('start_time', { ascending: true });

  return { groups: groups || [], performances: performances || [] };
}

export default async function GroupsPage() {
  const data = await getGroupsData();

  return (
    <div className="space-y-8">
      <header className="px-2">
        <h1 className="text-4xl font-black text-slate-900 mb-2">団体一覧</h1>
        <p className="text-slate-500 font-bold">各団体の出し物、待ち時間、公演情報を確認できます。</p>
      </header>
      
      <GroupListContainer initialGroups={data.groups} initialPerformances={data.performances} />
    </div>
  );
}
