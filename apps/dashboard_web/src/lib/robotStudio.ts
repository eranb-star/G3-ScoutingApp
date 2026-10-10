/** Studio domain data. Metres, radians, +Z up. No inventory mutations here. */
export type Vec3 = [number, number, number];
export type ShapeKind = 'panel'|'trapezoid'|'tube'|'boxTube'|'rod'|'hex'|'spacer'|'angle';
export type Shape = {kind:ShapeKind;width:number;height:number;length:number;wall:number;inner:number;top:number;offset:number};
export type StudioAsset = {id:string;name:string;kind:'upload'|'onshape'|'catalogue';catalogueId?:string;path?:string;format?:'glb'|'stl';scale:number;sourceUrl:string;sourceId?:string;snapshotId?:string;attribution:string;coverage:string;nodePath?:number[]};
export type StudioPart = {id:string;lineageId?:string;name:string;group?:boolean;nonvisual?:boolean;connectors?:{id:string;name:string;position:Vec3;rotation:Vec3}[];parent:string|null;position:Vec3;rotation:Vec3;shape:Shape|null;assetId:string|null;color:string;opacity:number;hidden:boolean;locked:boolean;reference:boolean;material:string;density:number|null;massKg:number|null;massSource:string;inventoryId:string|null;attachment:'unresolved'|'concept';note:string};
export type StudioJoint = {id:string;name:string;partId:string;reviewRequired?:boolean;driverId?:string;ratio?:number;kind:'rotate'|'slide';axis:'x'|'y'|'z';min:number;max:number;origin:Vec3};
export type StudioView = {id:string;optionId?:string;name:string;camera:Vec3;target:Vec3;hidden:string[];annotation?:string;section?:{axis:'x'|'y'|'z';offset:number};explode?:number;motion?:number;jointPositions?:Record<string,number>};
export type StudioOption = {id:string;name:string;parts:StudioPart[];joints:StudioJoint[]};
export type StudioScene = {schema:1;name:string;projectId:string|null;activeOption:string;options:StudioOption[];assets:StudioAsset[];views:StudioView[];acknowledgements?:{key:string;signature:string;reason:string;at:string}[]};
export const shapeDefaults:Shape = {kind:'panel',width:.4,height:.25,length:.006,wall:.002,inner:.01,top:.2,offset:0};
export function newScene(name='Untitled concept',projectId:string|null=null):StudioScene {const id=crypto.randomUUID();return {schema:1,name,projectId,activeOption:id,options:[{id,name:'A',parts:[],joints:[]}],assets:[],views:[]};}
export function activeOption(scene:StudioScene){const option=scene.options.find(o=>o.id===scene.activeOption);if(!option)throw Error('Missing active alternative');return option;}
export function newPart(kind:ShapeKind):StudioPart {const shape={...shapeDefaults,kind};if(['tube','rod','hex','spacer'].includes(kind))Object.assign(shape,{width:.0254,height:.0254,length:.3,inner:.0194});if(kind==='boxTube'||kind==='angle')Object.assign(shape,{width:.0254,height:.0254,length:.5});return {id:crypto.randomUUID(),name:kind,parent:null,position:[0,0,0],rotation:[0,0,0],shape,assetId:null,color:'#b5c8d6',opacity:1,hidden:false,locked:false,reference:false,material:'Unspecified',density:null,massKg:null,massSource:'',inventoryId:null,attachment:'unresolved',note:''};}
export function hopperTemplate():StudioPart[]{
 const base=newPart('panel');Object.assign(base,{name:'Hopper bottom',material:'Acrylic (density unspecified)',color:'#85d9e1',opacity:.45,position:[0,0,.3]});base.shape={...shapeDefaults,width:.5,height:.4,length:.006};
 const side=(name:string,position:Vec3,rotation:Vec3,width:number)=>{const p=newPart('panel');Object.assign(p,{name,parent:base.id,position,rotation,material:base.material,color:base.color,opacity:base.opacity});p.shape={...shapeDefaults,width,height:.25,length:.006};return p;};
 return [base,side('Hopper left',[0,.2,.125],[Math.PI/2,0,0],.5),side('Hopper right',[0,-.2,.125],[Math.PI/2,0,0],.5),side('Hopper rear',[-.25,0,.125],[Math.PI/2,0,Math.PI/2],.4)];
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
export function validateShape(s:Shape){
 if(!['panel','trapezoid','tube','boxTube','rod','hex','spacer','angle'].includes(s.kind))throw Error('Unsupported shape');
 if(![s.width,s.height,s.length,s.wall,s.inner,s.top,s.offset].every(finite))throw Error('Dimensions must be finite');
 if([s.width,s.height,s.length].some(n=>n<=0||n>20))throw Error('Dimensions must be greater than zero and at most 20 m');
 if(s.kind==='trapezoid'&&(s.top<=0||s.top>20||Math.abs(s.offset)>20))throw Error('Invalid trapezoid');
 if(['tube','spacer'].includes(s.kind)&&(s.inner<=0||s.inner>=s.width))throw Error('Inside diameter must be smaller than outside diameter');
 if(['boxTube','angle'].includes(s.kind)&&(s.wall<=0||2*s.wall>=Math.min(s.width,s.height)))throw Error('Wall must leave a positive interior');
}
export function shapeVolume(s:Shape){validateShape(s);switch(s.kind){
 case 'panel':return s.width*s.height*s.length;
 case 'trapezoid':return (s.width+s.top)/2*s.height*s.length;
 case 'tube':case 'spacer':return Math.PI*(s.width*s.width-s.inner*s.inner)/4*s.length;
 case 'rod':return Math.PI*s.width*s.width/4*s.length;
 case 'hex':return Math.sqrt(3)/2*s.width*s.width*s.length;
 case 'boxTube':return (s.width*s.height-(s.width-2*s.wall)*(s.height-2*s.wall))*s.length;
 case 'angle':return (s.wall*(s.width+s.height)-s.wall*s.wall)*s.length;
}}
export function partMass(part:StudioPart):number|null {if(part.massKg!==null)return part.massKg;if(part.shape&&part.density!==null)return shapeVolume(part.shape)*part.density;return null;}
export function applyPartEdit(previous:StudioPart,next:StudioPart):StudioPart{
 const changed=JSON.stringify(previous.shape)!==JSON.stringify(next.shape)||previous.assetId!==next.assetId;
 return {...next,attachment:'unresolved',massKg:changed&&previous.massKg===next.massKg?null:next.massKg};
}
export function massSummary(parts:StudioPart[]){let kg=0,known=0;const counted=parts.filter(p=>!p.reference&&!p.group);for(const part of counted){const mass=partMass(part);if(mass!==null){kg+=mass;known++;}}return {kg,known,total:counted.length,complete:known===counted.length&&known>0};}
export function descendants(parts:StudioPart[],id:string):string[]{const result:string[]=[];const visit=(parent:string)=>{for(const p of parts.filter(x=>x.parent===parent)){if(result.includes(p.id))throw Error('Cyclic hierarchy');result.push(p.id);visit(p.id);}};visit(id);return result;}
export function validateScene(scene:StudioScene){
 if(scene.schema!==1||!scene.name.trim()||scene.name.length>120)throw Error('A design name of 1–120 characters is required');
 if(scene.acknowledgements&&(scene.acknowledgements.length>1000||scene.acknowledgements.some(a=>!a.key||!a.signature||!a.reason.trim()||a.reason.length>1000)))throw Error('Invalid finding acknowledgement');
 if(scene.options.length<1||scene.options.length>12||scene.assets.length>100||scene.views.length>40)throw Error('Scene limit exceeded');
 activeOption(scene);const assets=new Set(scene.assets.map(a=>a.id));if(assets.size!==scene.assets.length)throw Error('Duplicate assets');
 for(const a of scene.assets){if(a.nodePath&&(!Array.isArray(a.nodePath)||a.nodePath.length>40||a.nodePath.some(n=>!Number.isInteger(n)||n<0)))throw Error('Invalid source component path');if(!['onshape','upload','catalogue'].includes(a.kind))throw Error('Unknown asset type');if(!finite(a.scale)||a.scale<=0||a.scale>1000)throw Error('Invalid asset units');if(a.kind==='catalogue'&&(!a.catalogueId||a.scale!==1))throw Error('Catalogue components have fixed scale');if(a.kind==='onshape'&&(!a.sourceId||!a.snapshotId||a.scale!==1))throw Error('Onshape source and exact revision are required');if(a.kind==='upload'&&(!a.path||!['glb','stl'].includes(a.format||'')))throw Error('Missing uploaded model');}
 for(const o of scene.options){if(o.parts.length>500)throw Error('Maximum 500 placed components per alternative');const ids=new Set(o.parts.map(p=>p.id));if(ids.size!==o.parts.length)throw Error('Duplicate instance identity');
  for(const p of o.parts){if(p.connectors&&(p.connectors.length>30||new Set(p.connectors.map(c=>c.id)).size!==p.connectors.length||p.connectors.some(c=>!c.name.trim()||c.position.length!==3||c.rotation.length!==3||![...c.position,...c.rotation].every(finite))))throw Error('Invalid user-defined mounting frame');if(!p.name.trim()||p.name.length>160)throw Error('A part name is required');if(p.position.length!==3||p.rotation.length!==3||![...p.position,...p.rotation].every(finite)||p.position.some(n=>Math.abs(n)>100))throw Error('Invalid placement');if(p.parent&&(!ids.has(p.parent)||p.parent===p.id||descendants(o.parts,p.id).includes(p.parent)))throw Error('Invalid parent');if(p.shape)validateShape(p.shape);if(!p.group&&!p.nonvisual&&Boolean(p.shape)===Boolean(p.assetId))throw Error('Choose one geometry source');if(p.assetId&&!assets.has(p.assetId))throw Error('Missing asset reference');if(p.massKg!==null&&(!finite(p.massKg)||p.massKg<=0||!p.massSource.trim()))throw Error('Positive mass and its source are required');if(p.density!==null&&(!finite(p.density)||p.density<=0||!p.massSource.trim()))throw Error('Density and its source are required');if(!finite(p.opacity)||p.opacity<.1||p.opacity>1||!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('Invalid appearance');}
  const joints=new Set<string>();for(const j of o.joints){if(!ids.has(j.partId)||joints.has(j.partId)||!['rotate','slide'].includes(j.kind)||!['x','y','z'].includes(j.axis)||!finite(j.min)||!finite(j.max)||j.min>0||j.max<0||j.min>=j.max||j.origin.length!==3||!j.origin.every(finite))throw Error('Invalid joint: one per part, limits must include home (0)');if(j.driverId){const driver=o.joints.find(x=>x.id===j.driverId);if(!driver||driver.kind!==j.kind||!finite(j.ratio))throw Error('Coupled joints need a same-kind driver and finite ratio');}joints.add(j.partId);}jointValues(o.joints,.5);
 }
 if(new Set(scene.options.map(o=>o.id)).size!==scene.options.length)throw Error('Duplicate alternative identity');
 for(const view of scene.views)if((view.section&&(!['x','y','z'].includes(view.section.axis)||!finite(view.section.offset)))||(view.explode!==undefined&&(!finite(view.explode)||view.explode<0||view.explode>1))||(view.motion!==undefined&&(!finite(view.motion)||view.motion<0||view.motion>1))||(view.jointPositions&&Object.values(view.jointPositions).some(n=>!finite(n)||n<0||n>1))||!view.name.trim()||view.name.length>160||view.camera.length!==3||view.target.length!==3||![...view.camera,...view.target].every(finite)||!Array.isArray(view.hidden))throw Error('Invalid presentation view');
}
export function jointValues(joints:StudioJoint[],motion:number,positions:Record<string,number>={}){const values=new Map<string,number>();const evaluate=(id:string,seen=new Set<string>()):number=>{if(values.has(id))return values.get(id)!;if(seen.has(id))throw Error('Cyclic coupled motion');seen.add(id);const j=joints.find(j=>j.id===id);if(!j||j.reviewRequired)return 0;const fraction=positions[id]??motion;const value=j.driverId?evaluate(j.driverId,seen)*(j.ratio??1):Number.isFinite(fraction)?j.min+(j.max-j.min)*fraction:0;const bounded=Math.max(j.min,Math.min(j.max,value))||0;values.set(id,bounded);return bounded;};joints.forEach(j=>evaluate(j.id));return values;}
export function copyOption(option:StudioOption,name:string):StudioOption {const ids=new Map(option.parts.map(p=>[p.id,crypto.randomUUID()])),jointIds=new Map(option.joints.map(j=>[j.id,crypto.randomUUID()]));return {id:crypto.randomUUID(),name,parts:option.parts.map(p=>({...structuredClone(p),lineageId:p.lineageId??p.id,id:ids.get(p.id)!,parent:p.parent?ids.get(p.parent)!:null})),joints:option.joints.map(j=>({...structuredClone(j),id:jointIds.get(j.id)!,driverId:j.driverId?jointIds.get(j.driverId):undefined,partId:ids.get(j.partId)!}))};}
/** Copy a complete subtree without changing local transforms or sharing editable parameters. */
export function duplicateSubtree(option:StudioOption,rootId:string):string {
 const root=option.parts.find(p=>p.id===rootId);if(!root)throw Error('Select a component to duplicate');
 const selected=new Set([rootId,...descendants(option.parts,rootId)]),ids=new Map([...selected].map(id=>[id,crypto.randomUUID()]));
 const copies=option.parts.filter(p=>selected.has(p.id)).map(p=>({...structuredClone(p),lineageId:ids.get(p.id)!,id:ids.get(p.id)!,parent:p.parent&&ids.has(p.parent)?ids.get(p.parent)!:p.parent,attachment:'unresolved' as const}));
 const copy=copies.find(p=>p.id===ids.get(rootId))!;copy.name+=' (copy)';copy.position[0]+=.05;
 option.parts.push(...copies);option.joints.push(...option.joints.filter(j=>selected.has(j.partId)).map(j=>({...structuredClone(j),id:crypto.randomUUID(),partId:ids.get(j.partId)!,driverId:undefined,ratio:undefined,reviewRequired:true})));
 return copy.id;
}
/** Revision and scope travel with every result; the UI never keeps stale checks green. */
export type StudioFinding={partIds:string[];code:'attachment'|'mass'|'reference'|'geometry';detail:string};
export function basicFindings(scene:StudioScene):StudioFinding[]{return activeOption(scene).parts.flatMap(p=>{const items:StudioFinding[]=[];if(p.reference||p.group)return items;if(p.attachment==='unresolved'&&!p.locked)items.push({partIds:[p.id],code:'attachment',detail:'Connection or mounting needs review'});if(partMass(p)===null)items.push({partIds:[p.id],code:'mass',detail:'Mass is unknown'});if(p.assetId&&scene.assets.find(a=>a.id===p.assetId)?.coverage!=='complete')items.push({partIds:[p.id],code:'geometry',detail:'Imported coverage needs review'});return items;});}




export function compareOptions(a:StudioOption,b:StudioOption){const key=(p:StudioPart)=>p.lineageId??p.id;const definition=(p:StudioPart,o:StudioOption)=>JSON.stringify({...p,id:undefined,lineageId:undefined,parent:p.parent?key(o.parts.find(x=>x.id===p.parent)!):null});const changes:{name:string;kind:'added'|'removed'|'changed'}[]=[];for(const p of a.parts){const other=b.parts.find(x=>key(x)===key(p));if(!other)changes.push({name:p.name,kind:'added'});else if(definition(p,a)!==definition(other,b))changes.push({name:p.name,kind:'changed'});}for(const p of b.parts)if(!a.parts.some(x=>key(x)===key(p)))changes.push({name:p.name,kind:'removed'});return changes;}

export function findingSignature(scene:StudioScene,ids:string[]){const o=activeOption(scene);return JSON.stringify({option:o.id,parts:ids.map(id=>o.parts.find(p=>p.id===id)),assets:scene.assets.filter(a=>ids.some(id=>o.parts.find(p=>p.id===id)?.assetId===a.id))});}
