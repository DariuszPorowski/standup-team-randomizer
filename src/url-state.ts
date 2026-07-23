export interface TeamMember {
  id: string
  name: string
  github: string
  isPresent: boolean
}

type MemberIdFactory = () => string

const STATE_VERSION = '1'

function createMemberId(): string {
  return crypto.randomUUID()
}

export function normalizeGitHubUsername(username: string): string {
  return username.trim().replace(/^@+/, '')
}

export function readMembersFromUrl(
  url: URL,
  createId: MemberIdFactory = createMemberId,
): TeamMember[] {
  const encodedMembers = url.searchParams.getAll('member')

  if (encodedMembers.length > 0) {
    return encodedMembers.flatMap((encodedMember) => {
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

  return url.searchParams
    .getAll('team')
    .flatMap((team) => team.split(','))
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: createId(),
      name,
      github: '',
      isPresent: true,
    }))
}

export function writeMembersToUrl(url: URL, members: TeamMember[]): URL {
  const nextUrl = new URL(url)
  nextUrl.searchParams.delete('member')
  nextUrl.searchParams.delete('team')
  nextUrl.searchParams.delete('v')

  if (members.length === 0) {
    return nextUrl
  }

  nextUrl.searchParams.set('v', STATE_VERSION)
  members.forEach((member) => {
    nextUrl.searchParams.append('member', JSON.stringify([
      member.name.trim(),
      normalizeGitHubUsername(member.github),
      member.isPresent ? 1 : 0,
    ]))
  })

  return nextUrl
}
