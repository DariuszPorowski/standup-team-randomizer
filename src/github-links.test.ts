import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createGitHubProfileUrl,
  createGitHubWorkUrl,
  parseGitHubContext,
} from './github-links.ts'

test('normalizes GitHub repository and project URLs', () => {
  assert.deepEqual(
    parseGitHubContext('https://github.com/octocat/hello-world.git/?tab=readme#about'),
    { kind: 'repository', url: 'https://github.com/octocat/hello-world' },
  )
  assert.deepEqual(
    parseGitHubContext('https://github.com/orgs/github/projects/4247/views/1/'),
    { kind: 'project', url: 'https://github.com/orgs/github/projects/4247/views/1' },
  )
})

test('rejects non-GitHub and unsupported GitHub URLs', () => {
  assert.equal(parseGitHubContext('https://example.com/octocat/hello-world'), null)
  assert.equal(parseGitHubContext('http://github.com/octocat/hello-world'), null)
  assert.equal(parseGitHubContext('https://github.com/octocat/hello-world/issues'), null)
})

test('builds an open assigned issue filter for a repository', () => {
  const url = new URL(createGitHubWorkUrl(
    'octocat',
    'https://github.com/octocat/hello-world',
  ))

  assert.equal(url.pathname, '/octocat/hello-world/issues')
  assert.equal(url.searchParams.get('q'), 'is:issue is:open assignee:octocat')
})

test('builds an open assigned item filter for a project', () => {
  const url = new URL(createGitHubWorkUrl(
    'octocat',
    'https://github.com/orgs/github/projects/4247/views/1',
  ))

  assert.equal(url.pathname, '/orgs/github/projects/4247/views/1')
  assert.equal(url.searchParams.get('filterQuery'), 'is:open assignee:octocat')
})

test('uses the profile when no repository or project is configured', () => {
  assert.equal(createGitHubProfileUrl('octocat'), 'https://github.com/octocat')
  assert.equal(createGitHubWorkUrl('octocat', ''), 'https://github.com/octocat')
})
