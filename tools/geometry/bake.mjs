/** Offline only. No imports from this directory may enter the browser bundle.
 * Orthographic 2.5D assets, not a general camera/mesh interchange format.
 */
export const N = 192, EXTENT = 130, S = 96, SHADOW_EXTENT = 320;
const sigmas = [0, 1, 2, 4, 8, 16, 32];
export function distance(node, p) {
  if (node.a) {
    const a = distance(node.a,p), b = distance(node.b,p);
    return node.kind==='union'?Math.min(a,b):node.kind==='subtract'?Math.max(a,-b):Math.max(a,b);
  }
  const q=p.map((v,i)=>v-node.center[i]);
  if(node.kind==='sphere') return Math.hypot(...q)-node.radius;
  const bevel=node.bevel??(node.kind==='cylinder'?0.7:0);
  const v=node.kind==='cylinder'?[Math.hypot(q[0],q[1])-node.radius+bevel,Math.abs(q[2])-node.halfHeight+bevel]:q.map((x,i)=>Math.abs(x)-node.halfSize[i]+bevel);
  return Math.hypot(...v.map(x=>Math.max(x,0)))+Math.min(Math.max(...v),0)-bevel;
}
function blur(input,sigma) {
  if(!sigma)return input;
  sigma*=S/SHADOW_EXTENT;
  const r=Math.ceil(sigma*4), weights=Array.from({length:2*r+1},(_,i)=>Math.exp(-.5*((i-r)/sigma)**2));
  const sum=weights.reduce((a,b)=>a+b);weights.forEach((v,i)=>weights[i]=v/sum);
  const tmp=new Float32Array(S*S),out=new Float32Array(S*S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++)for(let k=-r;k<=r;k++)if(x+k>=0&&x+k<S)tmp[y*S+x]+=input[y*S+x+k]*weights[k+r];
  for(let y=0;y<S;y++)for(let x=0;x<S;x++)for(let k=-r;k<=r;k++)if(y+k>=0&&y+k<S)out[y*S+x]+=tmp[(y+k)*S+x]*weights[k+r];
  return out;
}
export function bake(node) {
  // Determine the occupied height from the final surface, never from tree identity.
  const field=new Float32Array(N*N*4);let height=0;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
    const px=((x+.5)/N-.5)*EXTENT,py=((y+.5)/N-.5)*EXTENT;
    let z=100,hit=false;
    for(let i=0;i<512&&z>=0;i++) { const d=distance(node,[px,py,z]);if(d<.001){hit=true;break;} z-=Math.max(.001,d*.9); }
    const o=(y*N+x)*4;
    if(hit) {
      height=Math.max(height,z);
      const e=.03,p=[px,py,z],normal=[0,1,2].map(k=>distance(node,p.map((v,i)=>v+(i===k?e:0)))-distance(node,p.map((v,i)=>v-(i===k?e:0))));
      const len=Math.hypot(...normal)||1;
      field[o]=normal[0]/len;field[o+1]=normal[1]/len;field[o+2]=z;
    } else field[o+2]=-1;
  }
  if(height<=0)throw Error('Geometry must have a visible surface above the receiving plane.');
  for(let i=0;i<N;i++)for(const index of [i,N*(N-1)+i,i*N,i*N+N-1])if(field[index*4+2]>=0)throw Error('Geometry touches the bake boundary; increase EXTENT.');
  height=Math.ceil(height*100)/100;
  // Project the final distance field offline, refining the closest height.
  // Unlike a binary pixel-edge distance this preserves subpixel silhouettes.
  for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
    const px=((x+.5)/N-.5)*EXTENT,py=((y+.5)/N-.5)*EXTENT;
    let d=Infinity,zBest=0;
    for(let z=0;z<=100;z+=2){const v=distance(node,[px,py,z]);if(v<d){d=v;zBest=z;}}
    let lo=Math.max(0,zBest-2),hi=Math.min(100,zBest+2);
    for(let i=0;i<16;i++){
      const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;
      const da=distance(node,[px,py,a]),db=distance(node,[px,py,b]);
      d=Math.min(d,da,db);if(da<db)hi=b;else lo=a;
    }
    field[(y*N+x)*4+3]=d;
  }
  const shadows=new Uint8Array(S*S*6*sigmas.length);
  for(let slice=0;slice<6;slice++) {
    const coverage=new Float32Array(S*S),z=Math.max(.001,height*(slice+1)/6-.04);
    for(let y=0;y<S;y++)for(let x=0;x<S;x++) {
      // Offline 4x4 supersampling; no boolean work at runtime.
      for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++)if(distance(node,[((x+(sx+.5)/4)/S-.5)*SHADOW_EXTENT,((y+(sy+.5)/4)/S-.5)*SHADOW_EXTENT,z])<=0)coverage[y*S+x]+=1/16;
    }
    sigmas.forEach((sigma,level)=>{const values=blur(coverage,sigma);for(let i=0;i<values.length;i++)shadows[(slice*sigmas.length+level)*S*S+i]=Math.round(values[i]*255);});
  }
  const header=new Float32Array([2,N,EXTENT,height,S,SHADOW_EXTENT,sigmas.length,0]);
  const packed=new Uint32Array(N*N*2),floats=new Float32Array(packed.buffer);
  for(let i=0;i<N*N;i++){
    const x=Math.round(Math.max(-1,Math.min(1,field[i*4]))*32767)&65535;
    const y=Math.round(Math.max(-1,Math.min(1,field[i*4+1]))*32767)&65535;
    packed[i*2]=(x|(y<<16))>>>0;floats[i*2+1]=field[i*4+3];
  }
  return Buffer.concat([Buffer.from(header.buffer),Buffer.from(packed.buffer),Buffer.from(shadows.buffer)]);
}
