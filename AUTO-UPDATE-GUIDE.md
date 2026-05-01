# 🔄 Guía de Auto-Actualización

## ❌ Problema Actual

**Tu app NO se actualiza automáticamente porque:**

1. **Versión actual en la app**: `1.0.1`
2. **Versión en GitHub release**: `1.0.1`
3. **Electron auto-updater**: Solo descarga si hay una versión **MAYOR** disponible

**Resultado**: La app chequea updates cada 30 minutos, pero como ambas versiones son iguales (1.0.1), no hay nada que descargar.

## ✅ Solución

Para que el auto-update funcione, necesitás crear un **nuevo release con versión mayor**:

### Opción 1: Script Automático (RECOMENDADO)

```bash
# Incrementa versión patch (1.0.1 → 1.0.2)
npm run release

# Incrementa versión minor (1.0.1 → 1.1.0)
npm run release:minor

# Incrementa versión major (1.0.1 → 2.0.0)
npm run release:major
```

**El script hace TODO automáticamente:**
1. ✅ Incrementa versión en `package.json`
2. ✅ Hace commit y crea tag en git
3. ✅ Construye la aplicación (`npm run build`)
4. ✅ Crea el instalador (`npm run dist`)
5. ✅ Sube todo a GitHub (código + tag + release)

### Opción 2: Manual

```bash
# 1. Cambiar versión en package.json
# "version": "1.0.2"  (o mayor)

# 2. Commit y tag
git add package.json
git commit -m "chore: bump version to 1.0.2"
git tag v1.0.2

# 3. Build y distribución
npm run build
npm run dist

# 4. Push a GitHub
git push origin main
git push origin v1.0.2
```

## 🔍 Cómo Funciona el Auto-Update

### Flujo Automático:

1. **App inicia** → Chequea updates después de 5 segundos
2. **Cada 30 minutos** → Chequea updates en background
3. **Si hay nueva versión** → Descarga automáticamente
4. **Descarga completa** → Notifica al usuario
5. **Al cerrar la app** → Instala la actualización automáticamente

### Logs para Debug:

Abrí la consola de Electron (F12 en dev mode) y buscá:

```
[AutoUpdater] Checking for update...
[AutoUpdater] Update available: 1.0.2
[AutoUpdater] Download: 50%
[AutoUpdater] Update downloaded: 1.0.2
```

Si ves errores:
```
[AutoUpdater] Error: ...
```

## 🐛 Troubleshooting

### "No update available" (versión actual = release)

**Problema**: La app tiene la misma versión que el último release en GitHub.

**Solución**: Creá un nuevo release con versión mayor usando `npm run release`.

### "Error: 404 Not Found"

**Problema**: El repositorio es privado y no hay token de GitHub configurado.

**Solución 1 (Recomendada)**: Hacé el repo público
- GitHub → Settings → Danger Zone → Change visibility → Public

**Solución 2**: Configurar token de GitHub
```bash
# Windows (PowerShell)
$env:GH_TOKEN="ghp_tu_token_aqui"
npm run dist

# Linux/Mac
export GH_TOKEN=ghp_tu_token_aqui
npm run dist
```

### "Error: ENOENT latest.yml"

**Problema**: El release no tiene el archivo `latest.yml` que electron-updater necesita.

**Solución**: Asegurate de que `electron-builder` esté configurado con `publish: always`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "santibdev",
      "repo": "ESSENZA-APP",
      "releaseType": "release"
    }
  }
}
```

### La app no chequea updates

**Problema**: Estás en modo desarrollo (`NODE_ENV=development`).

**Solución**: El auto-updater solo funciona en producción. Instalá la app desde el `.exe` generado.

## 📋 Checklist para Nuevo Release

- [ ] Código testeado y funcionando
- [ ] Versión incrementada en `package.json`
- [ ] Commit y tag creados
- [ ] Build exitoso (`npm run build`)
- [ ] Instalador creado (`npm run dist`)
- [ ] Release subido a GitHub
- [ ] Archivo `.exe` disponible en GitHub releases
- [ ] Archivo `latest.yml` presente en el release

## 🎯 Ejemplo Completo

### Estado Actual:
- **Apps instaladas**: v1.0.1
- **GitHub release**: v1.0.1
- **Resultado**: ❌ No hay updates

### Después de crear v1.0.2:
- **Apps instaladas**: v1.0.1
- **GitHub release**: v1.0.2
- **Resultado**: ✅ Apps descargan v1.0.2 automáticamente

### Timeline:
```
T+0s:    Usuario abre la app v1.0.1
T+5s:    App chequea GitHub → encuentra v1.0.2
T+5s:    Empieza descarga automática (73.5 MB)
T+30s:   Descarga completa
T+30s:   Toast: "Versión 1.0.2 lista. Se instalará al cerrar."
T+35s:   Auto-instala (o espera a que el usuario cierre)
T+40s:   Usuario cierra la app
T+40s:   Instalador se ejecuta automáticamente
T+45s:   Usuario abre la app → ahora tiene v1.0.2
```

## 🚀 Próximos Pasos

1. **Ahora mismo**: Ejecutá `npm run release` para crear v1.0.2
2. **Esperá 5 minutos**: GitHub procesa el release
3. **Abrí tu app instalada**: Debería detectar y descargar v1.0.2 automáticamente
4. **Cerrá y abrí**: La actualización se instala

---

**Última actualización**: 2026-05-01
