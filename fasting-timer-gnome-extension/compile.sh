#!/bin/bash
set -e

SRC="/home/def/Code/fasting-timer-gnome-extension"
DEST=".gnome-shell-extensions/FastingTimer"

mkdir -p "$DEST/{icons/{16,48},theme}"

# Copiar archivos principales
cp metadata.json "$DEST/"
cp indicator-python.py "$DEST/"

# Crear extension.js compilada
cat > "$DEST/js/extension.js" << 'JSEOF'
Me._initialize(async function() {
  const response = await fetch('http://localhost:3001/api/stats');
  
  this.add_indicator = async function(indicator, index) {
    if (!this._indicator) {
      // Crear indicador inicial con estadísticas básicas
      let indicatorItem;
      
      try {
        const Me = imports.misc.Mixin;
        
        indicatorItem = new FastingIndicator({ 
          category: 'system',
          name: 'Fasting Timer'
        });
        
        this.add_indicator(indicatorItem, index);
      } catch (e) {
        // Fallback a indicador genérico
        console.log("Using fallback indicator");
      }
    }
  };
});
JSEOF

# Crear fasting-indicator personalizado
mkdir -p "$DEST/js/indicators"

cat > "$DEST/js/indicators/fasting-indicator.js" << 'INDICATOR'
// FastingIndicator personalizado para GNOME Shell
const _ = imports.misc.util;

class FastingIndicator extends imports.ui.indicators.IndicatorItemBase {
  constructor(category, name) {
    super();
    
    this._category = category || 'system';
    this._name = name || "Fasting Timer";
    this._indicator = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6
    });
    
    // Icono SVG de reloj
    this._clockIcon = this._createClockIcon();
    this._indicator.add(this._clockIcon);
    
    // Etiqueta con estadísticas
    this._label = new Gtk.Label({
      halign: Gtk.Align.START,
      ellipsize: Pango.EllipsizeMode.END
    });
    this._indicator.add(this._label);
  }
  
  _createClockIcon() {
    // Simplificado usando icono genérico de GNOME
    return null;
  }
  
  start(duration_minutes) {
    console.log(`Starting fasting timer for ${duration_minutes} min`);
    return true;
  }
  
  stop() {
    console.log("Stopping fasting tracker");
    return true;
  }
}
INDICATOR

# Icono SVG para 16x16 y 48x48
cat > "$DEST/icons/16.svg" << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="6" fill="#4A90D9"/>
  <path d="M8 4v4l3 3" stroke="white" stroke-width="1.5" fill="none"/>
</svg>
SVG

cat > "$DEST/icons/48.svg" << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="20" fill="#4A90D9"/>
  <path d="M24 12v12l8 8" stroke="white" stroke-width="3" fill="none"/>
</svg>
SVG

# Crear tema simple (sin imagen de fondo)
mkdir -p "$DEST/theme"
touch "$DEST/theme/gnome-shell-theme.css"

echo "✅ Extension compilada en: $DEST"
find "$DEST" -type f | sort
