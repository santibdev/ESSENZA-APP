#!/usr/bin/env node

/**
 * Script para crear un nuevo release automáticamente
 * Incrementa la versión, hace build, y crea el release en GitHub
 * 
 * Uso:
 *   npm run release        → Incrementa patch (1.0.1 → 1.0.2)
 *   npm run release:minor  → Incrementa minor (1.0.1 → 1.1.0)
 *   npm run release:major  → Incrementa major (1.0.1 → 2.0.0)
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packagePath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

// Determinar tipo de incremento (patch, minor, major)
const releaseType = process.argv[2] || 'patch'

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

const currentVersion = packageJson.version
const newVersion = incrementVersion(currentVersion, releaseType)

console.log(`\n🚀 Creando release ${currentVersion} → ${newVersion}\n`)

// 1. Actualizar package.json
packageJson.version = newVersion
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
console.log(`✅ package.json actualizado a v${newVersion}`)

// 2. Commit y tag
try {
  execSync('git add package.json', { stdio: 'inherit' })
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' })
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' })
  console.log(`✅ Commit y tag v${newVersion} creados`)
} catch (e) {
  console.error('❌ Error en git commit/tag:', e.message)
  process.exit(1)
}

// 3. Build
console.log('\n📦 Construyendo aplicación...\n')
try {
  execSync('npm run build', { stdio: 'inherit' })
  console.log('✅ Build completado')
} catch (e) {
  console.error('❌ Error en build:', e.message)
  process.exit(1)
}

// 4. Crear distribución
console.log('\n📦 Creando instalador...\n')
try {
  execSync('npm run dist', { stdio: 'inherit' })
  console.log('✅ Instalador creado')
} catch (e) {
  console.error('❌ Error creando instalador:', e.message)
  process.exit(1)
}

// 5. Push a GitHub
console.log('\n⬆️  Subiendo a GitHub...\n')
try {
  execSync('git push origin main', { stdio: 'inherit' })
  execSync(`git push origin v${newVersion}`, { stdio: 'inherit' })
  console.log('✅ Código y tag subidos a GitHub')
} catch (e) {
  console.error('❌ Error en git push:', e.message)
  console.log('\n⚠️  Podés hacer push manual con:')
  console.log(`   git push origin main`)
  console.log(`   git push origin v${newVersion}`)
}

console.log(`\n✨ Release v${newVersion} completado!\n`)
console.log('📋 Próximos pasos:')
console.log('   1. Verificá el release en GitHub')
console.log('   2. Las apps con versión anterior descargarán automáticamente')
console.log('   3. El auto-updater chequeará cada 30 minutos\n')
