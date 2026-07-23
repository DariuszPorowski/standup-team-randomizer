import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readGitHubContextFromUrl,
  readMembersFromUrl,
  writeAppStateToUrl,
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
  assert.deepEqual(url.searchParams.getAll('m'), [
    '["Zoe, QA | Lead","octocat"]',
    '["Alice / Bob","",0]',
  ])
  assert.equal(url.searchParams.has('v'), false)
  assert.equal(url.hash, '#standup')
  assert.deepEqual(
    restored.map(({ id: _, ...member }) => member),
    [
      { name: 'Zoe, QA | Lead', github: 'octocat', isPresent: true },
      { name: 'Alice / Bob', github: '', isPresent: false },
    ],
  )
})

test('does not read removed long-form URL parameters', () => {
  const url = new URL(
    'https://example.test/?v=1&member=["Mona","octocat",1]&team=Alice&github=https://github.com/octocat/hello-world',
  )

  assert.deepEqual(readMembersFromUrl(url), [])
  assert.equal(readGitHubContextFromUrl(url), '')
})

test('removes app state when the team becomes empty', () => {
  const url = writeAppStateToUrl(
    new URL('https://example.test/?m=old&gh=octocat/hello-world&keep=1'),
    [],
    '',
  )

  assert.equal(url.searchParams.has('v'), false)
  assert.equal(url.searchParams.has('m'), false)
  assert.equal(url.searchParams.has('gh'), false)
  assert.equal(url.searchParams.has('member'), false)
  assert.equal(url.searchParams.get('keep'), '1')
})

test('round-trips a normalized GitHub context with the team', () => {
  const url = writeAppStateToUrl(
    new URL('https://example.test/?keep=1'),
    [{ id: '1', name: 'Mona', github: 'monalisa', isPresent: true }],
    'https://github.com/orgs/github/projects/4247/views/1/?query=old',
  )

  assert.equal(url.searchParams.has('v'), false)
  assert.equal(
    url.searchParams.get('gh'),
    'orgs/github/projects/4247/views/1',
  )
  assert.equal(
    readGitHubContextFromUrl(url),
    'https://github.com/orgs/github/projects/4247/views/1',
  )
  assert.equal(url.searchParams.get('keep'), '1')
})

test('keeps GitHub context state without team members', () => {
  const url = writeAppStateToUrl(
    new URL('https://example.test/?member=old&github=old&team=old&v=1'),
    [],
    'https://github.com/octocat/hello-world',
  )

  assert.equal(url.searchParams.has('v'), false)
  assert.equal(url.searchParams.has('member'), false)
  assert.equal(url.searchParams.has('github'), false)
  assert.equal(url.searchParams.has('team'), false)
  assert.equal(url.searchParams.has('m'), false)
  assert.equal(url.searchParams.get('gh'), 'octocat/hello-world')
  assert.equal(
    readGitHubContextFromUrl(url),
    'https://github.com/octocat/hello-world',
  )
})
