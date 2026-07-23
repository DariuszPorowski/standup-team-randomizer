import { createIcons } from './icons.ts'
import {
  createGitHubProfileUrl,
  createGitHubWorkUrl,
  parseGitHubContext,
} from './github-links.ts'
import { shuffle } from './randomizer.ts'
import {
  normalizeGitHubUsername,
  readGitHubContextFromUrl,
  readMembersFromUrl,
  writeAppStateToUrl,
  type TeamMember,
} from './url-state.ts'

type Theme = 'auto' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'standup-randomizer-theme'
const GITHUB_USERNAME_PATTERN = '@?[A-Za-z0-9](?:[A-Za-z0-9\\-]{0,37}[A-Za-z0-9])?'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root was not found')
}

app.innerHTML = `
  <header class="app-header">
    <div class="app-header__inner">
      <div class="app-identity" aria-label="Standup team randomizer">
        <span class="app-identity__mark" aria-hidden="true">
          <i data-lucide="github"></i>
        </span>
        <span class="app-identity__name">Standup randomizer</span>
      </div>
      <label class="theme-control" for="theme-select">
        <i data-lucide="sun-moon"></i>
        <span class="sr-only">Color theme</span>
        <select class="form-select theme-control__select" id="theme-select" aria-label="Color theme">
          <option value="auto">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  </header>

  <main class="app-main" id="main-content">
    <header class="page-header">
      <div>
        <h1>Standup order</h1>
        <p class="page-header__date" id="today-date"></p>
      </div>
      <span class="presence-summary" id="presence-summary">
        <i data-lucide="users"></i>
        <span id="presence-summary-text">0 present</span>
      </span>
    </header>

    <section class="workspace-settings" aria-label="Standup links">
      <div class="workspace-setting">
        <label class="workspace-setting__label" for="share-url">Shareable URL</label>
        <div class="url-control url-control--share">
          <span class="url-control__icon" aria-hidden="true">
            <i data-lucide="link-2"></i>
          </span>
          <input class="form-control url-control__input" id="share-url" type="url" readonly />
          <button class="btn url-control__button" id="copy-url-button" type="button">
            <i data-lucide="copy"></i>
            <span>Copy</span>
          </button>
        </div>
      </div>

      <form class="workspace-setting" id="github-context-form">
        <label class="workspace-setting__label" for="github-context-url">GitHub repository or project URL</label>
        <div class="url-control">
          <span class="url-control__icon" aria-hidden="true">
            <i data-lucide="github"></i>
          </span>
          <input
            class="form-control url-control__input"
            id="github-context-url"
            name="github-context-url"
            type="url"
            inputmode="url"
            autocomplete="url"
            placeholder="https://github.com/owner/repository"
            spellcheck="false"
          />
          <button class="btn url-control__button" type="submit">Apply</button>
        </div>
      </form>
    </section>

    <div class="workspace-grid">
      <section class="panel team-panel" aria-labelledby="team-heading">
        <header class="panel-header">
          <div class="panel-title">
            <h2 id="team-heading">Team</h2>
            <span class="Counter" id="team-count">0</span>
          </div>
          <button class="btn btn-sm" id="add-member-button" type="button">
            <i data-lucide="plus"></i>
            <span>Add member</span>
          </button>
        </header>

        <div id="add-member-region"></div>

        <div class="empty-state" id="member-empty" hidden>
          <span class="empty-state__icon" aria-hidden="true">
            <i data-lucide="user-plus"></i>
          </span>
          <strong>No team members</strong>
          <button class="btn btn-primary btn-sm" id="empty-add-member-button" type="button">
            <i data-lucide="plus"></i>
            <span>Add member</span>
          </button>
        </div>

        <ul class="member-list" id="member-list" aria-label="Team members"></ul>
      </section>

      <aside class="panel order-panel" aria-labelledby="order-heading">
        <header class="panel-header order-panel__header">
          <div>
            <div class="panel-title">
              <h2 id="order-heading">Speaking order</h2>
            </div>
            <span class="order-panel__meta" id="order-meta">Not shuffled</span>
          </div>
          <div class="order-panel__tools">
            <button class="btn btn-sm icon-button" id="copy-order-button" type="button" title="Copy speaking order" aria-label="Copy speaking order" hidden>
              <i data-lucide="copy"></i>
            </button>
          </div>
        </header>

        <div class="order-content">
          <div class="empty-state order-empty" id="order-empty">
            <span class="empty-state__icon" aria-hidden="true">
              <i data-lucide="shuffle"></i>
            </span>
            <strong id="order-empty-text">No team members</strong>
          </div>
          <ol class="order-list" id="order-list" aria-label="Speaking order" hidden></ol>
        </div>

        <footer class="order-footer">
          <button class="btn btn-primary width-full" id="shuffle-button" type="button" disabled>
            <i data-lucide="shuffle"></i>
            <span id="shuffle-button-label">Shuffle order</span>
          </button>
        </footer>
      </aside>
    </div>
  </main>

  <footer class="app-footer">
    <div class="app-footer__inner">
      <a
        class="source-link"
        href="https://github.com/DariuszPorowski/standup-team-randomizer"
        target="_blank"
        rel="noopener noreferrer"
        title="View source on GitHub"
        aria-label="View source on GitHub"
      >
        <i data-lucide="github"></i>
      </a>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" hidden>
    <i data-lucide="check"></i>
    <span id="toast-text"></span>
  </div>
  <div class="sr-only" id="live-region" aria-live="polite"></div>
`

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Element #${id} was not found`)
  }

  return element as T
}

const elements = {
  addMemberButton: getElement<HTMLButtonElement>('add-member-button'),
  addMemberRegion: getElement<HTMLDivElement>('add-member-region'),
  copyOrderButton: getElement<HTMLButtonElement>('copy-order-button'),
  copyUrlButton: getElement<HTMLButtonElement>('copy-url-button'),
  emptyAddMemberButton: getElement<HTMLButtonElement>('empty-add-member-button'),
  githubContextForm: getElement<HTMLFormElement>('github-context-form'),
  githubContextUrl: getElement<HTMLInputElement>('github-context-url'),
  liveRegion: getElement<HTMLDivElement>('live-region'),
  memberEmpty: getElement<HTMLDivElement>('member-empty'),
  memberList: getElement<HTMLUListElement>('member-list'),
  orderEmpty: getElement<HTMLDivElement>('order-empty'),
  orderEmptyText: getElement<HTMLElement>('order-empty-text'),
  orderList: getElement<HTMLOListElement>('order-list'),
  orderMeta: getElement<HTMLElement>('order-meta'),
  presenceSummaryText: getElement<HTMLElement>('presence-summary-text'),
  shareUrl: getElement<HTMLInputElement>('share-url'),
  shuffleButton: getElement<HTMLButtonElement>('shuffle-button'),
  shuffleButtonLabel: getElement<HTMLElement>('shuffle-button-label'),
  teamCount: getElement<HTMLElement>('team-count'),
  themeSelect: getElement<HTMLSelectElement>('theme-select'),
  toast: getElement<HTMLDivElement>('toast'),
  toastText: getElement<HTMLElement>('toast-text'),
  todayDate: getElement<HTMLElement>('today-date'),
}

let members = readMembersFromUrl(new URL(window.location.href))
let githubContextUrl = readGitHubContextFromUrl(new URL(window.location.href))
let orderedMemberIds: string[] | null = null
let editingMemberId: string | null = null
let isAddFormOpen = members.length === 0
let currentShareUrl = window.location.href
let toastTimer: number | undefined

function refreshIcons(): void {
  createIcons()
}

function createIcon(name: string): HTMLElement {
  const icon = document.createElement('i')
  icon.dataset.lucide = name
  icon.setAttribute('aria-hidden', 'true')
  return icon
}

function createId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function createAvatar(member: TeamMember, size: 'small' | 'medium' = 'medium'): HTMLElement {
  const avatar = document.createElement('span')
  avatar.className = `member-avatar member-avatar--${size}`
  avatar.textContent = initialsFor(member.name)
  avatar.setAttribute('aria-hidden', 'true')

  if (member.github) {
    const image = document.createElement('img')
    const pixelSize = size === 'small' ? 56 : 80
    image.src = `https://github.com/${encodeURIComponent(member.github)}.png?size=${pixelSize}`
    image.alt = ''
    image.loading = 'lazy'
    image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => image.remove(), { once: true })
    avatar.append(image)
  }

  return avatar
}

function createIconButton(
  iconName: string,
  label: string,
  action: string,
  danger = false,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `btn btn-sm icon-button${danger ? ' icon-button--danger' : ''}`
  button.dataset.action = action
  button.title = label
  button.setAttribute('aria-label', label)
  button.append(createIcon(iconName))
  return button
}

function createPresenceToggle(member: TeamMember): HTMLElement {
  const label = document.createElement('label')
  label.className = 'presence-toggle'
  label.title = member.isPresent ? 'Included in standup' : 'Excluded from standup'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = member.isPresent
  checkbox.dataset.action = 'toggle-presence'
  checkbox.setAttribute(
    'aria-label',
    `${member.isPresent ? 'Exclude' : 'Include'} ${member.name} ${member.isPresent ? 'from' : 'in'} standup`,
  )

  label.append(checkbox)
  return label
}

function createMemberDetails(
  member: TeamMember,
  destination: 'profile' | 'work' = 'profile',
): HTMLElement {
  const details = document.createElement('div')
  details.className = 'member-details'

  const name = document.createElement('strong')
  name.className = 'member-name'
  name.textContent = member.name
  details.append(name)

  if (member.github) {
    const profile = document.createElement('a')
    const githubContext = destination === 'work'
      ? parseGitHubContext(githubContextUrl)
      : null
    profile.className = 'member-github'
    profile.href = destination === 'work'
      ? createGitHubWorkUrl(member.github, githubContextUrl)
      : createGitHubProfileUrl(member.github)
    profile.target = '_blank'
    profile.rel = 'noopener noreferrer'
    profile.textContent = `@${member.github}`
    profile.title = githubContext?.kind === 'repository'
      ? `Open issues assigned to @${member.github}`
      : githubContext?.kind === 'project'
        ? `Open project items assigned to @${member.github}`
        : `Open @${member.github} on GitHub`
    details.append(profile)
  } else {
    const noProfile = document.createElement('span')
    noProfile.className = 'member-github member-github--empty'
    noProfile.textContent = 'No GitHub username'
    details.append(noProfile)
  }

  return details
}

function createMemberRow(member: TeamMember): HTMLLIElement {
  const row = document.createElement('li')
  row.className = `member-row${member.isPresent ? '' : ' member-row--absent'}`
  row.dataset.memberId = member.id

  const identity = document.createElement('div')
  identity.className = 'member-identity'
  identity.append(createAvatar(member), createMemberDetails(member))

  const actions = document.createElement('div')
  actions.className = 'member-actions'

  if (!member.isPresent) {
    const status = document.createElement('span')
    status.className = 'Label member-status'
    status.textContent = 'Away'
    actions.append(status)
  }

  actions.append(
    createIconButton('pencil', `Edit ${member.name}`, 'edit-member'),
    createIconButton('trash-2', `Remove ${member.name}`, 'remove-member', true),
  )

  row.append(createPresenceToggle(member), identity, actions)
  return row
}

function createMemberEditor(member: TeamMember): HTMLLIElement {
  const row = document.createElement('li')
  row.className = 'member-row member-row--editing'
  row.dataset.memberId = member.id

  const spacer = document.createElement('span')
  spacer.className = 'presence-spacer'
  spacer.setAttribute('aria-hidden', 'true')

  const form = document.createElement('form')
  form.className = 'member-edit-form'
  form.dataset.memberId = member.id

  const fields = document.createElement('div')
  fields.className = 'member-form__fields member-edit-form__fields'

  const nameField = createTextField({
    id: `edit-name-${member.id}`,
    label: 'Name',
    name: 'name',
    placeholder: 'Display name',
    required: true,
    value: member.name,
  })
  const githubField = createTextField({
    id: `edit-github-${member.id}`,
    label: 'GitHub username',
    name: 'github',
    placeholder: 'octocat',
    value: member.github,
    github: true,
  })
  fields.append(nameField, githubField)

  const actions = document.createElement('div')
  actions.className = 'member-edit-form__actions'

  const saveButton = document.createElement('button')
  saveButton.type = 'submit'
  saveButton.className = 'btn btn-primary btn-sm'
  saveButton.textContent = 'Save'

  const cancelButton = createIconButton('x', 'Cancel editing', 'cancel-edit')
  actions.append(saveButton, cancelButton)
  form.append(fields, actions)
  row.append(spacer, form)

  return row
}

interface TextFieldOptions {
  id: string
  label: string
  name: string
  placeholder: string
  value?: string
  required?: boolean
  github?: boolean
}

function createTextField(options: TextFieldOptions): HTMLLabelElement {
  const field = document.createElement('label')
  field.className = 'member-form__field'
  field.htmlFor = options.id

  const label = document.createElement('span')
  label.className = 'member-form__label'
  label.textContent = options.label

  const input = document.createElement('input')
  input.className = 'form-control width-full'
  input.id = options.id
  input.name = options.name
  input.placeholder = options.placeholder
  input.value = options.value ?? ''
  input.required = options.required ?? false

  if (options.github) {
    input.autocapitalize = 'none'
    input.autocomplete = 'off'
    input.maxLength = 40
    input.pattern = GITHUB_USERNAME_PATTERN
    input.spellcheck = false
    input.title = 'Use a valid GitHub username, with or without @'
  } else {
    input.autocomplete = 'name'
    input.maxLength = 80
  }

  field.append(label, input)
  return field
}

function renderAddMemberForm(): void {
  elements.addMemberRegion.replaceChildren()
  elements.addMemberButton.hidden = isAddFormOpen

  if (!isAddFormOpen) {
    return
  }

  const form = document.createElement('form')
  form.className = 'member-form'
  form.id = 'add-member-form'

  const heading = document.createElement('h3')
  heading.className = 'member-form__heading'
  heading.textContent = 'New member'

  const fields = document.createElement('div')
  fields.className = 'member-form__fields'
  fields.append(
    createTextField({
      id: 'new-member-name',
      label: 'Name',
      name: 'name',
      placeholder: 'Mona Lisa',
      required: true,
    }),
    createTextField({
      id: 'new-member-github',
      label: 'GitHub username',
      name: 'github',
      placeholder: 'octocat',
      github: true,
    }),
  )

  const actions = document.createElement('div')
  actions.className = 'member-form__actions'

  const submitButton = document.createElement('button')
  submitButton.type = 'submit'
  submitButton.className = 'btn btn-primary'
  submitButton.append(createIcon('plus'), document.createTextNode('Add member'))

  const cancelButton = document.createElement('button')
  cancelButton.type = 'button'
  cancelButton.className = 'btn'
  cancelButton.dataset.action = 'cancel-add'
  cancelButton.textContent = 'Cancel'

  actions.append(submitButton, cancelButton)
  form.append(heading, fields, actions)
  elements.addMemberRegion.append(form)
}

function renderMembers(): void {
  elements.memberList.replaceChildren()

  members.forEach((member) => {
    elements.memberList.append(
      member.id === editingMemberId
        ? createMemberEditor(member)
        : createMemberRow(member),
    )
  })

  elements.memberList.hidden = members.length === 0
  elements.memberEmpty.hidden = members.length > 0 || isAddFormOpen
  elements.teamCount.textContent = String(members.length)
  updatePresenceSummary()
}

function updatePresenceSummary(): void {
  const presentCount = members.filter((member) => member.isPresent).length
  elements.presenceSummaryText.textContent = `${presentCount} present`
}

function renderOrder(): void {
  const presentMembers = members.filter((member) => member.isPresent)
  elements.shuffleButton.disabled = presentMembers.length === 0
  elements.shuffleButtonLabel.textContent = orderedMemberIds ? 'Shuffle again' : 'Shuffle order'
  elements.orderList.replaceChildren()

  if (!orderedMemberIds) {
    elements.orderList.hidden = true
    elements.orderEmpty.hidden = false
    elements.copyOrderButton.hidden = true
    elements.orderMeta.textContent = 'Not shuffled'

    if (members.length === 0) {
      elements.orderEmptyText.textContent = 'No team members'
    } else if (presentMembers.length === 0) {
      elements.orderEmptyText.textContent = 'No members present'
    } else {
      elements.orderEmptyText.textContent = `${presentMembers.length} ready to shuffle`
    }

    return
  }

  const memberById = new Map(members.map((member) => [member.id, member]))
  const orderedMembers = orderedMemberIds
    .map((id) => memberById.get(id))
    .filter((member): member is TeamMember => Boolean(member))

  orderedMembers.forEach((member, index) => {
    const item = document.createElement('li')
    item.className = 'order-item'
    item.style.setProperty('--order-index', String(index))

    const position = document.createElement('span')
    position.className = 'order-item__position'
    position.textContent = String(index + 1)

    const identity = document.createElement('div')
    identity.className = 'order-item__identity'
    identity.append(createAvatar(member, 'small'), createMemberDetails(member, 'work'))
    item.append(position, identity)
    elements.orderList.append(item)
  })

  elements.orderEmpty.hidden = true
  elements.orderList.hidden = false
  elements.copyOrderButton.hidden = false
  elements.orderMeta.textContent = `${orderedMembers.length} ${orderedMembers.length === 1 ? 'person' : 'people'}`
}

function syncUrl(): void {
  const nextUrl = writeAppStateToUrl(
    new URL(window.location.href),
    members,
    githubContextUrl,
  )
  currentShareUrl = nextUrl.href
  elements.shareUrl.value = currentShareUrl

  try {
    window.history.replaceState(null, '', nextUrl.href)
  } catch {
    // The input still contains the canonical URL when history is unavailable.
  }
}

function render(): void {
  renderAddMemberForm()
  renderMembers()
  renderOrder()
  elements.shareUrl.value = currentShareUrl
  refreshIcons()
}

function announce(message: string): void {
  elements.liveRegion.textContent = ''
  window.setTimeout(() => {
    elements.liveRegion.textContent = message
  }, 0)
}

function showToast(message: string): void {
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer)
  }

  elements.toastText.textContent = message
  elements.toast.hidden = false
  elements.toast.classList.remove('toast--visible')
  window.requestAnimationFrame(() => elements.toast.classList.add('toast--visible'))
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('toast--visible')
    window.setTimeout(() => {
      elements.toast.hidden = true
    }, 160)
  }, 2200)
}

function commitMembers(message: string): void {
  orderedMemberIds = null
  syncUrl()
  render()
  announce(message)
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('Copy command failed')
  }
}

function readMemberForm(form: HTMLFormElement): Pick<TeamMember, 'name' | 'github'> {
  const formData = new FormData(form)
  return {
    name: String(formData.get('name') ?? '').trim(),
    github: normalizeGitHubUsername(String(formData.get('github') ?? '')),
  }
}

function openAddMemberForm(): void {
  isAddFormOpen = true
  render()
  window.requestAnimationFrame(() => {
    getElement<HTMLInputElement>('new-member-name').focus()
  })
}

function loadTheme(): Theme {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === 'auto' || storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }
  } catch {
    // Storage can be unavailable in privacy-focused browser contexts.
  }

  return 'auto'
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.colorMode = theme
  elements.themeSelect.value = theme

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The selected theme still applies for the current page.
  }
}

elements.addMemberButton.addEventListener('click', openAddMemberForm)
elements.emptyAddMemberButton.addEventListener('click', openAddMemberForm)

elements.addMemberRegion.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  if (target.closest<HTMLButtonElement>('[data-action="cancel-add"]')) {
    isAddFormOpen = false
    render()
  }
})

elements.addMemberRegion.addEventListener('submit', (event) => {
  event.preventDefault()

  const form = event.target
  if (!(form instanceof HTMLFormElement) || !form.reportValidity()) {
    return
  }

  const member = readMemberForm(form)
  members.push({
    id: createId(),
    name: member.name,
    github: member.github,
    isPresent: true,
  })
  isAddFormOpen = false
  commitMembers(`${member.name} added`)
})

elements.memberList.addEventListener('change', (event) => {
  const checkbox = event.target
  if (!(checkbox instanceof HTMLInputElement) || checkbox.dataset.action !== 'toggle-presence') {
    return
  }

  const row = checkbox.closest<HTMLElement>('[data-member-id]')
  if (!row) {
    return
  }

  const member = members.find((candidate) => candidate.id === row.dataset.memberId)
  if (!member) {
    return
  }

  member.isPresent = checkbox.checked
  orderedMemberIds = null
  syncUrl()
  updatePresenceSummary()
  renderOrder()

  row.classList.toggle('member-row--absent', !member.isPresent)
  row.querySelector('.member-identity')?.classList.toggle('member-identity--absent', !member.isPresent)
  const toggle = checkbox.closest<HTMLElement>('.presence-toggle')
  if (toggle) {
    toggle.title = member.isPresent ? 'Included in standup' : 'Excluded from standup'
  }
  checkbox.setAttribute(
    'aria-label',
    `${member.isPresent ? 'Exclude' : 'Include'} ${member.name} ${member.isPresent ? 'from' : 'in'} standup`,
  )

  const actions = row.querySelector<HTMLElement>('.member-actions')
  const existingStatus = actions?.querySelector('.member-status')
  if (member.isPresent) {
    existingStatus?.remove()
  } else if (actions && !existingStatus) {
    const status = document.createElement('span')
    status.className = 'Label member-status'
    status.textContent = 'Away'
    actions.prepend(status)
  }

  announce(`${member.name} marked ${member.isPresent ? 'present' : 'away'}`)
})

elements.memberList.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const button = target.closest<HTMLButtonElement>('button[data-action]')
  const row = target.closest<HTMLElement>('[data-member-id]')
  const memberId = row?.dataset.memberId
  if (!button || !memberId) {
    return
  }

  const member = members.find((candidate) => candidate.id === memberId)
  if (!member) {
    return
  }

  if (button.dataset.action === 'edit-member') {
    editingMemberId = member.id
    render()
    window.requestAnimationFrame(() => {
      getElement<HTMLInputElement>(`edit-name-${member.id}`).focus()
    })
  }

  if (button.dataset.action === 'cancel-edit') {
    editingMemberId = null
    render()
  }

  if (button.dataset.action === 'remove-member') {
    members = members.filter((candidate) => candidate.id !== member.id)
    editingMemberId = null
    isAddFormOpen = members.length === 0
    commitMembers(`${member.name} removed`)
  }
})

elements.memberList.addEventListener('submit', (event) => {
  event.preventDefault()

  const form = event.target
  if (!(form instanceof HTMLFormElement) || !form.reportValidity()) {
    return
  }

  const member = members.find((candidate) => candidate.id === form.dataset.memberId)
  if (!member) {
    return
  }

  const update = readMemberForm(form)
  member.name = update.name
  member.github = update.github
  editingMemberId = null
  commitMembers(`${member.name} updated`)
})

elements.shuffleButton.addEventListener('click', () => {
  const presentMembers = members.filter((member) => member.isPresent)
  orderedMemberIds = shuffle(presentMembers).map((member) => member.id)
  renderOrder()
  refreshIcons()
  announce('New speaking order generated')
})

elements.copyUrlButton.addEventListener('click', async () => {
  try {
    await copyText(currentShareUrl)
    showToast('Team URL copied')
  } catch {
    elements.shareUrl.focus()
    elements.shareUrl.select()
    showToast('Select the URL and copy it')
  }
})

elements.shareUrl.addEventListener('focus', () => elements.shareUrl.select())

elements.githubContextUrl.addEventListener('input', () => {
  elements.githubContextUrl.setCustomValidity('')
})

elements.githubContextForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const value = elements.githubContextUrl.value.trim()
  const githubContext = value ? parseGitHubContext(value) : null
  if (value && !githubContext) {
    elements.githubContextUrl.setCustomValidity(
      'Enter a GitHub repository or project URL, such as https://github.com/owner/repository.',
    )
    elements.githubContextUrl.reportValidity()
    return
  }

  githubContextUrl = githubContext?.url ?? ''
  elements.githubContextUrl.value = githubContextUrl
  syncUrl()
  renderOrder()
  refreshIcons()
  announce(githubContext ? `GitHub ${githubContext.kind} applied` : 'GitHub context removed')
  showToast(githubContext ? `GitHub ${githubContext.kind} applied` : 'GitHub context removed')
})

elements.copyOrderButton.addEventListener('click', async () => {
  if (!orderedMemberIds) {
    return
  }

  const memberById = new Map(members.map((member) => [member.id, member]))
  const lines = orderedMemberIds.flatMap((id, index) => {
    const member = memberById.get(id)
    if (!member) {
      return []
    }

    return [`${index + 1}. ${member.name}${member.github ? ` (@${member.github})` : ''}`]
  })

  try {
    await copyText(lines.join('\n'))
    showToast('Speaking order copied')
  } catch {
    showToast('Could not copy the order')
  }
})

elements.themeSelect.addEventListener('change', () => {
  const theme = elements.themeSelect.value
  if (theme === 'auto' || theme === 'light' || theme === 'dark') {
    applyTheme(theme)
  }
})

window.addEventListener('popstate', () => {
  members = readMembersFromUrl(new URL(window.location.href))
  githubContextUrl = readGitHubContextFromUrl(new URL(window.location.href))
  elements.githubContextUrl.value = githubContextUrl
  orderedMemberIds = null
  editingMemberId = null
  isAddFormOpen = members.length === 0
  syncUrl()
  render()
})

elements.todayDate.textContent = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full',
}).format(new Date())

elements.githubContextUrl.value = githubContextUrl
applyTheme(loadTheme())
syncUrl()
render()
