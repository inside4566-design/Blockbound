(() => {
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const TILE=32,W=150,H=65,GRAVITY=1500;
const blocks={
 grass:{name:'หญ้า',color:'#65b84f',icon:'🌿',hard:0.25},
 dirt:{name:'ดิน',color:'#95603c',icon:'🟫',hard:0.35},
 stone:{name:'หิน',color:'#77828c',icon:'🪨',hard:0.8},
 wood:{name:'ไม้',color:'#a96b38',icon:'🪵',hard:0.45},
 leaves:{name:'ใบไม้',color:'#39834c',icon:'🍃',hard:0.25},
 sand:{name:'ทราย',color:'#d9c17b',icon:'🏜️',hard:0.25}
};
const items=['dirt','stone','wood','sand','grass','leaves'];
let world=[],inventory={dirt:12,stone:0,wood:0,sand:0,grass:0,leaves:0},selected=0;
let player={x:8*TILE,y:10*TILE,vx:0,vy:0,w:21,h:44,onGround:false,health:5,dir:1};
let keys={},camera={x:0,y:0},mouse={x:0,y:0,down:false,button:0},day=1,coins=0,last=0,toastTimer;
let viewW=900,viewH=560,scale=1;
function resize(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);viewW=r.width;viewH=r.height;scale=r.width/900;}
window.addEventListener('resize',resize);resize();
function rand(n){return Math.floor(Math.random()*n)}
function generate(){
 world=Array.from({length:H},()=>Array(W).fill(null));
 let ground=27;
 for(let x=0;x<W;x++){
  ground+=Math.random()<.25?(rand(3)-1):0;ground=Math.max(22,Math.min(32,ground));
  for(let y=ground;y<H;y++)world[y][x]=y===ground?'grass':y<ground+5?'dirt':(Math.random()<.08?'stone':'dirt');
  if(Math.random()<.075 && x>4&&x<W-4){let th=3+rand(3);for(let y=ground-1;y>ground-th-1;y--)world[y][x]='wood';for(let yy=ground-th-3;yy<ground-th+1;yy++)for(let xx=x-2;xx<=x+2;xx++)if(yy>=0&&Math.abs(xx-x)+Math.abs(yy-(ground-th+1))<4&& !world[yy][xx])world[yy][xx]='leaves';}
 }
 // shallow caves
 for(let i=0;i<65;i++){let cx=8+rand(W-16),cy=35+rand(25),rx=2+rand(4),ry=1+rand(3);for(let y=Math.max(0,cy-ry);y<Math.min(H,cy+ry);y++)for(let x=Math.max(0,cx-rx);x<Math.min(W,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<1)world[y][x]=null;}
 player.x=8*TILE;player.y=12*TILE;player.vx=player.vy=0;player.health=5;day=1;coins=0;
}
function solid(tx,ty){if(tx<0||tx>=W||ty>=H)return true;if(ty<0)return false;return !!world[ty][tx]}
function collides(x,y){let l=Math.floor((x-player.w/2)/TILE),r=Math.floor((x+player.w/2-1)/TILE),t=Math.floor(y/TILE),b=Math.floor((y+player.h-1)/TILE);for(let yy=t;yy<=b;yy++)for(let xx=l;xx<=r;xx++)if(solid(xx,yy))return true;return false}
function move(dt){
 const speed=220;player.vx=((keys.d||keys.ArrowRight)?1:0)-((keys.a||keys.ArrowLeft)?1:0);player.vx*=speed;if(player.vx)player.dir=Math.sign(player.vx);
 if((keys[' ']||keys.w||keys.ArrowUp)&&player.onGround){player.vy=-560;player.onGround=false}
 player.vy=Math.min(900,player.vy+GRAVITY*dt);
 let nx=player.x+player.vx*dt;if(!collides(nx,player.y))player.x=nx;
 let ny=player.y+player.vy*dt;player.onGround=false;
 if(!collides(player.x,ny))player.y=ny;else{if(player.vy>0)player.onGround=true;player.vy=0}
 if(player.y>H*TILE){player.health=Math.max(1,player.health-1);player.y=10*TILE;player.vy=0;updateHud()}
}
function draw(){
 const dpr=canvas.width/(viewW||1);ctx.clearRect(0,0,viewW,viewH);
 const sky=ctx.createLinearGradient(0,0,0,viewH);sky.addColorStop(0,'#6bb6e8');sky.addColorStop(1,'#c1e5e9');ctx.fillStyle=sky;ctx.fillRect(0,0,viewW,viewH);
 // distant hills
 ctx.fillStyle='#5e9f9b';for(let i=0;i<7;i++){let x=((i*210-camera.x*.18)%(viewW+250))-100;ctx.beginPath();ctx.arc(x,viewH*.65,130,Math.PI,0);ctx.fill()}
 ctx.fillStyle='#ffe58a';ctx.beginPath();ctx.arc(viewW-95,85,33,0,Math.PI*2);ctx.fill();
 camera.x=Math.max(0,Math.min(W*TILE-viewW,player.x-viewW*.45));camera.y=Math.max(0,Math.min(H*TILE-viewH,player.y-viewH*.52));
 const startX=Math.max(0,Math.floor(camera.x/TILE)),endX=Math.min(W,Math.ceil((camera.x+viewW)/TILE)+1);
 const startY=Math.max(0,Math.floor(camera.y/TILE)),endY=Math.min(H,Math.ceil((camera.y+viewH)/TILE)+1);
 for(let y=startY;y<endY;y++)for(let x=startX;x<endX;x++){let b=world[y][x];if(!b)continue;let px=x*TILE-camera.x,py=y*TILE-camera.y;drawBlock(b,px,py)}
 drawPlayer(player.x-camera.x,player.y-camera.y);
 // target outline
 let tx=Math.floor((mouse.x+camera.x)/TILE),ty=Math.floor((mouse.y+camera.y)/TILE);
 if(tx>=0&&tx<W&&ty>=0&&ty<H){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(tx*TILE-camera.x+1,ty*TILE-camera.y+1,TILE-2,TILE-2)}
}
function drawBlock(b,x,y){
 const c=blocks[b];ctx.fillStyle=c.color;ctx.fillRect(x,y,TILE,TILE);
 ctx.fillStyle='#ffffff18';ctx.fillRect(x+2,y+2,TILE-4,4);
 ctx.fillStyle='#00000020';ctx.fillRect(x,y+TILE-4,TILE,4);
 if(b==='grass'){ctx.fillStyle='#4a9b42';ctx.fillRect(x,y,TILE,7);ctx.fillStyle='#7bc95c';ctx.fillRect(x,y+6,TILE,3)}
 if(b==='stone'){ctx.fillStyle='#aab2b8';ctx.fillRect(x+7,y+8,5,3);ctx.fillRect(x+20,y+21,6,3)}
 if(b==='wood'){ctx.fillStyle='#754523';ctx.fillRect(x+8,y,3,TILE);ctx.fillRect(x+22,y,2,TILE)}
 if(b==='leaves'){ctx.fillStyle='#55a85a';ctx.fillRect(x+5,y+5,8,8);ctx.fillRect(x+18,y+15,9,8)}
 ctx.strokeStyle='#00000012';ctx.strokeRect(x,y,TILE,TILE);
}
function drawPlayer(x,y){
 ctx.save();ctx.translate(x,y);
 // shadow
 ctx.fillStyle='#18334455';ctx.beginPath();ctx.ellipse(0,player.h+2,16,4,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#263e58';ctx.fillRect(-10,25,8,18);ctx.fillRect(2,25,8,18);
 ctx.fillStyle='#4d8bd2';ctx.fillRect(-12,12,24,17);
 ctx.fillStyle='#e9b58a';ctx.fillRect(-10,0,20,16);
 ctx.fillStyle='#553d36';ctx.fillRect(-11,-2,22,6);ctx.fillRect(6,6,3,3);
 ctx.fillStyle='#e9b58a';ctx.fillRect(player.dir>0?9:-14,15,5,12);
 ctx.fillStyle='#273b55';ctx.fillRect(-11,41,9,4);ctx.fillRect(2,41,9,4);
 ctx.restore();
}
function updateHud(){document.getElementById('hearts').textContent='♥'.repeat(player.health)+'♡'.repeat(5-player.health);document.getElementById('day').textContent=day;document.getElementById('coins').textContent=coins}
function renderBar(){const bar=document.getElementById('hotbar');bar.innerHTML='';items.forEach((id,i)=>{let el=document.createElement('div');el.className='slot'+(selected===i?' selected':'');el.innerHTML=`<span class="item">${blocks[id].icon}</span><span class="name">${blocks[id].name}</span><span class="count">${inventory[id]||0}</span>`;el.onclick=()=>{selected=i;renderBar()};bar.appendChild(el)})}
function say(t){let e=document.getElementById('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.opacity=0,1500)}
function target(){return {x:Math.floor((mouse.x+camera.x)/TILE),y:Math.floor((mouse.y+camera.y)/TILE)}}
function inReach(x,y){let cx=player.x/TILE,cy=(player.y+player.h/2)/TILE;return Math.hypot(x-cx,y-cy)<5.3}
function mine(){let {x,y}=target();if(!inReach(x,y)){say('ไกลเกินไป!');return}if(!world[y]||!world[y][x])return;let b=world[y][x];world[y][x]=null;inventory[b]=(inventory[b]||0)+1;coins+=b==='stone'?2:1;renderBar();updateHud()}
function place(){let {x,y}=target(),id=items[selected];if(!inReach(x,y)||!world[y]||world[y][x]||!inventory[id]){say('วางไม่ได้');return}
 let px=player.x,py=player.y;if(x*TILE<px+player.w/2&&x*TILE+TILE>px-player.w/2&&y*TILE<py+player.h&&y*TILE+TILE>py){say('ตรงนี้มีตัวละครอยู่');return}
 world[y][x]=id;inventory[id]--;renderBar()}
function updatePointer(e){
 const r=canvas.getBoundingClientRect();
 mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top;
}
canvas.addEventListener('pointermove',e=>updatePointer(e));
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault(); updatePointer(e);
 if(e.pointerType==='touch'){ mine(); }
 else { mouse.button=e.button; if(e.button===0)mine(); if(e.button===2)place(); }
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{let k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if('123456'.includes(e.key)){selected=Number(e.key)-1;renderBar()}});
window.addEventListener('keyup',e=>{let k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false});
document.querySelectorAll('[data-key]').forEach(b=>{let k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=false))});
document.getElementById('mobileMine').onclick=mine;document.getElementById('mobilePlace').onclick=place;
document.getElementById('saveBtn').onclick=()=>{localStorage.setItem('blockbound-save',JSON.stringify({world,inventory,player,day,coins}));say('บันทึกโลกแล้ว ✓')};
document.getElementById('resetBtn').onclick=()=>{if(confirm('เริ่มโลกใหม่? ข้อมูลโลกเดิมจะถูกแทนที่')){generate();inventory={dirt:12,stone:0,wood:0,sand:0,grass:0,leaves:0};renderBar();updateHud();say('สร้างโลกใหม่แล้ว')}};
function load(){try{let s=JSON.parse(localStorage.getItem('blockbound-save'));if(s&&s.world){world=s.world;inventory=s.inventory;player=s.player;day=s.day||1;coins=s.coins||0;return true}}catch(e){}return false}
function loop(t){let dt=Math.min((t-last)/1000||0,.033);last=t;move(dt);draw();requestAnimationFrame(loop)}
if(!load())generate();renderBar();updateHud();requestAnimationFrame(loop);
setInterval(()=>{day++;updateHud()},90000);
})();