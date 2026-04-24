import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const BASE_URL      = 'http://localhost:3001';
const GLITCH_CHARS  = '!@#$%^&*0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>?/\\|~`';
const GLITCH_TARGET = 'Pizza';
const GLITCH_MS     = 70;

function randomChar() {
    return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
}

function glitchFrame(frame) {
    if (frame % 60 < 2) return GLITCH_TARGET;
    let text = '';
    for (let i = 0; i < GLITCH_TARGET.length; i++) {
        text += Math.random() < 0.08 ? GLITCH_TARGET[i] : randomChar();
    }
    return text;
}

function formatTime(totalSeconds, format) {
    const mins = Math.floor(Math.abs(totalSeconds) / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    switch (format) {
        case 'hours':
            if (hours === 0) return `${mins}m`;
            return `${hours}h${String(remainingMins).padStart(2, '0')}m`;
        case 'clock':
            if (hours === 0) return `${mins}:00`;
            return `${hours}:${String(remainingMins).padStart(2, '0')}`;
        case 'prime':
            return `${mins}'`;
        case 'minutes':
        default:
            return `${mins}m`;
    }
}

function fetchStats(callback) {
    try {
        const session = new Soup.Session();
        const message = Soup.Message.new('GET', `${BASE_URL}/api/stats`);

        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (sess, result) => {
            try {
                const bytes = sess.send_and_read_finish(result);
                if (message.get_status() !== Soup.Status.OK) {
                    callback(null);
                    return;
                }
                const text = new TextDecoder().decode(bytes.get_data());
                callback(JSON.parse(text));
            } catch (e) {
                console.error(`SmokeTimer: parse error: ${e.message}`);
                callback(null);
            }
        });
    } catch (e) {
        console.error(`SmokeTimer: fetch error: ${e.message}`);
        callback(null);
    }
}

export default class SmokeTimerExtension extends Extension {
    enable() {
        this._settings = this.getSettings('org.gnome.shell.extensions.smoke-timer');

        this._settingsChangedId = this._settings.connect('changed', () => {
            this._refreshStats();
        });

        this._indicator = new PanelMenu.Button(0.0, 'SmokeTimer', false);

        this._label = new St.Label({
            text: this._getEmoji(),
            y_align: Clutter.ActorAlign.CENTER
        });
        this._label.set_style('color: #00FF00; font-size: 1.2em; font-weight: bold; padding: 0 6px;');
        this._indicator.add_child(this._label);

        // --- Menu ---
        this._menuSection = new PopupMenu.PopupMenuSection();
        this._indicator.menu.addMenuItem(this._menuSection);

        this._itemInterval = new PopupMenu.PopupMenuItem('⏱ Intervalo: cargando...', { reactive: false });
        this._menuSection.addMenuItem(this._itemInterval);

        this._menuSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._itemTotal    = new PopupMenu.PopupMenuItem('Cargando...', { reactive: false });
        this._itemAvgWeek  = new PopupMenu.PopupMenuItem('', { reactive: false });
        this._itemAvgMonth = new PopupMenu.PopupMenuItem('', { reactive: false });
        this._menuSection.addMenuItem(this._itemTotal);
        this._menuSection.addMenuItem(this._itemAvgWeek);
        this._menuSection.addMenuItem(this._itemAvgMonth);

        this._indicator.menu.connect('open-state-changed', (menu, open) => {
            if (open) this._refreshStats();
        });

        this._clickId = this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) {
                this._startTimer();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        Main.panel.addToStatusArea('smoke-timer', this._indicator);

        this._timerId        = null;
        this._glitchId       = null;
        this._timerStart     = null;
        this._lastKnownElapsed = 0;

        // Detector de drift — resincroniza tras suspensión/bloqueo
        this._syncId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
            if (!this._timerStart) return GLib.SOURCE_CONTINUE;

            const realElapsed = Math.floor((Date.now() - this._timerStart) / 1000);
            const drift = Math.abs(realElapsed - this._lastKnownElapsed);

            if (drift > 10) {
                if (this._timerId) {
                    GLib.Source.remove(this._timerId);
                    this._timerId = null;
                }
                this._restoreState();
            }

            return GLib.SOURCE_CONTINUE;
        });

        this._restoreState();
    }

    _getEmoji() {
        return this._settings.get_string('timer-emoji') || '🍕';
    }

    _getStartDate() {
        const iso = this._settings.get_string('start-date');
        return new Date(iso);
    }

    _getFormat() {
        return this._settings.get_string('time-format');
    }

    _startGlitch() {
        this._stopGlitch();
        this._isGlitching = true;
        this._glitchFrame = 0;
        this._label.set_style('color: #888888; font-size: 1.0em; font-weight: bold; padding: 0 6px;');
        this._glitchId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, GLITCH_MS, () => {
            if (!this._isGlitching || !this._label) return GLib.SOURCE_REMOVE;
            this._label.set_text(glitchFrame(this._glitchFrame++));
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopGlitch() {
        if (this._glitchId) {
            GLib.Source.remove(this._glitchId);
            this._glitchId = null;
        }
        this._isGlitching = false;
    }

    _restoreState() {
        this._startGlitch();

        fetchStats((stats) => {
            this._stopGlitch();

            if (!stats || !stats.latest_data) {
                this._setIdle();
                return;
            }

            if (stats.duration_minutes) {
                this._tiempoEspera = stats.duration_minutes * 60;
                this._itemInterval.label.set_text(`⏱ Intervalo: ${stats.duration_minutes} minutos`);
            }

            const lastClick   = new Date(stats.latest_data.timestamp);
            const elapsedSecs = Math.floor((Date.now() - lastClick.getTime()) / 1000);

            this._timerStart       = lastClick.getTime();
            this._lastKnownElapsed = elapsedSecs;

            this._resumeTimer(elapsedSecs);
            this._refreshStats();
        });
    }

    _setIdle() {
        this._label.set_text(this._getEmoji());
        this._label.set_style('color: #00FF00; font-size: 1.2em; font-weight: bold; padding: 0 6px;');
        this._timerStart       = null;
        this._lastKnownElapsed = 0;
    }

    _resumeTimer(startingElapsed) {
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
        }

        let totalElapsed = startingElapsed;

        const updateDisplay = () => {
            const fmt   = this._getFormat();
            const emoji = this._getEmoji();

            if (totalElapsed < this._tiempoEspera) {
                const remaining = this._tiempoEspera - totalElapsed;
                this._label.set_style('color: #FF0000; font-size: 1.2em; font-weight: bold; padding: 0 6px;');
                this._label.set_text(`${emoji} ${formatTime(remaining, fmt)}`);
            } else {
                const countUp = totalElapsed - this._tiempoEspera;
                this._label.set_style('color: #00FF00; font-size: 1.2em; font-weight: bold; padding: 0 6px;');
                this._label.set_text(`${emoji} ${formatTime(countUp, fmt)}`);
            }
        };

        updateDisplay();

        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            totalElapsed++;
            this._lastKnownElapsed = totalElapsed;
            updateDisplay();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _refreshStats() {
        fetchStats((stats) => {
            if (!stats) {
                this._itemTotal.label.set_text('⚠️ Backend no disponible');
                this._itemAvgWeek.label.set_text('');
                this._itemAvgMonth.label.set_text('');
                return;
            }

            if (stats.duration_minutes) {
                this._tiempoEspera = stats.duration_minutes * 60;
                this._itemInterval.label.set_text(`⏱ Intervalo: ${stats.duration_minutes} minutos`);
            }

            const startDate = this._getStartDate();
            const d = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const fmt = this._getFormat();
            const week  = stats.weekly_average_minutes  != null ? formatTime(stats.weekly_average_minutes  * 60, fmt) : '---';
            const month = stats.monthly_average_minutes != null ? formatTime(stats.monthly_average_minutes * 60, fmt) : '---';

            this._itemTotal.label.set_text(`🔁 Reinicios totales: ${stats.total_sessions}`);
            this._itemAvgWeek.label.set_text(`📅 Media 7 días (desde ${d}): ${week}`);
            this._itemAvgMonth.label.set_text(`📆 Media 30 días (desde ${d}): ${month}`);
        });
    }

    _startTimer() {
        if (this._timerStart !== null) {
            const elapsed = Math.floor((Date.now() - this._timerStart) / 1000);
            try {
                const session = new Soup.Session();
                const message = Soup.Message.new('POST', `${BASE_URL}/api/end`);
                const body = JSON.stringify({ interval: elapsed });
                message.set_request_body_from_bytes(
                    'application/json',
                    new GLib.Bytes(new TextEncoder().encode(body))
                );
                session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, () => {});
            } catch (e) {
                console.error(`SmokeTimer: log error: ${e.message}`);
            }
        }

        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
        }

        this._timerStart       = Date.now();
        this._lastKnownElapsed = 0;
        this._label.set_style('color: #FF0000; font-size: 1.2em; font-weight: bold; padding: 0 6px;');
        this._label.set_text(`${this._getEmoji()} ${formatTime(this._tiempoEspera, this._getFormat())}`);

        this._resumeTimer(0);
    }

    disable() {
        this._stopGlitch();
        if (this._syncId) {
            GLib.Source.remove(this._syncId);
            this._syncId = null;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings        = null;
        this._timerStart      = null;
        this._lastKnownElapsed = 0;
    }
}