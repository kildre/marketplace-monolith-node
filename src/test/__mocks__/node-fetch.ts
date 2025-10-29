// Mock for node-fetch to avoid ESM import issues in Jest
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({}),
  text: async () => '',
  headers: new Map(),
});

export default mockFetch;
