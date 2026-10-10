import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import bananaComponents from '../../public/studio/components/banana-components.json';
import provenance from '../../public/twin/robots/6328-2026/provenance.json';
import kitbotConfig from '../../public/twin/2026/robot-config.json';
import roborioSource from '../../public/studio/components/roborio-manta.json';
import config from '../../public/twin/robots/6328-2026/config.json';
import {cloneGeometryObject} from './robotStudioGeometry';
// Exact nodes in the already-distributed, MIT-attributed team export. These are
// team-export representations, not manufacturer dimensional certifications.
export type CatalogueEntry={id:string;node:number;en:string;he:string;category:string;provider?:'kitbot'|'manta'|'neo'|'neo550'|'sparkmax'};
export const studioCatalogue:readonly CatalogueEntry[]=[
 {id:'banana-neo',node:0,en:'NEO · REV-21-1650',he:'NEO · REV-21-1650',category:'Motor',provider:'neo'},
 {id:'banana-neo550',node:0,en:'NEO 550 · REV-21-1651',he:'NEO 550 · REV-21-1651',category:'Motor',provider:'neo550'},
 {id:'banana-sparkmax',node:0,en:'SPARK MAX · simplified team CAD',he:'SPARK MAX · CAD קבוצתי מפושט',category:'Electronics',provider:'sparkmax'},
 {id:'manta-roborio',node:412,en:'roboRIO · simplified team CAD',he:'roboRIO · CAD קבוצתי מפושט',category:'Electronics',provider:'manta'},
 {id:'darwin-drive',node:200,en:'6328 Darwin drivebase',he:'שלדת Darwin של 6328',category:'Chassis'},
 {id:'darwin-kraken-x60',node:384,en:'Kraken X60 · team CAD',he:'Kraken X60 · CAD קבוצתי',category:'Motor'},
 {id:'darwin-kraken-x44',node:46,en:'Kraken X44 · team CAD',he:'Kraken X44 · CAD קבוצתי',category:'Motor'},
 {id:'darwin-bearing',node:15,en:'½ inch hex bearing · team CAD',he:'מיסב משושה ½ אינץ׳ · CAD קבוצתי',category:'Bearing'},
 {id:'darwin-wheel',node:248,en:'SDS MK5 wheel · team CAD',he:'גלגל SDS MK5 · CAD קבוצתי',category:'Wheel'},
 {id:'darwin-jackshaft',node:41,en:'6328 jack shaft · team CAD',he:'ציר ביניים של 6328 · CAD קבוצתי',category:'Shaft'},
 {id:'darwin-screw',node:62,en:'#10-32 × ½ inch button screw · team CAD',he:'בורג #10-32 × חצי אינץ׳ · CAD קבוצתי',category:'Hardware'},
 {id:'darwin-breaker',node:216,en:'120A main breaker · team CAD',he:'מפסק ראשי 120A · CAD קבוצתי',category:'Electronics'},
 {id:'darwin-radio',node:491,en:'VH-109 radio · team CAD',he:'רדיו VH-109 · CAD קבוצתי',category:'Electronics'},
 {"id":"darwin-component-233","node":233,"en":"SDS MK5i","he":"SDS MK5i","category":"Drivetrain"},
 {"id":"darwin-component-250","node":250,"en":"SDS MK5n","he":"SDS MK5n","category":"Drivetrain"},
 {"id":"darwin-component-236","node":236,"en":"SDS MK5 Turret Assembly","he":"SDS MK5 Turret Assembly","category":"Drivetrain"},
 {"id":"darwin-component-238","node":238,"en":"SDS MK5 L Plate","he":"SDS MK5 L Plate","category":"Drivetrain"},
 {"id":"darwin-component-249","node":249,"en":"SDS MK5i Top Assembly","he":"SDS MK5i Top Assembly","category":"Drivetrain"},
 {"id":"darwin-component-257","node":257,"en":"SDS MK5n Top Assembly (A)","he":"SDS MK5n Top Assembly (A)","category":"Drivetrain"},
 {"id":"darwin-component-220","node":220,"en":"Robot Signal Light (RSL) (Werma)","he":"Robot Signal Light (RSL) (Werma)","category":"Electronics"},
 {"id":"darwin-component-322","node":322,"en":"Simplified PDP 2.0","he":"Simplified PDP 2.0","category":"Electronics"},
 {"id":"darwin-component-10","node":10,"en":"16t Aluminum Sprocket (#25, 1/2\" Hex Bore, Double Hub)","he":"16t Aluminum Sprocket (#25, 1/2\" Hex Bore, Double Hub)","category":"Transmission"},
 {"id":"darwin-component-16","node":16,"en":"12t Steel Sprocket (#25, 1/2\" Rounded Hex Bore, Double Hub)","he":"12t Steel Sprocket (#25, 1/2\" Rounded Hex Bore, Double Hub)","category":"Transmission"},
 {"id":"darwin-component-25","node":25,"en":"42t Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","he":"42t Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-30","node":30,"en":"48t Aluminum Spur Gear (20 DP, 3/8\" Hex Bore)","he":"48t Aluminum Spur Gear (20 DP, 3/8\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-44","node":44,"en":"18t Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","he":"18t Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-48","node":48,"en":"12t Steel Spur Gear (20 DP, SplineXS Bore)","he":"12t Steel Spur Gear (20 DP, SplineXS Bore)","category":"Transmission"},
 {"id":"darwin-component-53","node":53,"en":"20t Aluminum Sprocket (#35, MAXSpline Bore, Double Hub)","he":"20t Aluminum Sprocket (#35, MAXSpline Bore, Double Hub)","category":"Transmission"},
 {"id":"darwin-component-56","node":56,"en":"56t Pocketed Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","he":"56t Pocketed Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-69","node":69,"en":"8t Steel Spur Gear (20 DP, 10T Center Distance, SplineXS Bore)","he":"8t Steel Spur Gear (20 DP, 10T Center Distance, SplineXS Bore)","category":"Transmission"},
 {"id":"darwin-component-71","node":71,"en":"48t Pocketed Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","he":"48t Pocketed Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-81","node":81,"en":"9t Steel Sprocket (#35, 1/2\" Hex Bore, Double Hub)","he":"9t Steel Sprocket (#35, 1/2\" Hex Bore, Double Hub)","category":"Transmission"},
 {"id":"darwin-component-111","node":111,"en":"12t Aluminum Pulley (HTD 5mm, 9mm Wide, 8mm SplineXS Bore)","he":"12t Aluminum Pulley (HTD 5mm, 9mm Wide, 8mm SplineXS Bore)","category":"Transmission"},
 {"id":"darwin-component-145","node":145,"en":"24t Aluminum Pulley (HTD 5mm, 15mm Wide, 1/2\" Hex Bore)","he":"24t Aluminum Pulley (HTD 5mm, 15mm Wide, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-330","node":330,"en":"15t Aluminum Pulley (HTD 5mm, 15mm Wide, 1/2\" Hex Bore)","he":"15t Aluminum Pulley (HTD 5mm, 15mm Wide, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-361","node":361,"en":"10t Aluminum Spur Gear (10 DP, 1/2\" Hex Bore)","he":"10t Aluminum Spur Gear (10 DP, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-373","node":373,"en":"36t Aluminum Pulley (HTD 5mm, 15mm Wide, 1/2\" Hex Bore)","he":"36t Aluminum Pulley (HTD 5mm, 15mm Wide, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-404","node":404,"en":"24t Aluminum Sprocket (#25, SplineXL Bore)","he":"24t Aluminum Sprocket (#25, SplineXL Bore)","category":"Transmission"},
 {"id":"darwin-component-405","node":405,"en":"36t Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","he":"36t Aluminum Spur Gear (20 DP, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-408","node":408,"en":"15t Aluminum Pulley (HTD 5mm, 9mm Wide, 1/2\" Hex Bore)","he":"15t Aluminum Pulley (HTD 5mm, 9mm Wide, 1/2\" Hex Bore)","category":"Transmission"},
 {"id":"darwin-component-435","node":435,"en":"1/2\" Hex Hub (1.125\" OD, #8 Clearance, 0.5\" WD, Aluminum)","he":"1/2\" Hex Hub (1.125\" OD, #8 Clearance, 0.5\" WD, Aluminum)","category":"Transmission"},
 {"id":"darwin-component-19","node":19,"en":"3/8\" Rounded Hex (10.25mm) ID Bearing (0.875\" OD, 0.281\" WD, Shielded, Flanged)","he":"3/8\" Rounded Hex (10.25mm) ID Bearing (0.875\" OD, 0.281\" WD, Shielded, Flanged)","category":"Bearing"},
 {"id":"darwin-component-75","node":75,"en":"0.375\" ID Flanged Bronze Bushing (0.625\" OD, 0.313\" WD)","he":"0.375\" ID Flanged Bronze Bushing (0.625\" OD, 0.313\" WD)","category":"Bearing"},
 {"id":"darwin-component-103","node":103,"en":"35mm ID x 47mm OD x 7mm WD (Flanged Bearing) (WCP-1471)","he":"35mm ID x 47mm OD x 7mm WD (Flanged Bearing) (WCP-1471)","category":"Bearing"},
 {"id":"darwin-component-105","node":105,"en":"0.375\" ID Bearing (0.875\" OD, 0.281\" WD, Shielded, Flanged)","he":"0.375\" ID Bearing (0.875\" OD, 0.281\" WD, Shielded, Flanged)","category":"Bearing"},
 {"id":"darwin-component-332","node":332,"en":"25mm ID Bearing (37mm OD, 7mm WD, Shielded)","he":"25mm ID Bearing (37mm OD, 7mm WD, Shielded)","category":"Bearing"},
 {"id":"darwin-component-372","node":372,"en":"0.5\" ID Bearing (1.125\" OD, 0.313\" WD, Shielded, Flanged)","he":"0.5\" ID Bearing (1.125\" OD, 0.313\" WD, Shielded, Flanged)","category":"Bearing"},
 {"id":"darwin-component-503","node":503,"en":"5972K275_Ball Bearing","he":"5972K275_Ball Bearing","category":"Bearing"},
 {"id":"darwin-component-7","node":7,"en":"Hex nut #10-32","he":"Hex nut #10-32","category":"Hardware"},
 {"id":"darwin-component-59","node":59,"en":"Socket button head cap screw #10-32 x 2","he":"Socket button head cap screw #10-32 x 2","category":"Hardware"},
 {"id":"darwin-component-68","node":68,"en":"#10 Washer (7/16\" OD, 0.03\" WD, Stainless Steel)","he":"#10 Washer (7/16\" OD, 0.03\" WD, Stainless Steel)","category":"Hardware"},
 {"id":"darwin-component-86","node":86,"en":"8mm Motor Spacer (1/4\" L, 5/8\" OD)","he":"8mm Motor Spacer (1/4\" L, 5/8\" OD)","category":"Hardware"},
 {"id":"darwin-component-114","node":114,"en":"#10-32 x 3/4\" L BHCS (Steel, Black Oxide)","he":"#10-32 x 3/4\" L BHCS (Steel, Black Oxide)","category":"Hardware"},
 {"id":"darwin-component-234","node":234,"en":"#10-32 x 1-1/4\" L SHCS (Steel, Black Oxide)","he":"#10-32 x 1-1/4\" L SHCS (Steel, Black Oxide)","category":"Hardware"},
 {"id":"darwin-component-237","node":237,"en":"#10-32 x 2-1/2\" L SHCS (Steel, Black Oxide)","he":"#10-32 x 2-1/2\" L SHCS (Steel, Black Oxide)","category":"Hardware"},
 {"id":"darwin-component-240","node":240,"en":"#10 Aluminum Spacer (2\" L, 0.375\" OD)","he":"#10 Aluminum Spacer (2\" L, 0.375\" OD)","category":"Hardware"},
 {"id":"darwin-component-251","node":251,"en":"#10-32 x 0.375\" L BHCS (Steel, Black Oxide)","he":"#10-32 x 0.375\" L BHCS (Steel, Black Oxide)","category":"Hardware"},
 {"id":"darwin-component-328","node":328,"en":"1/2\" Hex Shaft Spacer (1/32\" L, 3/4\" OD, Acetal)","he":"1/2\" Hex Shaft Spacer (1/32\" L, 3/4\" OD, Acetal)","category":"Hardware"},
 {"id":"darwin-component-329","node":329,"en":"1/2\" Hex Shaft Spacer (1/8\" L, 3/4\" OD, Acetal)","he":"1/2\" Hex Shaft Spacer (1/8\" L, 3/4\" OD, Acetal)","category":"Hardware"},
 {"id":"darwin-component-333","node":333,"en":"Socket button head cap screw 1/4-20 x 1.625","he":"Socket button head cap screw 1/4-20 x 1.625","category":"Hardware"},
 {"id":"darwin-component-336","node":336,"en":"95185A191_Zinc-Plated Steel Press-Fit Nut for Sheet Metal","he":"95185A191_Zinc-Plated Steel Press-Fit Nut for Sheet Metal","category":"Hardware"},
 {"id":"darwin-component-342","node":342,"en":"#10-32 x 5/8\" L BHCS (Steel, Black Oxide)","he":"#10-32 x 5/8\" L BHCS (Steel, Black Oxide)","category":"Hardware"},
 {"id":"darwin-component-348","node":348,"en":"Socket head cap screw #10-32 x 1.875","he":"Socket head cap screw #10-32 x 1.875","category":"Hardware"},
 {"id":"darwin-component-377","node":377,"en":"Type A flat washer 1/4 Narrow","he":"Type A flat washer 1/4 Narrow","category":"Hardware"},
 {"id":"darwin-component-414","node":414,"en":"1/16\" Long?1/2\" Hex?Spacer","he":"1/16\" Long?1/2\" Hex?Spacer","category":"Hardware"},
 {"id":"darwin-component-415","node":415,"en":"1/8\" Long?1/2\" Hex?Spacer","he":"1/8\" Long?1/2\" Hex?Spacer","category":"Hardware"},
 {"id":"darwin-component-440","node":440,"en":"1/2\" Long?1/2\" Hex?Spacer","he":"1/2\" Long?1/2\" Hex?Spacer","category":"Hardware"},
 {"id":"darwin-component-475","node":475,"en":"1/2\" Hex Shaft Spacer (1/4\" L, 3/4\" OD, Acetal)","he":"1/2\" Hex Shaft Spacer (1/4\" L, 3/4\" OD, Acetal)","category":"Hardware"},
 {"id":"darwin-component-489","node":489,"en":"Socket button head cap screw 1/4-20 x 1.25","he":"Socket button head cap screw 1/4-20 x 1.25","category":"Hardware"},
 {"id":"darwin-component-518","node":518,"en":"93365A156_Tapered Heat-Set Inserts for Plastic","he":"93365A156_Tapered Heat-Set Inserts for Plastic","category":"Hardware"},
 {"id":"darwin-component-534","node":534,"en":"Socket button head cap screw #10-32 x 0.375","he":"Socket button head cap screw #10-32 x 0.375","category":"Hardware"},
 {"id":"darwin-component-538","node":538,"en":"Type A flat washer #10","he":"Type A flat washer #10","category":"Hardware"},
 {"id":"darwin-component-209","node":209,"en":"6328-26C-0108 Battery Holder","he":"6328-26C-0108 Battery Holder","category":"Structure"},
 {"id":"darwin-component-221","node":221,"en":"6328-26C-0104 Brainpan","he":"6328-26C-0104 Brainpan","category":"Structure"},
 {"id":"darwin-component-218","node":218,"en":"6328-26C-0110 Drivetrain Crosstube","he":"6328-26C-0110 Drivetrain Crosstube","category":"Structure"},
 {"id":"darwin-component-230","node":230,"en":"6328-26C-0112 Mac mini Mounting Plate","he":"6328-26C-0112 Mac mini Mounting Plate","category":"Structure"},
 {"id":"darwin-component-6","node":6,"en":"6328-26C-0800 Hopper","he":"6328-26C-0800 Hopper","category":"Mechanism"},
 {"id":"darwin-component-51","node":51,"en":"6328-26C-2300 Intake","he":"6328-26C-2300 Intake","category":"Mechanism"},
 {"id":"darwin-component-100","node":100,"en":"6328-26C-0410 Superdexer","he":"6328-26C-0410 Superdexer","category":"Mechanism"},
 {"id":"darwin-component-325","node":325,"en":"6328-26C-3100 Full Wide Launcher","he":"6328-26C-3100 Full Wide Launcher","category":"Mechanism"},
 {"id":"darwin-component-498","node":498,"en":"6328-25-Roller","he":"6328-25-Roller","category":"Mechanism"},
{"id":"kitbot-component-73","node":73,"en":"Power Distribution Hub · KitBot CAD","he":"Power Distribution Hub · KitBot CAD","category":"Electronics","provider":"kitbot"},
{"id":"kitbot-component-228","node":228,"en":"Robot battery · KitBot CAD","he":"Robot battery · KitBot CAD","category":"Electronics","provider":"kitbot"},
{"id":"kitbot-component-203","node":203,"en":"CIM motor","he":"CIM motor","category":"Motor","provider":"kitbot"},
{"id":"kitbot-component-271","node":271,"en":"AM14U6 drivetrain · KitBot configuration","he":"AM14U6 drivetrain · KitBot configuration","category":"Chassis","provider":"kitbot"},
{"id":"kitbot-component-541","node":541,"en":"AM14U6 square frame","he":"AM14U6 square frame","category":"Chassis","provider":"kitbot"},
{"id":"kitbot-component-292","node":292,"en":"6 inch HiGrip wheel with hub and pulleys","he":"6 inch HiGrip wheel with hub and pulleys","category":"Wheel","provider":"kitbot"},
{"id":"kitbot-component-22","node":22,"en":"4 inch Stealth wheel · 40A · am-2647","he":"4 inch Stealth wheel · 40A · am-2647","category":"Wheel","provider":"kitbot"},
{"id":"kitbot-component-428","node":428,"en":"ToughBox Mini S drivetrain gearboxes","he":"ToughBox Mini S drivetrain gearboxes","category":"Transmission","provider":"kitbot"},
{"id":"kitbot-component-432","node":432,"en":"ToughBox Mini S · 10.71:1 gears","he":"ToughBox Mini S · 10.71:1 gears","category":"Transmission","provider":"kitbot"},
{"id":"kitbot-component-143","node":143,"en":"8 mm to ½ inch hex adapter · TTB-0044","he":"8 mm to ½ inch hex adapter · TTB-0044","category":"Transmission","provider":"kitbot"},
{"id":"kitbot-component-387","node":387,"en":"AM14U battery mount assembly","he":"AM14U battery mount assembly","category":"Structure","provider":"kitbot"},
{"id":"kitbot-component-205","node":205,"en":"Robot signal light · Allen Bradley","he":"Robot signal light · Allen Bradley","category":"Electronics","provider":"kitbot"},
];
export const catalogueSource={url:provenance.source,version:provenance.revision,credit:'Mechanical Advantage 6328 · MIT · team CAD export'};
export function entrySource(entry:CatalogueEntry){const compact=bananaComponents.find(x=>x.id===entry.provider);if(compact)return {url:compact.source,credit:'6328 Banana Split · team CAD · BSD-3-Clause',license:compact.license};return entry.provider==='manta'?{url:roborioSource.source,credit:'6328 Manta · simplified CAD · BSD-3-Clause',license:roborioSource.license}:entry.provider==='kitbot'?{url:'https://github.com/Mechanical-Advantage/AdvantageScopeAssets',credit:'2026 KitBot · AdvantageScope assets · BSD-3-Clause',license:'/twin/2026/LICENSE.txt'}:{...catalogueSource,license:'/twin/robots/6328-2026/LICENSE'};}
const models=new Map<string,Promise<Map<number,T.Object3D>>>();
export async function loadCatalogue(key:string){
 const entry=studioCatalogue.find(x=>x.id===key);if(!entry)throw Error('Unknown catalogue component');
 const provider=entry.provider??'darwin';
 if(!models.has(provider))models.set(provider,(async()=>{
  const compact=bananaComponents.find(x=>x.id===provider);
  const path=compact?compact.file:provider==='manta'?'/studio/components/roborio-manta.glb':provider==='kitbot'?'/twin/2026/robot-model.glb':'/twin/robots/6328-2026/model.glb';
  const expected=compact?compact.sha256:provider==='manta'?roborioSource.sha256:provider==='kitbot'?'e6761e663e5b062d23b85f60d5a2ec913d7ea125a15a9c16eab23f7c84f2b67b':provenance.files['model.glb'].sha256;
  const response=await fetch(path);if(!response.ok)throw Error('Catalogue model unavailable');const buffer=await response.arrayBuffer();
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');if(digest!==expected)throw Error('Catalogue model checksum mismatch');
  const gltf=await new GLTFLoader().parseAsync(buffer,'');const model=gltf.scene;if(compact)return new Map([[0,model]]);if(provider==='manta')return new Map([[412,model]]);const cfg=provider==='kitbot'?kitbotConfig:config;
  for(const rotation of cfg.rotations)model.rotateOnWorldAxis(new T.Vector3(rotation.axis==='x'?1:0,rotation.axis==='y'?1:0,rotation.axis==='z'?1:0),rotation.degrees*Math.PI/180);model.position.fromArray(cfg.position);model.updateMatrixWorld(true);
  const nodes=new Map<number,T.Object3D>();model.traverse(o=>{const n=gltf.parser.associations.get(o)?.nodes;if(n!==undefined)nodes.set(n,o);});return nodes;
 })().catch(e=>{models.delete(provider);throw e;}));
 const found=(await models.get(provider)!).get(entry.node);if(!found)throw Error('Component missing from pinned source');
 const clone=cloneGeometryObject(found);clone.matrix.copy(found.matrixWorld);clone.matrix.decompose(clone.position,clone.quaternion,clone.scale);const root=new T.Group();root.add(clone);root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root);clone.position.sub(box.getCenter(new T.Vector3()));return root;
}
