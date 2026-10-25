/**
 * Smoke test: blank drawing + execute_cad_script (draw circle + measure).
 * Run after build: node packages/cad-mcp-server/scripts/smoke.mjs
 */
import { CadMcpSession } from '../dist/session.js'

const session = await CadMcpSession.create({ useGpu: false })
try {
  const opened = await session.openDrawing({ mode: 'write' })
  console.error('open:', opened)

  const result = await session.executeCadScript({
    intent: 'smoke circle',
    code: `
let id
cad.edit.transaction('circle', tx => {
  id = tx.drawCircle({ center: { x: 0, y: 0 }, radius: 100 })
})
cad.view.zoomExtents()
return cad.measure.report([
  cad.measure.check('r', 100, cad.measure.radius(id))
])
`
  })
  console.error('script:', JSON.stringify(result, null, 2))
  if (!result.success) {
    process.exitCode = 1
  }
} finally {
  await session.close()
}
