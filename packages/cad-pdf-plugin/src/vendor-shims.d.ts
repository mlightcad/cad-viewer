declare module '@mlightcad/three-renderer' {
  export class AcTrMTextRenderer {
    static getInstance(): AcTrMTextRenderer
    asyncRenderMText(data: unknown, style: unknown): Promise<unknown>
    asyncRenderShape(data: unknown, style: unknown): Promise<unknown>
  }
}
