# Fasting Timer Backend API - Installation Guide

## Objetivo
Crear un backend universal compatible con GNOME Shell, KDE Plasma y Waybar mediante HTTP REST API.

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│     simple-timer.js (REST API HTTP)                 │
│  - endpoints: POST /start, POST /end, GET /stats    │
│  - CSV persistence layer                             │
│  - Stats calculation logic                           │
└─────────────────────────────────────────────────────┘
           ↑          ↑          ↑
    localhost:3001     (localhost)
          │              │              │
    ┌──────┐       ┌──────┐       ┌──────┐
    │ GNOME│       │KDE   │       │Waybar│
    │Shell │       │Plasma│       │      │
    └──────┘       └──────┘       └──────┘
```

## Requerimientos

- Node.js 18+ (o Bun para mayor velocidad)
- Systemd (para instalación automática y reinicio tras crash del sistema)
- Acceso SSH o terminal con permisos de root

## Instalación

### 1. Mover datos existentes (si los hay)

```bash
# Copia tus datos CSV actuales al nuevo backend
cp ~/.local/share/fasting-timer/log.csv /home/d3fj/Code/fasting-timer-backend/data/log.csv
rm ~/.local/share/fasting-timer/log.csv  # Borra archivo antiguo
```

### 2. Instalar Node.js (si no está)

```bash
# Opción: Node.js LTS (recomendado por universalidad)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Opcional: Usar Bun en vez de Node.js (más rápido)
curl -fsSL https://bun.sh/install | sudo bun install -gc
```

### 3. Instalar dependencias

```bash
cd /home/d3fj/Code/fasting-timer-backend
npm init -y  # Crea package.json inicial
```

### 4. Instalar systemd service

```bash
sudo mkdir -p /etc/systemd/system
sudo cp /home/d3fj/Code/fasting-timer-backend/systemd/fasting-timer-backend.service \
          /etc/systemd/system/
```

### 5. Activar servicio (reinicio automático tras crash)

```bash
sudo systemctl enable --now fasting-timer-backend.service
```

Verificar estado:

```bash
systemctl status fasting-timer-backend.service
```

### 6. Iniciar servidor localmente para pruebas

```bash
cd /home/d3fj/Code/fasting-timer-backend
node server.js
```

## Testing API

Usa curl para probar endpoints:

```bash
# Get stats (default last 7 days)
curl http://localhost:3001/api/stats?since=2026-04-16

# Simulate timer click (POST /api/end)
curl -X POST "http://localhost:3001/api/end?interval=90" \
  -H "x-timestamp:" $(date -Iseconds)
```

## Conexión desde GNOME Shell Extension

Ver `extension.js` para cómo hacer fetch() al backend:

```javascript
async function logClick(elapsed) {
  const response = await fetch('/api/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval: elapsed })
  });
  
  if (!response.ok) throw new Error('Failed to log click');
}
```

## Actualización de servidor

Edición del archivo `server.js`, guarda y reinicia vía systemd:

```bash
sudo systemctl restart fasting-timer-backend.service
```

## Remoción del servicio (si es necesario)

```bash
sudo systemctl stop fasting-timer-backend.service
sudo systemctl disable --now fasting-timer-backend.socket
sudo rm /etc/systemd/system/fasting-timer-backend*
```
