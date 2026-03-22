# Deployment Vercel - P2P Manager (Monorepo)

## 📋 Resumen
Tu proyecto tiene 2 partes que deben deployarse por separado:
1. **Frontend** (React) → `artifacts/p2p-manager`
2. **Backend API** (Express) → `artifacts/api-server`

---

## 🚀 OPCIÓN 1: Frontend (Recomendado Primero)

### Paso 1: Crear proyecto en Vercel para el Frontend

**A. Usando GitHub (Más fácil):**
1. Ve a [vercel.com](https://vercel.com)
2. Login con GitHub
3. Click en "Add New..." → "Project"
4. Busca `prueba-p2p` y selecciónalo
5. En "Root Directory", selecciona → `artifacts/p2p-manager`
6. Click en "Deploy"

**B. Usando CLI:**
```bash
cd artifacts/p2p-manager
vercel
```

### Paso 2: Agregar Variables de Entorno

En Vercel Dashboard del Frontend:
- Settings → Environment Variables

Agrega:
```
VITE_API_URL=https://tu-api.vercel.app
NODE_ENV=production
```

Ejemplo:
```
VITE_API_URL=https://p2p-api.vercel.app
```

### Paso 3: Verificar Build

La URL será algo como:
```
https://p2p-manager.vercel.app
```

---

## 🔗 OPCIÓN 2: Backend API

### Paso 1: Crear proyecto en Vercel para la API

**A. Usando GitHub:**
1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New..." → "Project"
3. Selecciona `prueba-p2p`
4. En "Root Directory", selecciona → `artifacts/api-server`
5. Click en "Deploy"

**B. Usando CLI:**
```bash
cd artifacts/api-server
vercel
```

### Paso 2: Agregar Variables de Entorno

En Vercel Dashboard del API:
- Settings → Environment Variables

Agrega:
```
SUPABASE_DATABASE_URL=postgresql://usuario:password@host:5432/database
JWT_SECRET=tu_secret_jwt_muy_seguro_minimo_32_caracteres
NODE_ENV=production
```

**Ejemplo:**
```
SUPABASE_DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
JWT_SECRET=mi_secret_super_seguro_12345678901234567890
NODE_ENV=production
```

### Paso 3: Verificar API

La URL será algo como:
```
https://p2p-api.vercel.app/api/health
```

---

## ✅ Configuración Cruzada

Una vez deployados ambos, actualiza cada uno:

### En Frontend (Vercel Dashboard)
Environment Variables:
```
VITE_API_URL=https://p2p-api.vercel.app
```

### En API (Vercel Dashboard)
Environment Variables:
```
SUPABASE_DATABASE_URL=tu_url_real
JWT_SECRET=tu_secret_real
NODE_ENV=production
```

---

## 🔍 Verificar que Todo Funciona

```bash
# 1. Frontend carga
curl https://p2p-manager.vercel.app

# 2. API responde
curl https://p2p-api.vercel.app/api/health

# 3. Login funciona
curl -X POST https://p2p-api.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alexaelperdomo1809@gmail.com","password":"Server_1005$"}'
```

---

## 📊 Estructura Final

```
p2p-manager.vercel.app          → Frontend React
├── /                           → Página de login
├── /dashboard                  → Dashboard
├── /operaciones                → Operaciones
└── /api/*                      → Proxy a la API

p2p-api.vercel.app              → Backend Express
├── /api/auth                   → Autenticación
├── /api/operations             → Operaciones
├── /api/dashboard              → Dashboard
├── /api/currencies             → Monedas
├── /api/payment-methods        → Métodos de pago
└── /api/uploads/*              → Archivos
```

---

## 🛠️ Solución de Problemas

### "No se conecta al API"
- Verifica que `VITE_API_URL` está correcto en el frontend
- Comprueba que el API está deployado y corriendo

### "Error de base de datos"
- Verifica `SUPABASE_DATABASE_URL` está correcta
- Asegúrate que Supabase permite conexiones desde Vercel

### "Archivo no encontrado (404)"
- Verifica que `/api/uploads` está correctamente configurado en API
- Revisa permisos de carpeta `uploads/`

### "CORS Error"
- El API Express está configurado para aceptar cualquier origen
- Si aún tiene problemas, agrega en API:
```javascript
app.use(cors({
  origin: 'https://p2p-manager.vercel.app',
  credentials: true
}));
```

---

## 📝 Resumen de URLs

| Servicio | URL | Variables |
|----------|-----|-----------|
| Frontend | `https://p2p-manager.vercel.app` | `VITE_API_URL` |
| API | `https://p2p-api.vercel.app` | `SUPABASE_DATABASE_URL`, `JWT_SECRET` |
| Base de Datos | Supabase | Conectada al API |

---

## 🎉 ¡Listo!

Tu aplicación estará completamente funcional en producción. Usuarios pueden acceder a:

```
https://p2p-manager.vercel.app
```

Y todo el backend estará en:
```
https://p2p-api.vercel.app
```
