export const DEFAULT_KEYS={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',turnLeft:'KeyQ',turnRight:'KeyE',intake:'KeyI',shoot:'KeyF',reset:'KeyR'};
export type Bindings=typeof DEFAULT_KEYS;
export type KeyAction=keyof Bindings;
export const KEY_LABELS:Record<KeyAction,string>={up:'Move +Y',down:'Move −Y',left:'Move −X',right:'Move +X',turnLeft:'Turn left / CCW',turnRight:'Turn right / CW',intake:'Toggle intake',shoot:'Toggle shooting',reset:'Reset robot & balls'};
export const KEY_OPTIONS=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(k=>'Key'+k).concat(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
export const keyLabel=(code:string)=>code.replace('Key','').replace('Arrow','Arrow ');
export function validBindings(value:unknown):value is Bindings{
 if(!value||typeof value!=='object')return false;
 const v=value as Bindings,values=Object.keys(DEFAULT_KEYS).map(k=>v[k as KeyAction]);
 return values.every(k=>KEY_OPTIONS.includes(k))&&new Set(values).size===values.length;
}
export function loadBindings():Bindings{try{const v=JSON.parse(localStorage.getItem('g3-twin-keys-v1')??'null');if(validBindings(v))return v;}catch{/* Use defaults if storage is blocked. */}return {...DEFAULT_KEYS};}
