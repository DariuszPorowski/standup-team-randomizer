type IconNode = readonly [tag: string, attributes: Readonly<Record<string, string>>]

const icons: Readonly<Record<string, readonly IconNode[]>> = {
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  copy: [
    ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }],
    ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }],
  ],
  github: [
    ['path', { d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.28 0 6.72-2 6.72-5.5A4.5 4.5 0 0 0 19.5 5.8 4.2 4.2 0 0 0 19.38 2S18.42 1.7 16 3.48a13.38 13.38 0 0 0-7 0C6.58 1.7 5.62 2 5.62 2a4.2 4.2 0 0 0-.12 3.8A4.5 4.5 0 0 0 4.28 9c0 3.5 3.44 5.5 6.72 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' }],
    ['path', { d: 'M9 18c-4.51 2-5-2-7-2' }],
  ],
  'link-2': [
    ['path', { d: 'M9 17H7A5 5 0 0 1 7 7h2' }],
    ['path', { d: 'M15 7h2a5 5 0 1 1 0 10h-2' }],
    ['line', { x1: '8', x2: '16', y1: '12', y2: '12' }],
  ],
  pencil: [
    ['path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }],
    ['path', { d: 'm15 5 4 4' }],
  ],
  plus: [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'M12 5v14' }],
  ],
  shuffle: [
    ['path', { d: 'm18 14 4 4-4 4' }],
    ['path', { d: 'm18 2 4 4-4 4' }],
    ['path', { d: 'M2 18h1.191a6 6 0 0 0 4.28-1.79L17 6.02h5' }],
    ['path', { d: 'M2 6h1.191a6 6 0 0 1 4.28 1.79L17 17.98h5' }],
  ],
  'sun-moon': [
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.42 1.42' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }],
    ['circle', { cx: '12', cy: '12', r: '4' }],
  ],
  'trash-2': [
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
    ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }],
    ['line', { x1: '10', x2: '10', y1: '11', y2: '17' }],
    ['line', { x1: '14', x2: '14', y1: '11', y2: '17' }],
  ],
  'user-plus': [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
    ['line', { x1: '19', x2: '19', y1: '8', y2: '14' }],
    ['line', { x1: '22', x2: '16', y1: '11', y2: '11' }],
  ],
  users: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }],
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
}

function createIcon(name: string, nodes: readonly IconNode[]): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg'
  const icon = document.createElementNS(namespace, 'svg')
  const attributes = {
    xmlns: namespace,
    width: '16',
    height: '16',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    class: `lucide lucide-${name}`,
  }

  Object.entries(attributes).forEach(([attribute, value]) => {
    icon.setAttribute(attribute, value)
  })

  nodes.forEach(([tag, nodeAttributes]) => {
    const node = document.createElementNS(namespace, tag)
    Object.entries(nodeAttributes).forEach(([attribute, value]) => {
      node.setAttribute(attribute, value)
    })
    icon.append(node)
  })

  return icon
}

export function createIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('i[data-lucide]').forEach((placeholder) => {
    const name = placeholder.dataset.lucide
    const nodes = name ? icons[name] : undefined

    if (!name || !nodes) {
      return
    }

    const icon = createIcon(name, nodes)
    if (placeholder.className) {
      icon.classList.add(...placeholder.classList)
    }
    placeholder.replaceWith(icon)
  })
}
