Veo que ya configuraste el repo `santibdev/ESSENZA-APP`. Ahora instalo la versión actualizada y agrego el banner de notificación de update en la app.

Listed directory src
Ran command: `npm install`
Viewed App.vue:1-78
Listed directory components

Creo el componente `UpdateBanner.vue` y lo integro en `App.vue`:

Created UpdateBanner.vue
Edited App.vue
Edited App.vue

Todo listo. Ahora el paso final — **publicar la primera versión**:

---

## 🚀 Publicar v1.0.0 en GitHub

Necesitás un **GitHub Personal Access Token**. Pasos:

1. Ir a: **github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Nombre: `essenza-release`
4. Tildar solo: ✅ `repo` (todos los subitems)
5. Click **Generate token** → copiar el token

Luego en PowerShell:

```powershell
cd "c:\Users\brito\Desktop\ESSENZA\app"
$env:GH_TOKEN = "ghp_TU_TOKEN_AQUI"
npm run dist -- --publish always
```

Esto:
1. Compila el frontend
2. Empaqueta el `.exe`
3. **Lo sube automáticamente** a GitHub Releases como `v1.0.0`
4. Los usuarios descargan ese `.exe` una sola vez

---

## 🔄 Para futuras actualizaciones

Solo cambiás la versión en `package.json`:
```json
"version": "1.1.0"
```
Y volvés a correr el mismo comando. **Todos los usuarios recibirán el banner de update automáticamente** la próxima vez que abran la app.

¿Querés que corramos el `npm run dist` ahora?