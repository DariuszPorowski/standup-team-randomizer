import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readMembersFromUrl,
  writeMembersToUrl,
  type TeamMember,
} from './url-state.ts'

test('round-trips member details and attendance through the URL', () => {
  const members: TeamMember[] = [
    {
      id: 'local-only-1',
      name: 'Zoe, QA | Lead',
      github: '@octocat',
      isPresent: true,
    },
    {
      id: 'local-only-2',
      name: 'Alice / Bob',
      github: '',
      isPresent: false,
    },
  ]
  const url = writeMembersToUrl(
    new URL('https://example.test/tools/?keep=1#standup'),
    members,
  )
  let nextId = 0
  const restored = readMembersFromUrl(url, () => `restored-${nextId++}`)

  assert.equal(url.searchParams.get('keep'), '1')
  assert.equal(url.searchParams.get('v'), '1')
  assert.equal(url.hash, '#standup')
  assert.deepEqual(
    restored.map(({ id: _, ...member }) => member),
    [
      { name: 'Zoe, QA | Lead', github: 'octocat', isPresent: true },
      { name: 'Alice / Bob', github: '', isPresent: false },
    ],
  )
})

test('imports legacy comma-separated team URLs', () => {
  let nextId = 0
  const members = readMembersFromUrl(
    new URL('https://example.test/?team=Alice%20A,Bob'),
    () => `legacy-${nextId++}`,
  )

  assert.deepEqual(
    members.map(({ id: _, ...member }) => member),
    [
      { name: 'Alice A', github: '', isPresent: true },
      { name: 'Bob', github: '', isPresent: true },
    ],
  )
})

test('removes app state when the team becomes empty', () => {
  const url = writeMembersToUrl(
    new URL('https://example.test/?v=1&member=old&keep=1'),
    [],
  )

  assert.equal(url.searchParams.has('v'), false)
  assert.equal(url.searchParams.has('member'), false)
  assert.equal(url.searchParams.get('keep'), '1')
})
