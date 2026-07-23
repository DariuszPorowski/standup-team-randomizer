import { parseGitHubContext } from './github-links.ts'

export interface TeamMember {
  id: string
  name: string
  github: string
  isPresent: boolean
}

type MemberIdFactory = () => string

const MEMBER_PARAMETER = 'm'
const GITHUB_PARAMETER = 'gh'
const REMOVED_PARAMETERS = ['github', 'member', 'team', 'v']

function createMemberId(): string {
  return crypto.randomUUID()
}

export function normalizeGitHubUsername(username: string): string {
  return username.trim().replace(/^@+/, '')
}

export function readGitHubContextFromUrl(url: URL): string {
  const path = url.searchParams.get(GITHUB_PARAMETER)
  return path
    ? parseGitHubContext(`https://github.com/${path}`)?.url ?? ''
    : ''
}

export function readMembersFromUrl(
  url: URL,
  createId: MemberIdFactory = createMemberId,
): TeamMember[] {
  return url.searchParams.getAll(MEMBER_PARAMETER).flatMap((encodedMember) => {
    try {
      const value: unknown = JSON.parse(encodedMember)

      if (!Array.isArray(value) || typeof value[0] !== 'string') {
        return []
      }

      const name = value[0].trim()
      if (!name) {
        return []
      }

      return [{
        id: createId(),
        name,
        github: typeof value[1] === 'string'
          ? normalizeGitHubUsername(value[1])
          : '',
        isPresent: value[2] !== 0,
      }]
    } catch {
      return []
    }
  })
}

export function writeMembersToUrl(url: URL, members: TeamMember[]): URL {
  const nextUrl = new URL(url)
  nextUrl.searchParams.delete(MEMBER_PARAMETER)
  REMOVED_PARAMETERS.forEach((parameter) => nextUrl.searchParams.delete(parameter))

  members.forEach((member) => {
    const value: Array<string | number> = [member.name.trim()]
    const github = normalizeGitHubUsername(member.github)

    if (github || !member.isPresent) {
      value.push(github)
    }
    if (!member.isPresent) {
      value.push(0)
    }

    nextUrl.searchParams.append(MEMBER_PARAMETER, JSON.stringify(value))
  })

  return nextUrl
}

export function writeAppStateToUrl(
  url: URL,
  members: TeamMember[],
  githubContextUrl: string,
): URL {
  const nextUrl = writeMembersToUrl(url, members)
  const githubContext = parseGitHubContext(githubContextUrl)
  nextUrl.searchParams.delete(GITHUB_PARAMETER)

  if (githubContext) {
    nextUrl.searchParams.set(
      GITHUB_PARAMETER,
      new URL(githubContext.url).pathname.slice(1),
    )
  }

  return nextUrl
}
