/** Explicit-geometry entry point for card/baked adapters. Signed analytic relief
 * uses the same lightCeramic response in its combined face/shadow fragment. */
export const ceramicSurfaceWGSL = /* wgsl */ `
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  return lightCeramic(ceramicOptics(),ceramicGeometry(in),frame.viewportLight.zw);
}
`;
