import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = join(root, 'dist')
const assetsDirectory = join(outputDirectory, 'assets')
const modules = ['icons', 'randomizer', 'url-state', 'main']

await rm(outputDirectory, { force: true, recursive: true })
await mkdir(assetsDirectory, { recursive: true })

for (const moduleName of modules) {
  const source = await readFile(join(root, 'src', `${moduleName}.ts`), 'utf8')
  const javascript = stripTypeScriptTypes(source, {
    mode: 'transform',
    sourceMap: false,
  }).replaceAll(/from ('|\")(\.\/.+?)\.ts\1/g, 'from $1$2.js$1')

  await writeFile(join(assetsDirectory, `${moduleName}.js`), javascript)
}

await writeFile(
  join(assetsDirectory, 'styles.css'),
  await readFile(join(root, 'src', 'styles.css'), 'utf8'),
)

const html = (await readFile(join(root, 'index.html'), 'utf8'))
  .replace(
    '    <title>Standup team randomizer</title>',
    '    <link rel="stylesheet" href="./assets/styles.css" />\n    <title>Standup team randomizer</title>',
  )
  .replace('/src/main.ts', './assets/main.js')

await writeFile(join(outputDirectory, 'index.html'), html)

console.log('Built static app in dist/')
