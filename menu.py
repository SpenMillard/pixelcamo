"""
menu.py — Menu bar for Pixelcamo using PyWebView's native Menu API.

PyWebView 6.x provides Menu / MenuAction / MenuSeparator.
Pass build_menu(window) to webview.start(menu=...) in main.py.

Each action dispatches a 'pixelcamo:menu' CustomEvent into the webview;
App.tsx listens for this event and handles it.
"""

from __future__ import annotations
import threading
import webview
from webview.menu import Menu, MenuAction, MenuSeparator


def build_menu(window: webview.Window) -> list[Menu]:
    """Return the full menu structure for webview.start(menu=...)."""

    def dispatch(action: str):
        """Return a callback that fires the named action into the webview."""
        def _callback():
            js = (
                f"window.dispatchEvent("
                f"new CustomEvent('pixelcamo:menu', {{detail: {{action: '{action}'}}}})"
                f");"
            )
            # evaluate_js blocks on the main thread; run it in a worker thread
            # to avoid deadlocking when menu callbacks run on the main thread.
            threading.Thread(target=window.evaluate_js, args=(js,), daemon=True).start()
        return _callback

    return [
        Menu('File', [
            MenuAction('New',                    dispatch('new')),
            MenuAction('Open…',                  dispatch('open')),
            MenuSeparator(),
            MenuAction('Save',                   dispatch('save')),
            MenuAction('Save As…',               dispatch('save-as')),
            MenuSeparator(),
            MenuAction('Export…',                dispatch('export')),
            MenuAction('Export Tileable Set…',   dispatch('export-tile')),
        ]),
        Menu('Edit', [
            MenuAction('Reset Preset',           dispatch('reset-preset')),
            MenuSeparator(),
            MenuAction('Copy Seed',              dispatch('copy-seed')),
            MenuAction('Paste Seed',             dispatch('paste-seed')),
        ]),
        Menu('View', [
            MenuAction('Toggle Tile Guides',     dispatch('toggle-tile')),
            MenuAction('Toggle Harmony',         dispatch('toggle-harmony')),
            MenuSeparator(),
            MenuAction('Zoom In',                dispatch('zoom-in')),
            MenuAction('Zoom Out',               dispatch('zoom-out')),
            MenuAction('Actual Size',            dispatch('zoom-actual')),
            MenuAction('Fit to Window',          dispatch('zoom-fit')),
        ]),
        Menu('Pattern', [
            MenuAction('Regenerate',             dispatch('regenerate')),
            MenuAction('Randomise Seed',         dispatch('random-seed')),
            MenuSeparator(),
            Menu('Mode', [
                MenuAction('Camo',               dispatch('mode-camo')),
                MenuAction('Dazzle',             dispatch('mode-dazzle')),
                MenuAction('Blend',              dispatch('mode-blend')),
            ]),
        ]),
    ]
