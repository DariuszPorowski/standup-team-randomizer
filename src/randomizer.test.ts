import assert from 'node:assert/strict'
import test from 'node:test'

import { shuffle } from './randomizer.ts'

test('shuffles a copy with Fisher-Yates', () => {
  const source = ['Ada', 'Grace', 'Linus', 'Margaret']
  const randomValues = [0.25, 0.75, 0]
  let randomIndex = 0

  const result = shuffle(source, () => randomValues[randomIndex++])

  assert.deepEqual(result, ['Margaret', 'Ada', 'Linus', 'Grace'])
  assert.deepEqual(source, ['Ada', 'Grace', 'Linus', 'Margaret'])
})

test('handles empty and single-person teams', () => {
  assert.deepEqual(shuffle([]), [])
  assert.deepEqual(shuffle(['Ada']), ['Ada'])
})
