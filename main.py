"""
main.py — Pixelcamo entry point.

Launches a PyWebView window (native macOS title bar) serving the bundled
frontend from frontend/dist/index.html.

Run with:
    .venv/bin/python main.py
"""

from __future__ import annotations
import sys
from pathlib import Path

import webview

# Suppress PyWebView's auto-inserted Edit and View menus so our own
# File / Edit / View / Pattern appear in the correct order.
webview.settings['SHOW_DEFAULT_MENUS'] = False

from api import PixelcamoApi
from menu import build_menu  # returns list[webview.Menu] for webview.start(menu=...)


def _set_app_icon() -> None:
    """Set the dock icon from our .icns file (dev-mode run only; py2app uses iconfile in setup.py)."""
    try:
        from AppKit import NSApplication, NSImage
        icns = _HERE / 'static' / 'pixelcamo.icns'
        if icns.exists():
            img = NSImage.alloc().initWithContentsOfFile_(str(icns))
            if img:
                NSApplication.sharedApplication().setApplicationIconImage_(img)
    except Exception:
        pass

# Resolve the frontend dist path.
# When running as a py2app .app, __file__ is inside .app/Contents/Resources/
# which is exactly where setup.py copies frontend/dist/.
# When running from source, it's the repo root — same relative path works.
_HERE = Path(__file__).parent
_DIST = _HERE / 'frontend' / 'dist' / 'index.html'

# Fallback to dev server when dist hasn't been built yet
_URL = str(_DIST) if _DIST.exists() else 'http://localhost:5173'


def _on_loaded(window: webview.Window) -> None:
    """Fires once the webview has finished loading the page."""
    window.title = 'Pixelcamo — Untitled.pcm'
    _set_app_icon()


def main() -> None:
    api = PixelcamoApi()

    window = webview.create_window(
        title='Pixelcamo',
        url=_URL,
        js_api=api,
        width=1200,
        height=760,
        min_size=(960, 620),
        frameless=False,
        easy_drag=False,
        background_color='#0d0d0e',
    )

    window.events.loaded += _on_loaded

    webview.start(
        menu=build_menu(window),
        debug='--debug' in sys.argv,
    )


if __name__ == '__main__':
    main()
