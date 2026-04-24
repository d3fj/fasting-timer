// fasting-indicator.js - Indicador personalizado para GNOME Shell
const { getThemeCache } = imports.misc.theme;

class FastingIndicator extends Gtk.Box {
  constructor() {
    super({
      visible: false, 
      orientation: Gtk.Orientation.HORIZONTAL, 
      spacing: 6
    });
    
    // Icono de reloj con estilo moderno
    this.icon = this._createClockIcon();
    this.label = new Gtk.Label({ halign: Gtk.Align.CENTER });
    this.progress_bar = new Gtk.DrawingArea();
    this.timeout_id = null;
    
    this._setupUI();
  }
  
  _createClockIcon() {
    // Icono SVG simple de reloj renderizado con Cairo
    const cairo = imports.cairo;
    const cr = new Cairo.Context(this.progress_bar.get_surface());
    // ... lógica para dibujar icono de fuego
    return this.progress_bar;
  }
  
  _setupUI() {
    this.set_vexpand(true);
    this.add(this.icon);
    this.add(this.label);
    this.add(this.progress_bar);
  }
  
  start(duration_minutes) {
    const duration_seconds = duration_minutes * 60;
    const interval = setInterval((step) => {
      const now_ms = GLib.get_monotonic_time() / 1000;
      let remaining = Math.max(0, duration_seconds - now_ms);
      
      this.label.set_text(formatTime(remaining));
      this.update_progress(now_ms, remaining / duration_seconds);
      
      if (remaining <= 0) {
        clearInterval(interval);
        this.label.set_text('');
        // Emitir evento de finalización o mostrar notificación
        Gio.DBus.callSync(...);
      }
    }, 1000);
    
    this.timeout_id = interval;
  }
  
  update_progress( elapsed, remaining) {
    const percentage = Math.max(0, Math.min(1, remaining));
    // Actualizar barra de progreso
  }
  
  stop() {
    if (this.timeout_id) {
      clearInterval(this.timeout_id);
      this.timeout_id = null;
    }
    
    this.label.set_text('');
    this.hide();
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s % 65}s`;
}

function fetchStatsAsync() {
  try {
    const response = await fetch('http://localhost:3001/api/stats');
    const data = await response.json();
    
    // Formatear total_sessions en label principal
    this.label.set_text(`\u2665 ${data.total_sessions}`);
    
    // Mostrar estadísticas semanales con formato adecuado
  } catch (e) {
    console.log("Gnome shell indicator - stats error, skipping");
  }
}
