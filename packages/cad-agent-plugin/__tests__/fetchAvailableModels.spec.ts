import {
  fetchAvailableModels,
  ModelListingError,
  modelListingUrl,
  parseModelListing
} from '../src/agent/fetchAvailableModels'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

describe('modelListingUrl', () => {
  it('lists OpenAI protocols under the base URL', () => {
    expect(modelListingUrl('https://api.deepseek.com/v1/', 'openai-chat')).toBe(
      'https://api.deepseek.com/v1/models'
    )
    // Host-only URLs get /v1, matching how chat requests are sent.
    expect(modelListingUrl('https://relay.example', 'openai-responses')).toBe(
      'https://relay.example/v1/models'
    )
  })

  it('lists Anthropic under the root /v1/models', () => {
    const expected = 'https://api.anthropic.com/v1/models?limit=1000'
    expect(
      modelListingUrl('https://api.anthropic.com/v1', 'anthropic-messages')
    ).toBe(expected)
    expect(
      modelListingUrl('https://api.anthropic.com', 'anthropic-messages')
    ).toBe(expected)
  })
})

describe('parseModelListing', () => {
  it('reads the standard data array, skipping bad and duplicate ids', () => {
    expect(
      parseModelListing({
        data: [
          { id: 'a', display_name: 'Model A' },
          { id: 'b' },
          { id: '' },
          { name: 'no id' },
          { id: 'a' }
        ]
      })
    ).toEqual([{ id: 'a', name: 'Model A' }, { id: 'b' }])
  })

  it('reads a models map keyed by id', () => {
    expect(
      parseModelListing({ models: { 'x-1': { name: 'X' }, meta: 3 } })
    ).toEqual([{ id: 'x-1', name: 'X' }])
  })

  it('rejects unknown shapes', () => {
    expect(() => parseModelListing({ items: [] })).toThrow(ModelListingError)
  })
})

describe('fetchAvailableModels', () => {
  it('sends a bearer token for OpenAI protocols', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ data: [{ id: 'm' }] }))
    const models = await fetchAvailableModels(
      {
        protocol: 'openai-chat',
        baseUrl: 'https://x.example/v1',
        apiKey: ' sk '
      },
      fetchMock as unknown as typeof fetch
    )
    expect(models).toEqual([{ id: 'm' }])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://x.example/v1/models',
      expect.objectContaining({ headers: { Authorization: 'Bearer sk' } })
    )
  })

  it('sends Anthropic headers for Anthropic Messages', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ data: [] }))
    await fetchAvailableModels(
      {
        protocol: 'anthropic-messages',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'ak'
      },
      fetchMock as unknown as typeof fetch
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/models?limit=1000',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'ak',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        })
      })
    )
  })

  it('reports HTTP and network failures with codes', async () => {
    const target = {
      protocol: 'openai-chat' as const,
      baseUrl: 'https://x.example/v1',
      apiKey: 'k'
    }
    await expect(
      fetchAvailableModels(target, (async () =>
        jsonResponse({}, 401)) as unknown as typeof fetch)
    ).rejects.toMatchObject({ code: 'http', status: 401 })
    await expect(
      fetchAvailableModels(target, (async () => {
        throw new TypeError('Failed to fetch')
      }) as unknown as typeof fetch)
    ).rejects.toMatchObject({
      code: 'network',
      url: 'https://x.example/v1/models'
    })
  })
})
