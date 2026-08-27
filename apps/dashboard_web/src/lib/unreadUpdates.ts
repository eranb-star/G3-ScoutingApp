import { supabase } from "../supabase";

export async function getUnreadUpdateCounts(memberId:string){
  const [{data:announcements},{data:announcementReads},{data:messages},{data:channelReads}]=await Promise.all([
    supabase.from("announcements").select("id").eq("archived",false),
    supabase.from("announcement_reads").select("announcement_id").eq("member_id",memberId),
    supabase.from("channel_messages").select("id,channel_id,author_id,created_at").eq("archived",false).neq("author_id",memberId).order("created_at",{ascending:false}).limit(500),
    supabase.from("channel_read_state").select("channel_id,last_read_at").eq("member_id",memberId),
  ]);
  const readAnnouncements=new Set((announcementReads??[]).map(row=>row.announcement_id));
  const readByChannel=new Map((channelReads??[]).map(row=>[row.channel_id,new Date(row.last_read_at).getTime()]));
  const channelCount=(messages??[]).filter(message=>new Date(message.created_at).getTime()>(readByChannel.get(message.channel_id)??0)).length;
  return {announcements:(announcements??[]).filter(item=>!readAnnouncements.has(item.id)).length,channels:channelCount};
}
