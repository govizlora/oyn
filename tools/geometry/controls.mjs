/** Offline recipes for the homepage. Dimensions are in CSS/world pixels. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
export const controls = {
  dish: { width:45,height:45,radius:22.5,hollow:2.5,hollowRadius:.82 },
  thumbDial: { width:102,height:102,radius:51,hollow:3,hollowRadius:.36,hollowX:.52 },
  dimple: { width:38,height:38,radius:19,hollow:2.5,hollowRadius:.85 },
  bridge: { width:84,height:37,radius:18.5,hollow:3,hollowRadius:.83,hollowX:.52,doubleHollow:true },
  rockerOn: { width:56,height:108,radius:8,tilt:7 },
  rockerOff: { width:56,height:108,radius:8,tilt:-7 },
  latch: { width:101,height:37,radius:18.5,hollow:3,hollowRadius:.82,hollowX:.57 },
  detent: { width:36,height:36,radius:18,hollow:2,hollowRadius:.95,bevel:.4 },
  saddle: { width:70,height:36,radius:18,hollow:2.5,hollowRadius:.85,hollowX:.5,doubleHollow:true },
  pocketDial: { width:124,height:124,radius:62,hollow:2,hollowRadius:.26,hollowX:.5 },
};
function roundedRect(x,y,bx,by,r) {
 const qx=Math.abs(x)-bx+r,qy=Math.abs(y)-by+r;
 return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;
}
function surface(s,x,y) {
 const bx=s.width/2,by=s.height/2,bevel=s.bevel??.8;
 const edge=Math.max(0,Math.min(1,1+roundedRect(x,y,bx,by,s.radius)/bevel));
 const body=-bevel*(1-Math.sqrt(Math.max(0,1-edge*edge)));
 const cx=(s.hollowX??0)*bx,cy=0,a=(s.hollowRadius??.78)*Math.min(bx,by),h=Math.min(s.hollow??0,a);
 function cut(cx,cy) {
  const d2=(x-cx)**2+(y-cy)**2;
  if(!h||d2>=a*a)return 0;
  const R=(a*a+h*h)/(2*h);
  return R-h-Math.sqrt(Math.max(0,R*R-d2));
 }
 return Math.min(body,cut(cx,cy),s.doubleHollow?cut(-cx,-cy):0)+(s.tilt??0)*y/by;
}
export function bakeControl(s) {
 const n=192,packed=new Uint32Array(n*n*2),floats=new Float32Array(packed.buffer);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
  const px=((x+.5)/n-.5)*s.width,py=((y+.5)/n-.5)*s.height,e=.06;
  const nx=-(surface(s,px+e,py)-surface(s,px-e,py))/(2*e),ny=-(surface(s,px,py+e)-surface(s,px,py-e))/(2*e),len=Math.hypot(nx,ny,1);
  const i=(y*n+x)*2;
  packed[i]=((Math.round(nx/len*32767)&65535)|((Math.round(ny/len*32767)&65535)<<16))>>>0;
  // The outline is analytic and owned by metadata, not duplicated in this field.
  floats[i+1]=0;
 }
 // v3: baked profile with analytic rounded outline. No slice atlas necessary.
 const header=new Float32Array([3,n,s.width,s.height,s.radius,0,0,0]);
 return Buffer.concat([Buffer.from(header.buffer),Buffer.from(packed.buffer)]);
}
export async function bakeControls(check=false) {
 const output=new URL('../../examples/atelier/public/geometries/controls/',import.meta.url);await mkdir(output,{recursive:true});
 for(const [key,s] of Object.entries(controls)){
  const bytes=bakeControl(s),url=new URL(`${key}.bin`,output);
  if(check){if(!bytes.equals(await readFile(url)))throw Error(`Stale control: ${key}`);}else await writeFile(url,bytes);
  console.log(`${check?'Checked':'Baked'} control ${key}: ${bytes.length} bytes`);
 }
}
