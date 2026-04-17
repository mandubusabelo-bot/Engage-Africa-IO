import test from 'node:test'
import assert from 'node:assert/strict'

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'

const ensureResponseShape = (json) => {
  assert.equal(typeof json, 'object')
  assert.equal(typeof json.success, 'boolean')
}

const callApi = async (path, method = 'GET', body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  const contentType = response.headers.get('content-type') || ''
  assert.ok(contentType.includes('application/json'), `${path} did not return JSON`)

  const json = await response.json()
  ensureResponseShape(json)

  return { response, json }
}

test('GET /api/contacts returns contract shape', async () => {
  const { response, json } = await callApi('/api/contacts')
  assert.ok(response.status >= 200 && response.status < 600)
  if (response.ok) {
    assert.ok(Array.isArray(json.data), 'contacts response data must be array when successful')
  }
})

test('GET /api/messages returns contract shape', async () => {
  const { response, json } = await callApi('/api/messages')
  assert.ok(response.status >= 200 && response.status < 600)
  if (response.ok) {
    assert.ok(Array.isArray(json.data), 'messages response data must be array when successful')
  }
})

test('GET /api/flows returns contract shape', async () => {
  const { response, json } = await callApi('/api/flows')
  assert.ok(response.status >= 200 && response.status < 600)
  if (response.ok) {
    assert.ok(Array.isArray(json.data), 'flows response data must be array when successful')
  }
})

test('GET /api/knowledge-base returns contract shape', async () => {
  const { response, json } = await callApi('/api/knowledge-base')
  assert.ok(response.status >= 200 && response.status < 600)
  if (response.ok) {
    assert.ok(Array.isArray(json.data), 'knowledge-base response data must be array when successful')
  }
})
