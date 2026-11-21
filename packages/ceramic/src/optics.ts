/** Shared by WGSL generation and the CPU visual-bound calculation. */
export const SHADOW = {
  aoFalloff: 0.35,
  minSigma: 0.35,
} as const;

/** Optical coverage of signed relief, not an animation or an opacity prop.
 * Subpixel relief has zero slope at the receiving plane. Beyond one CSS pixel
 * this is the existing concave floor coverage; both sides share its zero limit. */
export const reliefWGSL = /* wgsl */ `
fn ceramicRelief(height:f32)->f32 {
  let depth=abs(height);
  return 1-exp(-depth*smoothstep(0.0f,1.0f,depth));
}
`;
