// Smoke Timer Stats Loader - Carga directamente del backend api/stats (sin extension.min.js)

let currentDuration = 75; // Valor por defecto si localStorage está vacío

// --- INICIALIZACIÓN: Leemos lo guardado o usamos default ===
try {
  const savedDuration = localStorage.getItem('smokeTimerPreferredDuration');
  if (savedDuration) {
    currentDuration = parseInt(savedDuration, 10);
    console.log(`💾 Tiempo guardado cargado: ${currentDuration}m`);
    
    // Actualizamos display con default si aún no hay backend loaded
    const durationElem = document.getElementById('timeDisplay');
    if (durationElem) {
      updateTimeDisplay(formatDuration(currentDuration));
    }
  }
} catch (e) {
  console.warn('⚠️ No se pudo leer localStorage:', e.message);
}

// --- Función para formatear tiempo amigable ===
function formatDuration(minutes) {
  if (minutes && minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes - (h * 60);
    return `${h}h ${m}m`;
  }
  if (minutes === 75) return '1h 15m';
  if (minutes === 90) return '1h 30m';
  // Si viene directamente del backend en formato 'Xh Ym' retornamos eso
  if (typeof minutes === 'string') return minutes;
  return `${minutes}m`;
}

// --- Guardar preferencia local cuando usuario selecciona algo ===
function savePreference(minutes) {
  try {
    localStorage.setItem('smokeTimerPreferredDuration', minutes.toString());
    console.log(`💾 Usuario eligió: ${formatDuration(minutes)} (${minutes}m)`);
    return true;
  } catch (e) {
    console.warn('⚠️ Error al guardar preferencia:', e.message);
    return false;
  }
}

// --- Actualizar el display del tiempo actual ===
function updateTimeDisplay(formattedText) {
  const durationElem = document.getElementById('timeDisplay');
  if (durationElem && formattedText) {
    durationElem.textContent = formattedText;
  }
}

// --- Handler para botones de configuración ===
function handleButtonDuration(event) {
  const btn = event.target.closest('.btn') || event.target; // Asegurarse de capturar correctamente
  
  if (!btn || !btn.dataset.duration) return;
  
  const minutes = parseInt(btn.dataset.duration, 10);
  currentDuration = minutes;
  
  // Guardar preferencia persistentemente
  savePreference(minutes);
  
  // Actualizar display inmediatamente con formateado correcto
  updateTimeDisplay(formatDuration(minutes));
  
  console.log(`✅ Reiniciando timer a: ${minutes}m → formateado: formatDuration(currentDuration)`);
  
  // Cargar stats refrescadas (por si backend envía preference actualizada también)
  loadStats();
  
  return true;
}

async function loadStats() {
  console.log('🔄 Intentando cargar stats desde backend...');
  
  try {
    const response = await fetch('http://localhost:3001/api/stats');
    
    if (response.ok) {
      const stats = await response.json();
      console.log('✅ Stats cargadas correctamente:', JSON.stringify(stats));
      
      // --- CAMPO: Total sesiones ===
      const total = document.getElementById('totalSessions');
      if (total && stats.total_sessions !== undefined) {
        total.textContent = Number(stats.total_sessions || 0).toLocaleString();;
        console.log(`📊 Total sesiones: ${Number(stats.total_sessions || 0).toLocaleString()}`);
      }
      
      // --- CAMPO: Semanas anteriores (total mensual) ===
      const weeklySessionsElem = document.getElementById('weeklySessions');
      if (weeklySessionsElem && stats.weekly_total_sessions !== undefined) {
        weeklySessionsElem.textContent = Math.round(stats.weekly_total_sessions).toLocaleString();;
        console.log(`📅 Semanas anteriores: ${Math.round(stats.weekly_total_sessions)} sesiones`);
      }
      
      // --- CAMPO: Promedio semanal (minutos por sesión - últimas 4 semanas) ===
      const weeklyMinutes = document.getElementById('weeklyMinutes');
      if (stats.weekly_average_minutes !== null && weeklyMinutes) {
        const rounded = Math.round(stats.weekly_average_minutes);
        weeklyMinutes.textContent = `${rounded}m`;
        console.log(`📈 Promedio semanal: ${rounded} minutos por sesión`);
      }
      
      // --- CAMPO: Mes actual (total sesiones este mes) ===
      const monthlySessionsElem = document.getElementById('monthlySessions');
      if (monthlySessionsElem && stats.monthly_total_sessions !== undefined) {
        monthlySessionsElem.textContent = Math.round(stats.monthly_total_sessions).toLocaleString();;
        console.log(`📅 Mes actual: ${Math.round(stats.monthly_total_sessions)} sesiones`);
      }
      
      // --- CAMPO: Promedio mensual (minutos por sesión - mes en curso) ===
      const monthlyMinutesElem = document.getElementById('monthlyMinutes');
      if (stats.monthly_average_minutes !== null && monthlyMinutesElem) {
        const rounded = Math.round(stats.monthly_average_minutes);
        monthlyMinutesElem.textContent = `${rounded}m`;
        console.log(`📈 Promedio mensual: ${rounded} minutos por sesión`);
      }
      
      // --- CAMPO: Sesiones/día últimos 7 días (promedio móvil) ==
      const weeklyPerDay = document.getElementById('weeklyPerDay');
      if (stats.weekly_avg_per_day !== null && weeklyPerDay) {
        weeklyPerDay.textContent = stats.weekly_avg_per_day.toFixed(1) + '/día';
        console.log(`📈 Sesiones/día (7 días): ${stats.weekly_avg_per_day}/día`);
      }
      
      // --- CAMPO: Sesiones/día mes actual (promedio móvil) ===
      const monthlyPerDay = document.getElementById('monthlyPerDay');
      if (stats.monthly_avg_per_day !== null && monthlyPerDay) {
        monthlyPerDay.textContent = Number(stats.monthly_avg_per_day).toFixed(1) + '/día';
        console.log(`📈 Sesiones/día mes: ${Number(stats.monthly_avg_per_day).toFixed(1)}/día`);
      }
      
      // --- CAMPO: Tiempo actual sincronizado con backend ===
      const durationElem = document.getElementById('timeDisplay');
      if (durationElem && stats.duration_minutes !== undefined) {
        let timeFormatted = formatDuration(stats.duration_minutes);
        
        // Si backend tiene preference_minutes, lo mostramos y guardamos preferencia también
        if (stats.preference_minutes !== undefined) {
          const preferredFormat = formatDuration(stats.preference_minutes);
          console.log(`💡 Backend envía preferencia: ${preferredFormat} (${stats.preference_minutes}m)`);
          
          // Solo sincronizamos si el usuario no eligió algo diferente manualmente
          if (currentDuration === stats.duration_minutes) {
            timeFormatted = formatDuration(stats.duration_minutes);
            currentDuration = stats.duration_minutes; // Sincronizamos interno con backend
            console.log(`✅ Tiempo actualizado automáticamente desde backend: ${timeFormatted}`);
          } else {
            // El usuario eligió algo diferente, respetamos UI local pero guardamos preference del backend para sync futuro
            console.log(`📌 Usuario eligió diferentemente (${formatDuration(currentDuration)} vs backend ${preferredFormat}); respetando selección local`);
          }
          
          durationElem.textContent = timeFormatted;
        } else if (stats.duration_minutes !== currentDuration) {
          // Backend envía algo diferente, actualizamos display y interno
          currentDuration = stats.duration_minutes;
          timeFormatted = formatDuration(stats.duration_minutes);
          durationElem.textContent = timeFormatted;
          console.log(`🔄 Sincronizando tiempo desde backend: ${timeFormatted}`);
        } else {
          // Ya está sincronizado, usamos preferencia guardada si no hay preference field
          currentDuration = stats.duration_minutes;
          timeFormatted = formatDuration(stats.duration_minutes);
          durationElem.textContent = timeFormatted;
          console.log(`✅ Tiempo actual (ya sincronizado): ${timeFormatted}`);
        }
      }
      
      console.log('✅ Estadísticas completas cargadas y UI actualizada');
    } else {
      console.error(`❌ API no ok: ${response.status} ${response.statusText}`, await response.text());
    }
  } catch (e) {
    console.error('❌ Error al cargar stats:', e.message);
  }
}

// --- CARGA INMEDIATA ===
document.addEventListener('DOMContentLoaded', () => {
  // Agregar listeners a botones de configuración primero
  document.querySelectorAll('.btn[data-duration]').forEach(btn => {
    const duration = parseInt(btn.dataset.duration, 10);
    // Usar preventDefault para evitar propagación si el botón también tiene evento inline (aunque no debería tener)
    btn.addEventListener('click', e => {
      if (!e.defaultPrevented) handleButtonDuration(e);
    }, true);
    
    // Resaltar botón activo visualmente
    if (currentDuration === duration) {
      btn.classList.add('active');
    }
  });
  
  console.log('🎯 Elementos DOM listos para cargar stats...');
  
  // Cargar stats inmediatamente (pequeño delay para asegurar display está renderizado)
  setTimeout(() => loadStats(), 100);
});

// Exportar para debugging y pruebas
window.loadStats = loadStats;
window.formatDuration = formatDuration;
window.handleButtonDuration = handleButtonDuration;
window.smokeTimerBackendLoaded = true;
