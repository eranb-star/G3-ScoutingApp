import { supabase } from "../supabase";

export async function getUnreadUpdateCounts(memberId:string){
  const [{data:member},{data:announcements},{data:announcementReads},{data:messages},{data:channelReads}]=await Promise.all([
    supabase.from("team_members").select("role,subteam,subteams").eq("id",memberId).maybeSingle(),
    supabase.from("announcements").select("id,audience,audience_subteam").eq("archived",false),
    supabase.from("announcement_reads").select("announcement_id").eq("member_id",memberId),
    supabase.from("channel_messages").select("id,channel_id,author_id,created_at").eq("archived",false).neq("author_id",memberId).order("created_at",{ascending:false}).limit(500),
    supabase.from("channel_read_state").select("channel_id,last_read_at").eq("member_id",memberId),
  ]);
  const role=String(member?.role??"member").toLowerCase();
  const subteams=Array.from(new Set([...(member?.subteams??[]),member?.subteam??""])).map(value=>String(value).trim().toLowerCase()).filter(Boolean);
  const visibleAnnouncements=(announcements??[]).filter(item=>{
    const audience=String(item.audience??"all").toLowerCase();
    if(audience==="all")return true;
    if(audience==="admins")return role==="admin";
    if(audience==="mentors")return role==="mentor"||role==="admin";
    if(audience==="members")return role==="member"||role==="student"||role==="team_leader";
    if(audience==="subteam")return subteams.includes(String(item.audience_subteam??"").trim().toLowerCase());
    return false;
  });
  const readAnnouncements=new Set((announcementReads??[]).map(row=>row.announcement_id));
  const readByChannel=new Map((channelReads??[]).map(row=>[row.channel_id,new Date(row.last_read_at).getTime()]));
  const channelCount=(messages??[]).filter(message=>new Date(message.created_at).getTime()>(readByChannel.get(message.channel_id)??0)).length;
  return {announcements:visibleAnnouncements.filter(item=>!readAnnouncements.has(item.id)).length,channels:channelCount};
}
