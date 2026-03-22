# Guía de Deployment a Vercel - P2P Manager

## Paso 1: Preparar el Proyecto
✅ El proyecto ya está configurado en el repositorio con:
- `vercel.json` - Configuración del build y rutas
- `.vercelignore` - Archivos a ignorar en el deployment

## Paso 2: Variables de Entorno en Vercel

Necesitas agregar estas variables de entorno en tu project de Vercel:

### Base de Datos
```
SUPABASE_DATABASE_URL=tu_url_de_supabase
```

### JWT
```
JWT_SECRET=tu_secret_jwt_seguro
```

### API Config
```
NODE_ENV=production
PORT=3000
```

## Paso 3: Desplegar en Vercel

### Opción A: Usando Vercel CLI (Recomendado)
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Desde la carpeta del proyecto
vercel

# 3. Seguir las instrucciones:
#    - Conectar tu cuenta de Vercel
#    - Seleccionar el proyecto
#    - Confirmar build settings
```

### Opción B: Usando GitHub (Más fácil)
1. **Push el código a GitHub** (ya lo hiciste)
2. Ve a [vercel.com](https://vercel.com)
3. Haz login con GitHub
4. Click en "Add New..." → "Project"
5. Selecciona tu repositorio `prueba-p2p`
6. En "Environment Variables", agrega:
   - `SUPABASE_DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
7. Click en "Deploy"

## Paso 4: Configurar Variables de Entorno en Vercel Dashboard

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable:
   - **SUPABASE_DATABASE_URL**: Tu URL de conexión a la base de datos
   - **JWT_SECRET**: Un string seguro (mínimo 32 caracteres)
   - **NODE_ENV**: `production`

## Paso 5: Verificar el Deployment

Después de desplegar:

```bash
# 1. Verifica que el frontend carga
curl https://tu-proyecto.vercel.app/

# 2. Verifica que la API responde
curl https://tu-proyecto.vercel.app/api/health

# 3. Verifica la base de datos
curl https://tu-proyecto.vercel.app/api/auth/me
```

## Estructura de Deployment

```
vercel.app/                    → Frontend (React)
vercel.app/api/*              → Backend API (Express)
```

## Solución de Problemas

### "Build failed"
- Verifica que `pnpm` esté instalado: `pnpm --version`
- Revisa los logs en Vercel Dashboard → Deployments → Logs

### "Database connection error"
- Verifica `SUPABASE_DATABASE_URL` en Environment Variables
- Asegúrate que la base de datos está accesible desde Vercel

### "API not found (404)"
- Verifica que la ruta API es `/api/...`
- Revisa vercel.json está en la raíz del proyecto

### "Frontend shows blank page"
- Limpia caché del navegador (Ctrl+Shift+Del)
- Verifica que `BASE_URL` en el frontend es correcto

## Después del Deployment

Tu aplicación estará disponible en:
```
https://tu-proyecto.vercel.app
```

- **Frontend**: `https://tu-proyecto.vercel.app`
- **API**: `https://tu-proyecto.vercel.app/api/`
- **Datos**: Conectados a tu base de datos Supabase

## Monitoreo

En Vercel Dashboard puedes:
- Ver logs en tiempo real
- Revisar variables de entorno
- Hacer rollback a versiones anteriores
- Configurar dominios personalizados

¡Tu proyecto está listo para producción! 🚀
