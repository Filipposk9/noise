/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = "my-indicator-extension";

const { GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;

//TODO: dont take space when player is closed
//TODO: onClick show media player controls
//TODO: switch to typescript

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("My Shiny Indicator"));

      this._label = new St.Label({
        text: _("Now Playing"),
        // style_class: "main-text",
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: true,
      });

      this.add_child(this._label);

      // let item = new PopupMenu.PopupMenuItem(_("Show Notification"));
      // item.connect("activate", () => {
      //   Main.notify(_("Whatʼs up, folks?"));
      // });
      // this.menu.addMenuItem(item);

      this._updateSong();
    }

    _updateSong() {
      //TODO: make it work for all players

      let [success, out, err, status] = GLib.spawn_command_line_sync(
        "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.cider /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:org.mpris.MediaPlayer2.Player string:Metadata"
      );

      if (!success) {
        // this._label.text = _("Err1");
      }

      let output = out.toString();

      let artistMatch = output.match(
        /string\s+"xesam:artist"\s+variant\s+array\s+\[\s*string\s+"([^"]+)"/
      );
      let titleMatch = output.match(
        /string\s+"xesam:title"\s+variant\s+string\s+"([^"]+)"/
      );

      if (artistMatch && titleMatch) {
        let artist = artistMatch[1];
        let title = titleMatch[1];
        this._label.text = _(`${artist} - ${title}`);
      } else {
        this._label.text = _("Now Playing");
      }

      GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        5,
        Lang.bind(this, this._updateSong)
      );
    }
  }
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
