import {entrySource,type CatalogueEntry} from './robotStudioCatalogue';
const aliases:Record<string,string>={
 'kitbot-component-73':'PDH REV power distribution hub חשמל חלוקת מתח',
 'darwin-component-322':'PDP power distribution panel חשמל',
 'darwin-component-233':'swerve module סוורב הנעה',
 'darwin-component-250':'swerve module סוורב הנעה',
 'manta-roborio':'roborio robo rio controller בקר',
 'kitbot-component-228':'battery מצבר סוללה',
};
export function catalogueMatches(entry:CatalogueEntry,query:string,category=''){
 if(category&&entry.category!==category)return false;
 const searchable=`${entry.en} ${entry.he} ${entry.category} ${entrySource(entry).credit} ${aliases[entry.id]??''}`.toLowerCase();
 return query.trim().toLowerCase().split(/\s+/).every(word=>searchable.includes(word));
}
