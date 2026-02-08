# Push a Git y deploy en Vercel

## 1. Subir el proyecto a Git (GitHub)

Abre una terminal en la carpeta del proyecto (`spelling-bee-manager`) y ejecuta:

```bash
# Inicializar repo (si aún no está)
git init

# Añadir todos los archivos ( .env.local ya está en .gitignore, no se sube )
git add .
git commit -m "Spelling Bee Manager: login, Supabase, Vercel"

# Crear el repositorio en GitHub:
# - Ve a https://github.com/new
# - Nombre: spelling-bee-manager (o el que quieras)
# - No marques "Add a README" (ya tienes uno)
# - Crear repositorio

# Conectar y hacer push (sustituye TU_USUARIO y TU_REPO por los tuyos)
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

**Importante:** No subas nunca `.env.local`. Ya está en `.gitignore`; comprueba con `git status` que no aparezca antes de hacer commit.

---

## 2. Deploy en Vercel

1. Entra en **[vercel.com](https://vercel.com)** e inicia sesión (con GitHub si quieres).
2. **Add New… → Project** y **importa** el repositorio `spelling-bee-manager` (o el nombre que le hayas puesto).
3. En **Environment Variables** añade (mismo valor que en tu `.env.local`):

   | Nombre | Valor |
   |--------|--------|
   | `GEMINI_API_KEY` | tu API key de Gemini |
   | `VITE_SUPABASE_URL` | https://xxxx.supabase.co |
   | `VITE_SUPABASE_ANON_KEY` | tu anon key de Supabase |
   | `VITE_TEACHER_CREDENTIALS` | (opcional) usuario1:clave1,usuario2:clave2 |

4. **Deploy**. Vercel usará `vercel.json` (build con Vite, salida `dist`).
5. Cuando termine, tendrás una URL tipo `https://spelling-bee-manager-xxx.vercel.app`. Los datos seguirán en Supabase, así que serán los mismos que en local.

---

## 3. Actualizaciones futuras

Cada vez que hagas cambios y quieras actualizar el deploy:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Vercel detectará el push y hará un nuevo deploy automáticamente (si conectaste el repo con “Deploy on push”).
