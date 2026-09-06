import { acuiResolveToolbarChrome } from '../src/config/resolveToolbarChrome'

describe('acuiResolveToolbarChrome', () => {
  it('applies built-in defaults', () => {
    expect(acuiResolveToolbarChrome()).toEqual({
      edgeOffset: 8,
      sideOffset: 0,
      showLabels: false,
      size: 'auto',
      overflow: 'menu',
      showBorder: true,
      showButtonBorder: false,
      showSeparators: true,
      showChildrenIndicator: true,
      replaceOnNested: false
    })
  })

  it('merges sub-toolbar overrides on top of main toolbar chrome', () => {
    expect(
      acuiResolveToolbarChrome(
        {
          edgeOffset: 12,
          sideOffset: 4,
          showLabels: true,
          size: 'stretch',
          overflow: 'wrap',
          showBorder: true,
          showButtonBorder: true,
          showSeparators: true,
          showChildrenIndicator: true
        },
        {
          showLabels: false,
          showBorder: false,
          showButtonBorder: false,
          showSeparators: false,
          replaceOnNested: true
        }
      )
    ).toEqual({
      edgeOffset: 12,
      sideOffset: 4,
      showLabels: false,
      size: 'stretch',
      overflow: 'wrap',
      showBorder: false,
      showButtonBorder: false,
      showSeparators: false,
      showChildrenIndicator: true,
      replaceOnNested: true
    })
  })
})
