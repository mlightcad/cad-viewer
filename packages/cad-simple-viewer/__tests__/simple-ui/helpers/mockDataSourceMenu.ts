/** Shared jest mocks for toolbar data-source menu imports. */

export const mockDataSourceMenuModules = () => ({
  acapBuildDataSourceMenu: jest.fn(() => []),
  acapIsSingleLocalOpen: jest.fn(() => false),
  acapRunDataSourceMenuAction: jest.fn()
})
