import type {ResearchFilters} from './robotResearch';
import {supabase} from '../supabase';

export type CollectedSourceResult = {
  count:number; page:number; indexedAt:string; sourceCount:number;generation?:string;
  rows:{id:number;url:string;body:string;title:string;seasons:number[];source_class:string;scope:string|null}[];
};
// The host supplies the data service. Local review uses the isolated corpus;
// production must supply an authenticated service before enabling this view.
export type CollectedSourceSearch = (filters:ResearchFilters, page:number, signal:AbortSignal)=>Promise<CollectedSourceResult>;

export const searchProductionSources:CollectedSourceSearch=async(filters,page,signal)=>{
 const {data,error}=await supabase.rpc('search_frc_corpus',{p_query:filters.query,p_topics:filters.topics,p_seasons:filters.seasons,p_mode:filters.mode,p_page:page,p_source:filters.source??'',p_teams:filters.teams??[]}).abortSignal(signal);
 if(error)throw error;
 return data as CollectedSourceResult;
};
