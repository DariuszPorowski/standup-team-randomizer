export type GitHubContextKind = 'project' | 'repository'

export interface GitHubContext {
  kind: GitHubContextKind
  url: string
}

const GITHUB_HOST = 'github.com'
const PROJECT_PATH = /^\/(?:orgs|users)\/[^/]+\/projects\/\d+(?:\/views\/\d+)?\/?$/
const REPOSITORY_PATH = /^\/[^/]+\/[^/]+\/?$/

export function parseGitHubContext(value: string): GitHubContext | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== GITHUB_HOST) {
      return null
    }

    let kind: GitHubContextKind
    if (PROJECT_PATH.test(url.pathname)) {
      kind = 'project'
    } else if (REPOSITORY_PATH.test(url.pathname)) {
      kind = 'repository'
      url.pathname = url.pathname.replace(/\.git\/?$/, '')
    } else {
      return null
    }

    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    url.pathname = url.pathname.replace(/\/$/, '')

    return { kind, url: url.href }
  } catch {
    return null
  }
}

export function createGitHubProfileUrl(username: string): string {
  return `https://github.com/${encodeURIComponent(username)}`
}

export function createGitHubWorkUrl(username: string, contextUrl: string): string {
  const context = parseGitHubContext(contextUrl)
  if (!context) {
    return createGitHubProfileUrl(username)
  }

  const url = new URL(context.url)
  if (context.kind === 'repository') {
    url.pathname += '/issues'
    url.searchParams.set('q', `is:issue is:open assignee:${username}`)
  } else {
    url.searchParams.set('filterQuery', `is:open assignee:${username}`)
  }

  return url.href
}
