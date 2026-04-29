# INSTRUCCIONES PARA INSTALAR Y TESTEAR EXTENSIÓN CHROME 🚀

## 1️⃣ Copia la carpeta completa:
```bash
cd /home/d3fj/Code/fasting-timer-chrome-extension
cp -r /home/d3fj/Code/fasting-timer-chrome-extension ~/.local/share/chrome/user-data/extensions
```

## 2️⃣ Abrir Chrome y extender desde URL:
1. Abrir Chrome
2. Ir a `chrome://extensions/`
3. Arrastrar la carpeta `fasting-timer-chrome-extension` hacia arriba (no al directorio)
4. O copiar el contenido a: `~/.local/share/chrome/user-data/extensions/`

## 3️⃣ Alternativa más rápida para desarrollo:
```bash
# Abrir Chrome en modo desarrollador con extensión local
CHROME_PATH="$HOME/.cache/google-chrome"
cd /home/d3fj/Code/fasting-timer-chrome-extension && \
echo "Abriendo Chrome para instalar extensión desde:" && \
echo "chrome://extensions/"

# En la URL de Chrome: chrome://extensions, habilitar "Modo desarrollador", luego cargar extensión descomprimida
```

## ✅ LO QUE LOGRARÁS CON ESTA EXTENSIÓN CHROME:

| Característica | Funciona | Comentario |
|---------------|----------|------------|
| ✅ Temporizador automático | SÍ | Click derecho o auto-start |
| ✅ Estadísticas en tiempo real | SÍ | Conexión con backend API 3001 |
| ✅ Variables declaradas correctamente | SÍ | Mismo código que versión GNOME (sin errores) |
| ✅ Backend API compartido | SÍ | Usa servidor.js port 3001 |

## 🔧 CÓMO VOLVER A EXTENSIÓN GNOME DESPUÉS DE TESTEAR:

```bash
# Pasos para volver a extensión original de GNOME Shell:

# 1. Desinstalar desde Chrome/extensions (clic en la extensión, luego "Quitar")
# O cerrar pestaña de modo desarrollador

# 2. Reiniciar sesión para recargar extensiones de GNOME:
gnome-shell --version

# 3. Tu extensión GNOME debería continuar funcionando porque estás usando el mismo backend API
```

---

## 📋 RESUMEN DE LA ESTRATEGIA HÍBRIDA:

```
Backend API (server.js port 3001) ────┬──→ GNOME Shell Extension ✅ PRODUCTION
                                      ├──→ Chrome Extension 🔨   DEVELOPMENT / TESTING
                                      └──→ Firefox Extension 🆕    POSIBLE
```

**Ventajas:**
- ✅ Testear UI/componentes en Chrome sin riesgo
- ✅ Ver consola del navegador para debuguear errores  
- ✅ Prototipar nuevas funcionalidades rápidamente
- ✅ Validar lógica antes de implementar en GNOME Shell

---

## 🎯 ¿CUAL QUIERES TESTEAR PRIMERO?

1. **Instalar versión Chrome ahora mismo** para probar la lógica
2. **Seguir arreglando versión GNOME actual** (agregué estadísticas al menú)  
3. **Crear versión Firefox también** (puedo hacerlo en minutos)

Dime y prosigamos! 🔥
