/**
 * Shared Jest stub for `@mlightcad/data-model` in simple-ui unit tests.
 * Keeps AcCmEventManager / grip sysvars available when real i18n or editor
 * modules load under an incomplete package mock.
 */
export function createDataModelMock(
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    AcDbOsnapMode: {
      EndPoint: 1,
      MidPoint: 2,
      Center: 4,
      Quadrant: 8,
      Intersection: 16,
      Insertion: 32,
      Perpendicular: 64,
      Tangent: 128,
      Near: 256,
      Apparent: 512
    },
    AcCmEventManager: class {
      addEventListener() {}
      removeEventListener() {}
      dispatch() {}
    },
    AcCmColor: {
      fromString: jest.fn(() => null)
    },
    AcDbDatabase: class {},
    AcDbLayerTableRecord: class {},
    AcDbSystemVariables: {
      COLORTHEME: 'COLORTHEME',
      GRIPSIZE: 'GRIPSIZE',
      GRIPCOLOR: 'GRIPCOLOR',
      GRIPHOT: 'GRIPHOT'
    },
    AcDbSysVarManager: {
      instance: () => ({
        events: {
          sysVarChanged: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          }
        },
        getVar: jest.fn(),
        setVar: jest.fn()
      })
    },
    acdbHostApplicationServices: () => ({
      layoutManager: {
        setCurrentLayoutBtrId: jest.fn()
      }
    }),
    AcGePoint2d: class {
      constructor(
        public x: number,
        public y: number
      ) {}
    },
    AcGeBox2d: class {
      constructor(
        public min: { x: number; y: number },
        public max: { x: number; y: number }
      ) {}
    },
    ...extras
  }
}
