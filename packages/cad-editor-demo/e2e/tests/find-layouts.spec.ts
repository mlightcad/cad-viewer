import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'find-layouts.dxf'
)
/** find-layouts.dxf + block CARIMBO (plain TEXT, no attributes) inserted at
 * (900, -200) with scale 2; its text "Projeto Escola Modelo" sits at (10, 5). */
const blocksFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'find-blocks.dxf'
)

/** Layouts: Model (B*), Planta (C*), Alçados (D*). */
let viewerModuleUrl: string | undefined

test.beforeEach(async ({ page }) => {
  viewerModuleUrl = undefined
  // The example app serves the workspace sources in dev; import the same
  // module instance in the page to read the live viewer state.
  page.on('request', request => {
    if (
      /cad-simple-viewer\/(src\/index\.ts|dist\/cad-simple-viewer\.js)/.test(
        request.url()
      )
    ) {
      viewerModuleUrl = request.url()
    }
  })
})

interface ViewerState {
  layout: string
  center: [number, number]
  selected: string[]
}

async function viewerState(page: Page): Promise<ViewerState> {
  expect(viewerModuleUrl, 'viewer module url captured').toBeTruthy()
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const manager = mod.AcApDocManager.instance
    const view = manager.curView
    let layout = ''
    for (const l of manager.curDocument.database.objects.layout.newIterator()) {
      if (l.blockTableRecordId === view.activeLayoutBtrId) layout = l.layoutName
    }
    return {
      layout,
      center: [view.center.x, view.center.y] as [number, number],
      selected: [...view.selectionSet.ids] as string[]
    }
  }, viewerModuleUrl!)
}

async function runCommand(page: Page, name: string) {
  const commandLine = page.locator('input[placeholder="Type command"]')
  await commandLine.click()
  await commandLine.fill(name)
  await page.keyboard.press('Enter')
}

async function loadFixture(page: Page, file = fixturePath) {
  await page.goto('/')
  await uploadFixture(page, file)
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30000
  })
  await expect(page.locator('.ml-layout-tabs-button')).toHaveCount(3, {
    timeout: 30000
  })
  await page.waitForTimeout(2500)
}

/** Page x of a WCS point, and the right edge of the docked palette. */
async function screenXAndPaletteRight(
  page: Page,
  point: { x: number; y: number }
) {
  expect(viewerModuleUrl, 'viewer module url captured').toBeTruthy()
  return page.evaluate(
    async ({ url, point }) => {
      const mod = await import(/* @vite-ignore */ url)
      const view = mod.AcApDocManager.instance.curView
      const canvas = view.canvas.getBoundingClientRect()
      const palette = document
        .querySelector('[data-testid="find-palette"]')!
        .closest('.ml-tool-palette-dialog')!
        .getBoundingClientRect()
      return {
        x: canvas.left + view.worldToScreen(point).x,
        paletteRight: palette.right,
        canvasRight: canvas.right
      }
    },
    { url: viewerModuleUrl!, point }
  )
}

async function openFind(page: Page, file = fixturePath) {
  await loadFixture(page, file)
  await runCommand(page, 'find')
  await expect(page.getByTestId('find-palette')).toBeVisible()
}

const input = (page: Page) => page.locator('input[data-testid="find-input"]')
const rows = (page: Page) => page.getByTestId('find-row')
const status = (page: Page) => page.getByTestId('find-status')

/** `Layout | text` for every result row, sorted. */
async function results(page: Page) {
  const list = await rows(page).evaluateAll(els =>
    els.map(
      el =>
        `${el.querySelector('.ml-find-layout')?.textContent?.trim()} | ${el
          .querySelector('.ml-find-text')
          ?.textContent?.trim()}`
    )
  )
  return list.sort()
}

async function search(page: Page, query: string) {
  await input(page).fill(query)
  await page.getByTestId('find-button').click()
}

test.describe('Find palette (full Vue UI)', () => {
  test('FIND command opens the palette on the whole-drawing scope', async ({
    page
  }) => {
    await openFind(page)
    await expect(input(page)).toBeFocused()
    await expect(
      page.getByTestId('find-current-layout-only').locator('input')
    ).not.toBeChecked()
    await expect(status(page)).toContainText('whole drawing')
  })

  test('ribbon Find button (Home > Utilities) opens the palette', async ({
    page
  }) => {
    await loadFixture(page)
    // At the default window size the Utilities group sits in the overflow.
    const overflow = page.locator('button.ml-ribbon-overflow-trigger:visible')
    if ((await overflow.count()) > 0) await overflow.first().click()
    await page.getByText('Find', { exact: true }).first().click()
    await expect(page.getByTestId('find-palette')).toBeVisible()
    await expect(input(page)).toBeFocused()
  })

  test('searches every layout by default and names the layout of each hit', async ({
    page
  }) => {
    await openFind(page)
    await search(page, 'sala')
    await expect(rows(page)).toHaveCount(3)
    expect(await results(page)).toEqual([
      'Alçados | Sala Técnica 01 (vista lateral)',
      'Model | Sala Técnica 01',
      'Planta | Legenda: Sala Técnica 01'
    ])
    await expect(status(page)).toContainText('3 found in 3 layouts')
  })

  test('is accent/case-insensitive and respects match case and hidden layers', async ({
    page
  }) => {
    await openFind(page)
    await search(page, 'alcado')
    expect(await results(page)).toEqual(['Alçados | Alçado Norte - Folha 2'])

    await search(page, 'oculta')
    await expect(rows(page)).toHaveCount(0)
    await expect(status(page)).toContainText('No text found')

    await page.getByTestId('find-match-case').click()
    await search(page, 'tecnica')
    await expect(rows(page)).toHaveCount(0)
    await search(page, 'Técnica')
    await expect(rows(page)).toHaveCount(3)
  })

  test('"Current layout only" restricts the search and can be turned off again', async ({
    page
  }) => {
    await openFind(page)
    await search(page, 'sala')
    await expect(rows(page)).toHaveCount(3)

    const toggle = page.getByTestId('find-current-layout-only')
    await toggle.click()
    await expect(rows(page)).toHaveCount(1)
    expect(await results(page)).toEqual(['Model | Sala Técnica 01'])

    await toggle.click()
    await expect(rows(page)).toHaveCount(3)
  })

  test('selecting a cross-layout hit activates the layout, zooms and selects', async ({
    page
  }) => {
    await openFind(page)
    expect((await viewerState(page)).layout).toBe('Model')
    await search(page, 'sala')

    await rows(page).filter({ hasText: 'Planta' }).click()
    await expect
      .poll(async () => (await viewerState(page)).layout)
      .toBe('Planta')
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['C11'])
    // "Legenda: Sala Técnica 01" sits at (40, 500) in paper space. The view
    // is framed so the text lands beside the palette (not behind it), so the
    // view centre is left of the text.
    const planta = await viewerState(page)
    expect(planta.center[0]).toBeGreaterThan(-400)
    expect(planta.center[0]).toBeLessThan(400)
    expect(planta.center[1]).toBeGreaterThan(495)
    expect(planta.center[1]).toBeLessThan(515)
    const legend = await screenXAndPaletteRight(page, { x: 40, y: 500 })
    expect(legend.x).toBeGreaterThan(legend.paletteRight)
    expect(legend.x).toBeLessThan(legend.canvasRight)
    await expect(
      page.locator('.ml-layout-tabs-button.el-button--primary')
    ).toHaveText('Planta')

    // A layout that was never visited before.
    await rows(page).filter({ hasText: 'Alçados' }).click()
    await expect
      .poll(async () => (await viewerState(page)).layout)
      .toBe('Alçados')
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['D11'])

    await rows(page).filter({ hasText: 'Model' }).click()
    await expect
      .poll(async () => (await viewerState(page)).layout)
      .toBe('Model')
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['B1'])
  })

  test('Enter steps through hits across layouts', async ({ page }) => {
    await openFind(page)
    await input(page).fill('sala')
    await input(page).press('Enter')
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['B1'])
    await input(page).press('Enter')
    await expect
      .poll(async () => (await viewerState(page)).layout)
      .toBe('Planta')
    await input(page).press('Enter')
    await expect
      .poll(async () => (await viewerState(page)).layout)
      .toBe('Alçados')
    await input(page).press('Shift+Enter')
    await expect
      .poll(async () => (await viewerState(page)).layout)
      .toBe('Planta')
  })

  test('Find button searches and jumps to the first hit', async ({ page }) => {
    await openFind(page)
    await search(page, 'sala')
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['B1'])
    await expect(rows(page).first()).toHaveClass(/is-selected/)
  })

  test('Ctrl+F opens the palette instead of the browser page search', async ({
    page
  }) => {
    await loadFixture(page)
    await expect(page.getByTestId('find-palette')).toBeHidden()
    await page
      .locator('.ml-cad-container canvas')
      .first()
      .click({
        position: { x: 900, y: 300 }
      })
    await page.keyboard.press('Control+f')
    await expect(page.getByTestId('find-palette')).toBeVisible()
    await expect(input(page)).toBeFocused()
  })

  test('finds plain text inside a block and frames it beside the palette', async ({
    page
  }) => {
    await openFind(page, blocksFixturePath)
    await search(page, 'escola')
    await expect(rows(page)).toHaveCount(1)
    expect(await results(page)).toEqual(['Model | Projeto Escola Modelo'])
    await expect(rows(page).first()).toContainText('Block text')

    await rows(page).first().click()
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['F14'])
    // Block text at (10, 5), height 4, inserted at (900, -200) scale 2.
    const start = await screenXAndPaletteRight(page, { x: 920, y: -190 })
    expect(start.x).toBeGreaterThan(start.paletteRight)
    expect(start.x).toBeLessThan(start.canvasRight)
  })

  test('a hit in the active layout is framed beside the palette, not behind it', async ({
    page
  }) => {
    await openFind(page)
    await search(page, 'avac')
    await rows(page).first().click()
    await expect
      .poll(async () => (await viewerState(page)).selected)
      .toEqual(['B2'])
    // "Instalação AVAC" starts at (0, 60).
    const start = await screenXAndPaletteRight(page, { x: 0, y: 60 })
    expect(start.x).toBeGreaterThan(start.paletteRight)
  })
})
