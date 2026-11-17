/** One fragment control path. Adapters provide geometry and optical bindings;
 * neither cards nor baked controls own a competing lighting invocation. */
export const ceramicSurfaceWGSL = /* wgsl */ `
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  return lightCeramic(ceramicOptics(),ceramicGeometry(in),frame.viewportLight.zw);
}
`;
