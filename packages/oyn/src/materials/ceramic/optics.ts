/** Shared by WGSL generation and the CPU visual-bound calculation. */
export const SHADOW = {
  aoFalloff: 0.35,
  minSigma: 0.35,
} as const;

/** Strength of relief lighting and shadows, never pigment opacity. */
export const reliefWGSL = /* wgsl */ `
fn ceramicRelief(height:f32)->f32 {
  let depth=abs(height);
  return 1-exp(-depth*smoothstep(0.0f,1.0f,depth));
}
`;

// The finish supplies the same reach multiplier to the GPU and padding calculation.
export const groundFrostWGSL = /* wgsl */ `
fn groundFrost(p:vec2f,distance:f32,height:f32,strength:f32,spread:f32)->f32 {
  if(height<=0 || strength<=0 || spread<=0 || frame.geometry.w==0){return 0;}
  let halfSize=frame.rect.zw*0.5;
  let lamp=frame.backlight.xy-frame.rect.xy-halfSize;
  // Fade in with the source footprint captured by the actual silhouette. The
  // slope vanishes at the boundary, including when entering a rounded corner.
  let depth=-geometryShadowDistance(lamp);
  let entryWidth=max(1.0f,min(min(halfSize.x,halfSize.y)*0.65f,8+height));
  let coupling=smoothstep(0.0f,entryWidth,depth);
  // An extended emitter under a diffusing slab, not a point hotspot. Inverse
  // square falloff times the receiver cosine gives (1 + r²/L²)^(-3/2).
  let scale=max(1.0f,height+length(halfSize));
  let offset=(p-lamp)/scale;
  let transport=pow(1+dot(offset,offset),-1.5f);
  let tail=1-clamp(max(distance,0)/(height*spread),0,1);
  return clamp(2*strength*(height/(height+8))*tail*tail*coupling*transport,0,1);
}
`;
