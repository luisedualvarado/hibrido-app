import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSnapshot } from './snapshot.js'

test('snapshot validation accepts a minimal valid snapshot', () => {
  const result = validateSnapshot({
    employees: [{ id: 'a', name: 'A', baseLocation: 'WEWORK', restrictionType: 'NONE' }],
  })
  assert.equal(result.valid, true)
})

test('snapshot validation rejects invalid and duplicate employees', () => {
  const result = validateSnapshot({
    employees: [
      { id: 'a', name: 'A', baseLocation: 'INVALID', restrictionType: 'NONE' },
      { id: 'a', name: 'B', baseLocation: 'WEWORK', restrictionType: 'UNKNOWN' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.length >= 3)
})
