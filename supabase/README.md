# SportLink Backend (Supabase)

Este directorio contiene el schema y la lógica de base de datos del backend.

## Aplicar migraciones

### Opción A — SQL Editor del dashboard

1. Abrí [https://supabase.com/dashboard](https://supabase.com/dashboard) y seleccioná el proyecto.
2. Andá a **SQL Editor** → **New query**.
3. Copiá el contenido de `migrations/0001_initial_schema.sql`.
4. Ejecutá la query.

### Opción B — Supabase CLI (recomendado para desarrollo local)

```bash
# Instalar CLI si no lo tenés
npm install -g supabase

# Login y vinculación con el proyecto
supabase login
supabase link --project-ref <project-ref>

# Ejecutar migraciones pendientes
supabase db push
```

## Crear el usuario entrenador inicial

Las credenciales de autenticación viven en `auth.users`. No se pueden insertar directamente desde SQL, así que hay dos formas:

### 1. Desde el dashboard

1. Andá a **Authentication** → **Users** → **Add user**.
2. Ingresá el email y la contraseña del entrenador.
3. Ejecutá esta query en el SQL Editor para darle rol `entrenador`:

```sql
update public.profiles
set role = 'entrenador'
where id in (
  select id
  from auth.users
  where email = 'Fraanblasco2307@gmail.com'
);
```

### 2. Desde la app (cuando el frontend esté listo)

1. Registrate con ese email desde el formulario de signup.
2. Corré la misma query de arriba para convertir el usuario en `entrenador`.

## Datos de demo

El frontend puede cargar jugadores de demo mediante el servicio o un script. El schema separa `profiles` (auth) de `athletes` (ficha), así que el entrenador puede dar de alta jugadores antes de que estos se registren.

## Realtime

La tabla `freed_slots` ya está agregada a la publicación `supabase_realtime`. Cada vez que un jugador cancela una asistencia, se inserta un registro y los clientes suscritos reciben la notificación.

## Variables del frontend

Completá los archivos:

- `web-client/src/environments/environment.ts`
- `web-client/src/environments/environment.development.ts`

Con el **Project URL** y la **anon public API key** del dashboard.
