import PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import ModalDialog from "resource:///org/gnome/shell/ui/modalDialog.js";
import St from "gi://St";

// Smoke Timer Pop-up Menu for extended controls
const _ = { popup: null, currentBackendUrl: null };

function createPopup() {
    const popup = new PopupMenu.PopupMenu(null);
    popup.set_content(container => {
        container.add(
            new St.Label({ text: "🔄 Actualizando datos desde API...", y_align: St.ActorAlign.CENTER }),
            { style_class: 'popup-title' },
        );
    });
    
    _._refresh = () => {
        // Fetch latest stats from backend - BASE_URL declarada en extension.js
        const baseUrl = window.gsmoke_timer || "http://localhost:3001";
        
        fetch(`${baseUrl}/api/stats`)
            .then(r => r.json())
            .then(stats => {
                const dialog = new ModalDialog({
                    transient: true,
                    modal: true,
                    title: "📊 Estadísticas de Temporizador",
                });

                const scrolledLabel = new St.ScrolledWindow({
                    scrollable: true,
                    style_class: 'popup-scroller',
                });

                scrolledLabel.add(
                    new St.Label({
                        text: `
🔁 Reinicios totales: ${stats.total_sessions || stats.total || 0}
📈 Promedio semanal (últimos 7 días): ${stats.weekly_average_minutes ? Math.round(stats.weekly_average_minutes) : 'Data insuficiente'} minutos
📆 Promedio mensual (últimos 30 días): ${stats.monthly_average_minutes ? Math.round(stats.monthly_average_minutes) : 'Data insuficiente'} minutos
`,
                        y_align: St.ActorAlign.CENTER,
                    }),
                );

                dialog.content.add(scrolledLabel);

                // Refresh popup when dialog closes
                dialog.connect("closed", () => {
                    if (_._popup) _._popup.destroy();
                });
            })
            .catch(e => console.error("Error fetching stats:", e));
    };

    return popup;
}

export default {
    popup: createPopup(),
};
