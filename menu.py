"""
menu.py — Native macOS menu bar for Pixelcamo via PyObjC.

Call build_menu(window) after webview.start() is running (i.e. pass it as
the func argument to webview.start so it runs on the main thread).

Each menu item dispatches a 'pixelcamo:menu' CustomEvent into the webview:
    window.dispatchEvent(new CustomEvent('pixelcamo:menu', {detail: {action}}))

The frontend (App.tsx) listens for this event and acts accordingly.
"""

from __future__ import annotations
import threading
import objc
from AppKit import (
    NSApplication,
    NSMenu,
    NSMenuItem,
    NSEventModifierFlagCommand,
    NSEventModifierFlagShift,
    NSEventModifierFlagOption,
)
import webview


def _separator() -> NSMenuItem:
    return NSMenuItem.separatorItem()


# ---------------------------------------------------------------------------
# Menu delegate — handles all menu actions
# ---------------------------------------------------------------------------

class _MenuDelegate(objc.lookUpClass('NSObject')):
    """Receives menu item actions and dispatches CustomEvents to the webview."""

    def initWithWindow_(self, win):
        self = objc.super(_MenuDelegate, self).init()
        if self is None:
            return None
        self._win = win
        return self

    @objc.python_method
    def _dispatch(self, action: str) -> None:
        js = (
            f"window.dispatchEvent("
            f"new CustomEvent('pixelcamo:menu', {{detail: {{action: '{action}'}}}})"
            f");"
        )
        # evaluate_js blocks until the JS engine responds, which also needs
        # the main thread — calling it directly from a menu action (which runs
        # on the main thread) causes a deadlock.  Running it on a worker thread
        # avoids the deadlock without any observable latency difference.
        threading.Thread(target=self._win.evaluate_js, args=(js,), daemon=True).start()

    # ---- App menu ----
    def menuAbout_(self, sender) -> None:
        NSApplication.sharedApplication().orderFrontStandardAboutPanel_(sender)

    def menuPreferences_(self, sender) -> None:
        self._dispatch('preferences')

    def menuQuit_(self, sender) -> None:
        NSApplication.sharedApplication().terminate_(sender)

    # ---- File menu ----
    def menuNew_(self, sender) -> None:
        self._dispatch('new')

    def menuOpen_(self, sender) -> None:
        self._dispatch('open')

    def menuSave_(self, sender) -> None:
        self._dispatch('save')

    def menuSaveAs_(self, sender) -> None:
        self._dispatch('save-as')

    def menuExport_(self, sender) -> None:
        self._dispatch('export')

    def menuExportTileable_(self, sender) -> None:
        self._dispatch('export-tileable')

    # ---- Edit menu ----
    def menuUndo_(self, sender) -> None:
        self._dispatch('undo')

    def menuRedo_(self, sender) -> None:
        self._dispatch('redo')

    def menuResetPreset_(self, sender) -> None:
        self._dispatch('reset-preset')

    def menuCopySeed_(self, sender) -> None:
        self._dispatch('copy-seed')

    def menuPasteSeed_(self, sender) -> None:
        self._dispatch('paste-seed')

    # ---- View menu ----
    def menuToggleTile_(self, sender) -> None:
        self._dispatch('toggle-tile')

    def menuToggleHarmony_(self, sender) -> None:
        self._dispatch('toggle-harmony')

    def menuZoomIn_(self, sender) -> None:
        self._dispatch('zoom-in')

    def menuZoomOut_(self, sender) -> None:
        self._dispatch('zoom-out')

    def menuZoomActual_(self, sender) -> None:
        self._dispatch('zoom-actual')

    def menuZoomFit_(self, sender) -> None:
        self._dispatch('zoom-fit')

    # ---- Pattern menu ----
    def menuRegenerate_(self, sender) -> None:
        self._dispatch('regenerate')

    def menuRandomSeed_(self, sender) -> None:
        self._dispatch('random-seed')

    def menuModeCamo_(self, sender) -> None:
        self._dispatch('mode-camo')

    def menuModeDazzle_(self, sender) -> None:
        self._dispatch('mode-dazzle')

    def menuModeBlend_(self, sender) -> None:
        self._dispatch('mode-blend')


# ---------------------------------------------------------------------------
# Build the full menu bar
# ---------------------------------------------------------------------------

CMD = NSEventModifierFlagCommand
SHIFT = NSEventModifierFlagShift
OPT = NSEventModifierFlagOption


def _make_item(delegate, title: str, selector: str, key: str, mods: int) -> NSMenuItem:
    sel = objc.selector(None, selector=selector.encode(), isRequired=False)
    item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, sel, key)
    item.setKeyEquivalentModifierMask_(mods)
    item.setTarget_(delegate)
    return item


def build_menu(window: webview.Window) -> None:
    """
    Construct and install NSApp.mainMenu.
    Must be called on the main thread (pass as func to webview.start).
    """
    app = NSApplication.sharedApplication()
    delegate = _MenuDelegate.alloc().initWithWindow_(window)

    main_menu = NSMenu.alloc().init()

    # ── Pixelcamo ──────────────────────────────────────────────────────────
    app_menu_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Pixelcamo', None, '')
    app_menu = NSMenu.alloc().initWithTitle_('Pixelcamo')
    app_menu.addItem_(_make_item(delegate, 'About Pixelcamo', 'menuAbout:', '', CMD))
    app_menu.addItem_(_separator())
    app_menu.addItem_(_make_item(delegate, 'Preferences…', 'menuPreferences:', ',', CMD))
    app_menu.addItem_(_separator())
    app_menu.addItem_(_make_item(delegate, 'Quit Pixelcamo', 'menuQuit:', 'q', CMD))
    app_menu_item.setSubmenu_(app_menu)
    main_menu.addItem_(app_menu_item)

    # ── File ───────────────────────────────────────────────────────────────
    file_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('File', None, '')
    file_menu = NSMenu.alloc().initWithTitle_('File')
    file_menu.addItem_(_make_item(delegate, 'New', 'menuNew:', 'n', CMD))
    file_menu.addItem_(_make_item(delegate, 'Open…', 'menuOpen:', 'o', CMD))
    file_menu.addItem_(_separator())
    file_menu.addItem_(_make_item(delegate, 'Save', 'menuSave:', 's', CMD))
    file_menu.addItem_(_make_item(delegate, 'Save As…', 'menuSaveAs:', 'S', CMD | SHIFT))
    file_menu.addItem_(_separator())
    file_menu.addItem_(_make_item(delegate, 'Export…', 'menuExport:', 'e', CMD))
    file_menu.addItem_(_make_item(delegate, 'Export Tileable Set…', 'menuExportTileable:', 'E', CMD | SHIFT))
    file_item.setSubmenu_(file_menu)
    main_menu.addItem_(file_item)

    # ── Edit ───────────────────────────────────────────────────────────────
    edit_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Edit', None, '')
    edit_menu = NSMenu.alloc().initWithTitle_('Edit')
    edit_menu.addItem_(_make_item(delegate, 'Undo', 'menuUndo:', 'z', CMD))
    edit_menu.addItem_(_make_item(delegate, 'Redo', 'menuRedo:', 'Z', CMD | SHIFT))
    edit_menu.addItem_(_separator())
    edit_menu.addItem_(_make_item(delegate, 'Reset Preset', 'menuResetPreset:', 'r', CMD | OPT))
    edit_menu.addItem_(_make_item(delegate, 'Copy Seed', 'menuCopySeed:', 'c', CMD | OPT))
    edit_menu.addItem_(_make_item(delegate, 'Paste Seed', 'menuPasteSeed:', 'v', CMD | OPT))
    edit_item.setSubmenu_(edit_menu)
    main_menu.addItem_(edit_item)

    # ── View ───────────────────────────────────────────────────────────────
    view_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('View', None, '')
    view_menu = NSMenu.alloc().initWithTitle_('View')
    view_menu.addItem_(_make_item(delegate, 'Toggle Tile Guides', 'menuToggleTile:', 't', CMD))
    view_menu.addItem_(_make_item(delegate, 'Toggle Harmony Section', 'menuToggleHarmony:', 'h', CMD | OPT))
    view_menu.addItem_(_separator())
    view_menu.addItem_(_make_item(delegate, 'Zoom In', 'menuZoomIn:', '=', CMD))
    view_menu.addItem_(_make_item(delegate, 'Zoom Out', 'menuZoomOut:', '-', CMD))
    view_menu.addItem_(_make_item(delegate, 'Actual Size', 'menuZoomActual:', '0', CMD))
    view_menu.addItem_(_make_item(delegate, 'Fit to Window', 'menuZoomFit:', '9', CMD))
    view_item.setSubmenu_(view_menu)
    main_menu.addItem_(view_item)

    # ── Pattern ────────────────────────────────────────────────────────────
    pattern_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Pattern', None, '')
    pattern_menu = NSMenu.alloc().initWithTitle_('Pattern')
    pattern_menu.addItem_(_make_item(delegate, 'Regenerate', 'menuRegenerate:', 'r', CMD))
    pattern_menu.addItem_(_make_item(delegate, 'Randomise Seed', 'menuRandomSeed:', ' ', 0))
    pattern_menu.addItem_(_separator())

    # Mode submenu
    mode_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Mode', None, '')
    mode_menu = NSMenu.alloc().initWithTitle_('Mode')
    mode_menu.addItem_(_make_item(delegate, 'Camo', 'menuModeCamo:', '1', CMD))
    mode_menu.addItem_(_make_item(delegate, 'Dazzle', 'menuModeDazzle:', '2', CMD))
    mode_menu.addItem_(_make_item(delegate, 'Blend', 'menuModeBlend:', '3', CMD))
    mode_item.setSubmenu_(mode_menu)
    pattern_menu.addItem_(mode_item)

    pattern_item.setSubmenu_(pattern_menu)
    main_menu.addItem_(pattern_item)

    # ── Window (standard) ──────────────────────────────────────────────────
    window_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Window', None, '')
    window_menu = NSMenu.alloc().initWithTitle_('Window')
    window_menu.addItem_(
        NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Minimise', 'performMiniaturize:', 'm')
    )
    window_menu.addItem_(
        NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Zoom', 'performZoom:', '')
    )
    window_item.setSubmenu_(window_menu)
    main_menu.addItem_(window_item)
    app.setWindowsMenu_(window_menu)

    # ── Help (standard) ────────────────────────────────────────────────────
    help_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Help', None, '')
    help_menu = NSMenu.alloc().initWithTitle_('Help')
    help_item.setSubmenu_(help_menu)
    main_menu.addItem_(help_item)
    app.setHelpMenu_(help_menu)

    app.setMainMenu_(main_menu)
    # Keep delegate alive — store on app to prevent GC
    app._pixelcamo_menu_delegate = delegate
