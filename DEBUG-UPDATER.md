# 🐛 Debug del Auto-Updater

## Paso 1: Verificar que estás en PRODUCCIÓN

El auto-updater **NO funciona en modo desarrollo**. Necesitás:

1. **Cerrar la app de desarrollo** (si está corriendo)
2. **Instalar la app** desde el `.exe` generado
3. **Abrir la app instalada** (no desde VS Code)

### ¿Cómo saber si estás en producción?

Abrí la consola de desarrollador (F12) y buscá:

```
[Updater] API available, setting up listeners...
[Updater] Listeners configurados
```

Si ves:
```
[Updater] API no disponible (modo desarrollo?)
```

→ **Estás en modo desarrollo**. Necesitás instalar la app.

## Paso 2: Forzar Chequeo de Updates

1. Abrí la app instalada
2. Presioná F12 para abrir la consola
3. Hacé clic en el botón **"🔄 Check Updates"** en el topbar
4. Mirá los logs en la consola

### Logs Esperados (ÉXITO):

```
[DEBUG] Forcing update check...
[DEBUG] Update check triggered
[AutoUpdater] Checking for update...
[AutoUpdater] Update available: 1.0.2
[Updater] ✅ Nueva versión 1.0.2 disponible!
[AutoUpdater] Download: 25%
[AutoUpdater] Download: 50%
[AutoUpdater] Download: 75%
[AutoUpdater] Download: 100%
[AutoUpdater] Update downloaded: 1.0.2
[Updater] ✅ Versión 1.0.2 lista para instalar!
```

### Logs de ERROR Comunes:

#### Error 1: "404 Not Found"
```
[AutoUpdater] Error: Error: Cannot find latest.yml in the latest release artifacts
```

**Causa**: El repositorio es privado o el release no tiene `latest.yml`.

**Solución**:
1. Hacé el repo público en GitHub
2. O configurá `GH_TOKEN`:
   ```bash
   # En PowerShell (como administrador)
   [System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'ghp_tu_token', 'User')
   ```

#### Error 2: "No update available"
```
[AutoUpdater] No update available. Current: 1.0.2
```

**Causa**: La app instalada ya tiene la última versión.

**Solución**: Creá un nuevo release con versión mayor:
```bash
npm run release
```

#### Error 3: "ENOENT latest.yml"
```
[AutoUpdater] Error: ENOENT: no such file or directory, open 'latest.yml'
```

**Causa**: El release no se publicó correctamente.

**Solución**: Verificá que el release en GitHub tenga estos archivos:
- `ESSENZA-MODELS_Setup_1.0.2.exe`
- `ESSENZA-MODELS_Setup_1.0.2.exe.blockmap`
- `latest.yml`

## Paso 3: Verificar el Release en GitHub

1. Andá a: https://github.com/santibdev/ESSENZA-APP/releases
2. Verificá que exista el release `v1.0.2`
3. Verificá que tenga estos archivos:
   - ✅ `ESSENZA-MODELS_Setup_1.0.2.exe` (73.5 MB)
   - ✅ `ESSENZA-MODELS_Setup_1.0.2.exe.blockmap` (80 KB)
   - ✅ `latest.yml` (356 bytes)

Si falta alguno → El release no se publicó correctamente.

## Paso 4: Verificar Versión Instalada

En la consola (F12), ejecutá:

```javascript
console.log('Versión instalada:', require('electron').remote?.app?.getVersion())
```

O mirá en: **Configuración → Acerca de**

## Paso 5: Logs del Main Process

Los logs más importantes están en el proceso principal de Electron.

### Windows:
```
%APPDATA%\ESSENZA MODELS\logs\main.log
```

### Buscá líneas como:
```
[AutoUpdater] Checking for update...
[AutoUpdater] Update available: 1.0.2
[AutoUpdater] Error: ...
```

## Checklist Completo

- [ ] App instalada desde `.exe` (no modo desarrollo)
- [ ] Versión instalada es menor que la del release (ej: 1.0.1 < 1.0.2)
- [ ] Release en GitHub tiene `latest.yml`
- [ ] Repositorio es público O tenés `GH_TOKEN` configurado
- [ ] Botón "Check Updates" muestra logs en consola
- [ ] No hay errores 404 o ENOENT

## Solución Rápida

Si nada funciona, probá esto:

```bash
# 1. Asegurate de que el repo sea público
# GitHub → Settings → Danger Zone → Change visibility → Public

# 2. Creá un nuevo release
cd ESSENZA-APP
npm run release

# 3. Esperá 5 minutos

# 4. Desinstalá la app actual
# Windows: Configuración → Apps → ESSENZA MODELS → Desinstalar

# 5. Instalá la versión 1.0.1 desde GitHub releases
# https://github.com/santibdev/ESSENZA-APP/releases/tag/v1.0.1

# 6. Abrí la app → Debería detectar v1.0.2 automáticamente
```

## Contacto

Si seguís teniendo problemas, enviame:

1. Screenshot de la consola (F12) después de hacer clic en "Check Updates"
2. Screenshot del release en GitHub
3. Versión instalada (Configuración → Acerca de)
4. Contenido de `%APPDATA%\ESSENZA MODELS\logs\main.log`
