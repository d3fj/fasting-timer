/* fasting-indicator.js */
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
