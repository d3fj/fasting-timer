#!/usr/bin/env python3

import os
import shutil

SRC = "/home/def/Code/fasting-timer-gnome-extension"
DEST = ".gnome-shell-extensions/FastingTimer"
os.makedirs(f"{DEST}/icons/{16}")
os.makedirs(f"{DEST}/icons/{48}")
shutil.copy(f"{SRC}/metadata.json", DEST)
shutil.copy(f"{SRC}/indicator-python.py", DEST)

# Extension.js simplificada
with open(f"{DEST}/js/extension.js", "w") as f:
    f.write("""/* extension.js */
const Gio = imports.gi;
const Gtk = imports.gi;

Me._initialize(function() {
  print("Fasting Timer GNOME initialized");
});
""")

# Fasting indicator
os.makedirs(f"{DEST}/js/indicators", exist_ok=True)
with open(f"{DEST}/js/indicators/fasting-indicator.js", "w") as f:
    f.write("""/* fasting-indicator.js */
class FastingIndicator extends imports.ui.indicators.IndicatorItemBase {
  constructor() {
    super();
    this._indicator = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6
    });
    
    // Icono simple de reloj usando icono estándar
    const iconName = "alarm";
    const size = 16;
    
    this._fastingIcon = new St.Icon({
      style_class: 'symlink-icon',
      gicon: new Gio(iconName, size)
    });
    
    this._indicator.add(this._fastingIcon);
    
    // Label para estadísticas
    this._label = new Gtk.Label({
      halign: Gtk.Align.START,
      text: "⏱️"
    });
    
    this._indicator.add(this._label);
  }
  
  start(duration_minutes) {
    const minutes_str = duration_minutes < 60 ? duration_minutes + " min" : 
                         duration_minutes > 60 ? Math.floor(duration_minutes / 60) + "h" : duration_minutes + "min";
    this._label.set_text(`${minutes_str}`);
    return true;
  }
  
  stop() {
    if (this._indicator) {
      this.hide();
    }
    return true;
  }
}
""")

# Iconos SVG
with open(f"{DEST}/icons/16.svg", "w") as f:
    f.write("""<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="6" fill="#4A90D9"/>
  <path d="M8 4v4l3 3" stroke="white" stroke-width="1.5" fill="none"/>
</svg>""")

with open(f"{DEST}/icons/48.svg", "w") as f:
    f.write("""<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="20" fill="#4A90D9"/>
  <path d="M24 12v12l8 8" stroke="white" stroke-width="3" fill="none"/>
</svg>""")

# Tema simple (vacío)
os.makedirs(f"{DEST}/theme", exist_ok=True)
with open(f"{DEST}/theme/gnome-shell-theme.css", "w") as f:
    pass

print("✅ Extension compilada!")
