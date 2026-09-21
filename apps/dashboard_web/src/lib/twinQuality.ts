export type QualityTier='low'|'medium'|'high';
export type QualityMode='auto'|QualityTier;
export const QUALITY_STORAGE='g3-twin-quality-v1';
export const QUALITY={low:{pixelRatio:.75,shadowSize:0},medium:{pixelRatio:1,shadowSize:1024},high:{pixelRatio:1.5,shadowSize:2048}};
export function loadQuality():QualityMode{try{const v=localStorage.getItem(QUALITY_STORAGE);if(v==='low'||v==='medium'||v==='high')return v;}catch{}return 'auto';}
/** Sustained visible frame windows only. Loading/resize/background resets are supplied by the renderer. */
export class AdaptiveQuality{
 tier:QualityTier='medium';private slow=0;private fast=0;private cooldown=0;
 reset(tier:QualityTier=this.tier){this.tier=tier;this.slow=0;this.fast=0;this.cooldown=3;}
 sample(fps:number):QualityTier{
  if(!Number.isFinite(fps)||fps<=0){this.reset();return this.tier;}
  if(this.cooldown>0){this.cooldown--;return this.tier;}
  this.slow=fps<40?this.slow+1:0;this.fast=fps>57?this.fast+1:0;
  if(this.slow>=3&&this.tier!=='low')this.reset(this.tier==='high'?'medium':'low');
  else if(this.fast>=10&&this.tier!=='high')this.reset(this.tier==='low'?'medium':'high');
  return this.tier;
 }
}
