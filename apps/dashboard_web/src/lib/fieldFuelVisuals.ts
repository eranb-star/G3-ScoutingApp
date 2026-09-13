import type {Object3D} from 'three';

/** 2026 CAD includes a merged decorative fuel mesh. Physics owns every visible ball. */
export function removeStaticFuel(model:Object3D,year:number) {
  if(year!==2026)return;
  const decorations:Object3D[]=[];
  model.traverse(node=>{if(/^GE-26900/.test(node.name))decorations.push(node);});
  for(const node of decorations)node.removeFromParent();
  return decorations;
}
