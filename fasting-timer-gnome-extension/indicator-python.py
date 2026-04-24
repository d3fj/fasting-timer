#!/usr/bin/env python3

import gi
gi.require_version('Notify', '0.7')
import gi
from gi.repository import GLib, Notify, Gtk, Gdk

class FastingTimerIndicator:
    def __init__(self, uid, label):
        self._uid = uid
        self._label = label
        self.running = False
        
        # Icono simple de reloj usando emoji o SVG base64
        self.icon = 'clock.png'  # Debería estar en la carpeta icons/
        
    def connect(self, manager):
        print("FastingTimerIndicator connecting...")
        return True
        
    def start(self, duration_minutes):
        """Inicia el temporizador mostrando indicador en panel superior"""
        if not self.running:
            duration_seconds = duration_minutes * 60
            
            # Mostrar ventana emergente temporal en panel de indicadores
            window = Notify.Window.new("Fasting Timer")
            window.set_transient_for(Gtk.Application.get_default())
            
            # Icono personalizado
            icon_pixbuf = Gdk.Icon.CLOCK
            
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            label = Gtk.Label(label=datetime.fromtimestamp(int(time.time())).strftime("%M:%S"))
            
            window.add_sibling(box)
            window._set_child_label(self._label)
            box.pack_start(self._label, False, True, 0)
            
            self.running = True
            
            # Barra de progreso simple
            progress = Gtk.ProgressBar()
            box.pack_end(progress, False, True, 0)
            
            # Timer countdown
            interval_id = GLib.timeout_add(1000, lambda: on_progress(window, duration_seconds))
        
        return self.running
        
    def update(self):
        """Notificaciones de progreso si no está visible actualmente"""
        return False
        
    def stop(self):
        print("Fasting Indicator Stopped.")
        if self.running:
            self.running = False
            
        # Ocultar ventana temporal y limpiar recursos
        return True

def on_progress(window, remaining_seconds):
    from datetime import datetime
    
    now_time = int(time.time())
    progress_percentage = int((remaining_seconds - (now_time % 60)) / 60 * 100)
    
    # Actualizar progreso
    if window:
        child_label = window._get_child_label()
        if child_label and hasattr(window, 'set_text'):
            m = progress_percentage // 60
            s = progress_percentage % 60
            window.set_text(f"{m}m {s}s")
            
            # Notificación de progreso cada 5 minutos
            if progress_percentage % 300 == 0:
                Notify.Notification.new("Fasting Time Update", "Progress update...").show()
    
    if remaining_seconds <= 0:
        return False
    
    return True

import time
from datetime import datetime
