// Included only by the local visual harness, never by the production application.
if(new URLSearchParams(location.search).has('controller')){
 const pad={id:'Synthetic Xbox — browser test fixture',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
 Object.defineProperty(navigator,'getGamepads',{value:()=>pad.connected?[pad]:[]});
 const panel=document.createElement('details');panel.open=true;panel.style.cssText='position:fixed;right:8px;top:8px;z-index:99999;background:white;color:black;border:2px solid #167b80;border-radius:8px;padding:8px;max-width:240px;font:12px sans-serif';
 panel.innerHTML='<summary>Synthetic controller (test only)</summary><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px"></div>';
 const add=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.style.cssText='padding:6px;font:12px sans-serif';b.onclick=action;panel.lastChild.append(b);};
 add('Stick forward',()=>{pad.axes=[0,-1,0,0];});add('Stick right',()=>{pad.axes=[1,0,0,0];});add('Turn right',()=>{pad.axes=[0,0,1,0];});
 add('Release all',()=>{pad.axes=[0,0,0,0];pad.buttons.forEach(b=>{b.pressed=false;b.value=0;});});
 for(const [label,index] of [['Intake A',0],['Shoot RT',7],['Stop B',1]])add(label,()=>{pad.buttons[index].pressed=!pad.buttons[index].pressed;pad.buttons[index].value=pad.buttons[index].pressed?1:0;});
 add('Disconnect',()=>{pad.connected=false;const e=new Event('gamepaddisconnected');Object.defineProperty(e,'gamepad',{value:pad});window.dispatchEvent(e);});
 add('Reconnect',()=>{pad.connected=true;});
 document.body.append(panel);
}
