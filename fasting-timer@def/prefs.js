import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SmokeTimerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.smoke-timer');

        const page = new Adw.PreferencesPage({
            title: 'Temporizador',
            icon_name: 'preferences-system-symbolic'
        });
        window.add(page);

        // --- Apariencia ---
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Apariencia',
            description: 'Personaliza el aspecto del temporizador en el panel'
        });
        page.add(appearanceGroup);

        // Emoji
        const emojiRow = new Adw.ActionRow({
            title: 'Emoji',
            subtitle: 'Emoji que se muestra en el panel'
        });

        const emojiEntry = new Gtk.Entry({
            text: settings.get_string('timer-emoji'),
            placeholder_text: '🍕',
            valign: Gtk.Align.CENTER,
            width_chars: 4,
            max_length: 2
        });

        emojiEntry.connect('changed', () => {
            const val = emojiEntry.get_text();
            if (val.trim() !== '') {
                settings.set_string('timer-emoji', val.trim());
            }
        });

        emojiRow.add_suffix(emojiEntry);
        appearanceGroup.add(emojiRow);

        // Formato de tiempo
        const formats = [
            { id: 'minutes', label: '73m',   example: 'Solo minutos' },
            { id: 'hours',   label: '1h13m', example: 'Horas y minutos' },
            { id: 'clock',   label: '1:13',  example: 'Formato reloj' },
            { id: 'prime',   label: "73'",   example: 'Minutos con primo' },
        ];

        const formatGroup = new Adw.PreferencesGroup({
            title: 'Formato de tiempo',
            description: 'Cómo se muestra el temporizador en el panel'
        });
        page.add(formatGroup);

        const currentFormat = settings.get_string('time-format');
        const checks = [];

        formats.forEach(fmt => {
            const row = new Adw.ActionRow({
                title: fmt.label,
                subtitle: fmt.example
            });

            const check = new Gtk.CheckButton({
                valign: Gtk.Align.CENTER,
                active: currentFormat === fmt.id
            });

            check.connect('toggled', () => {
                if (check.get_active()) {
                    settings.set_string('time-format', fmt.id);
                    checks.forEach(c => { if (c !== check) c.set_active(false); });
                }
            });

            checks.push(check);
            row.add_suffix(check);
            row.set_activatable_widget(check);
            formatGroup.add(row);
        });

        // --- Estadísticas ---
        const dateGroup = new Adw.PreferencesGroup({
            title: 'Estadísticas',
            description: 'Fecha de inicio para el cálculo de promedios'
        });
        page.add(dateGroup);

        const dateRow = new Adw.ActionRow({
            title: 'Fecha de inicio',
            subtitle: 'Formato DD/MM/YYYY'
        });

        const dateEntry = new Gtk.Entry({
            text: this._toDisplayDate(settings.get_string('start-date')),
            placeholder_text: 'DD/MM/YYYY',
            valign: Gtk.Align.CENTER,
            width_chars: 12
        });

        const dateStatus = new Gtk.Label({
            label: '',
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label']
        });

        dateEntry.connect('changed', () => {
            const val = dateEntry.get_text();
            if (this._isValidDate(val)) {
                settings.set_string('start-date', this._toISODate(val));
                dateStatus.set_label('✓');
                dateStatus.remove_css_class('error');
            } else {
                dateStatus.set_label('Formato inválido');
                dateStatus.add_css_class('error');
            }
        });

        dateRow.add_suffix(dateStatus);
        dateRow.add_suffix(dateEntry);
        dateGroup.add(dateRow);
    }

    _isValidDate(str) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
        const [day, month, year] = str.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
               date.getMonth() === month - 1 &&
               date.getDate() === day;
    }

    _toISODate(str) {
        const [day, month, year] = str.split('/');
        return `${year}-${month}-${day}`;
    }

    _toDisplayDate(str) {
        if (!str || !str.includes('-')) return '';
        const [year, month, day] = str.split('-');
        return `${day}/${month}/${year}`;
    }
}
