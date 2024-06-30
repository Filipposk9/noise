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

const { GObject, St, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;

//TODO: dont take space when player is closed
//TODO: add settings to show/hide all the above & position elements
//TODO: play/pause icon switch
//TODO: detect multiple open players
//TODO: switch to typescript

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("My Shiny Indicator"));

      this._label = new St.Label({
        text: _("Now Playing"),
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: true,
      });

      this.add_child(this._label);

      this._createIconBox();

      this._updateSong();
    }

    _createIconBox() {
      this._albumArtBox = new St.BoxLayout({
        style_class: "album-art-boxlayout",
        x_expand: true,
        y_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
      });

      this._albumArtIcon = new St.Icon({
        icon_size: 130,
        style_class: "album-art-icon",
        x_expand: true,
        y_expand: true,
      });

      this._albumArtBox.add_child(this._albumArtIcon);

      this._iconBox = new St.BoxLayout({
        style_class: "media-control-boxlayout",
        x_expand: true,
        y_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.END,
      });

      this._previousIcon = new St.Icon({
        icon_name: "media-skip-backward-symbolic",
        icon_size: 32,
        style_class: "icon",
      });
      let previousButton = new St.Button({
        child: this._previousIcon,
        style_class: "media-control-button",
      });
      previousButton.connect("clicked", () => {
        GLib.spawn_command_line_async(
          "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.cider /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Previous"
        );
      });
      this._iconBox.add_child(previousButton);

      this._playPauseIcon = new St.Icon({
        icon_name: "media-playback-start-symbolic",
        icon_size: 32,
        style_class: "icon",
      });
      let playPauseButton = new St.Button({
        child: this._playPauseIcon,
        style_class: "media-control-button",
      });
      playPauseButton.connect("clicked", () => {
        GLib.spawn_command_line_async(
          "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.cider /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.PlayPause"
        );
      });
      this._iconBox.add_child(playPauseButton);

      this._nextIcon = new St.Icon({
        icon_name: "media-skip-forward-symbolic",
        icon_size: 32,
        style_class: "icon",
      });
      let nextButton = new St.Button({
        child: this._nextIcon,
        style_class: "media-control-button",
      });
      nextButton.connect("clicked", () => {
        GLib.spawn_command_line_async(
          "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.cider /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Next"
        );
      });
      this._iconBox.add_child(nextButton);

      this.menu.box.style_class = "media-control-box";
      this.menu.box.x_expand = true;
      this.menu.box.y_expand = true;
      this.menu.box.vertical = true;

      this.menu.box.add(this._albumArtBox);
      this.menu.box.add(this._iconBox);
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

      let albumArtMatch = output.match(
        /string\s+"mpris:artUrl"\s+variant\s+string\s+"(https[^"]+)"/
      );

      if (artistMatch && titleMatch && albumArtMatch) {
        let artist = artistMatch[1];
        let title = titleMatch[1];
        this._label.text = _(`${artist} - ${title}`);

        this._albumArtIcon.gicon = Gio.icon_new_for_string(albumArtMatch[1]);
      } else {
        this._label.text = _("Now Playing");
      }

      GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        3,
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
    Main.panel.addToStatusArea(this._uuid, this._indicator, 0, "left");
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
