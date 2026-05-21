"""
api.py — PyWebView JS bridge for Pixelcamo.

Methods exposed via window.pywebview.api.*
All methods are called from the frontend JS and run on the Python side.
"""

from __future__ import annotations
import io
import json
import os
import subprocess
import traceback
from pathlib import Path
from typing import TYPE_CHECKING

import webview

from renderer import render_pattern, verify_seamless

if TYPE_CHECKING:
    pass

# Most-recently-used list stored beside main.py
_MRU_PATH = Path(__file__).parent / '.pixelcamo_mru.json'
_MAX_MRU = 10


def _load_mru() -> list[str]:
    try:
        return json.loads(_MRU_PATH.read_text())
    except Exception:
        return []


def _save_mru(paths: list[str]) -> None:
    try:
        _MRU_PATH.write_text(json.dumps(paths))
    except Exception:
        pass


def _push_mru(path: str) -> None:
    paths = _load_mru()
    if path in paths:
        paths.remove(path)
    paths.insert(0, path)
    _save_mru(paths[:_MAX_MRU])


def _save_dialog_path(result) -> str:
    """
    PyWebView's create_file_dialog returns a plain str for SAVE dialogs and a
    tuple for OPEN dialogs.  Normalise both to a single path string or ''.
    """
    if not result:
        return ''
    return result if isinstance(result, str) else result[0]


class PixelcamoApi:
    """Callable from window.pywebview.api.* in the frontend."""

    def open_document(self) -> dict | None:
        """Open a file dialog and return the parsed .pcm document, or None."""
        window = webview.windows[0]
        paths = window.create_file_dialog(
            webview.FileDialog.OPEN,
            allow_multiple=False,
            file_types=('Pixelcamo Pattern (*.pcm)',),
        )
        if not paths:
            return None
        path = paths[0]
        try:
            doc = json.loads(Path(path).read_text(encoding='utf-8'))
            doc['_path'] = path
            _push_mru(path)
            return doc
        except Exception as exc:
            return {'_error': str(exc)}

    def save_document(self, doc: dict) -> str:
        """
        Save doc to disk.  If doc has '_path', overwrite it; otherwise open
        a Save dialog.  Returns the saved path, or '' on cancel/error.
        """
        window = webview.windows[0]
        existing_path: str = doc.pop('_path', '') or ''
        dirty_doc = {k: v for k, v in doc.items() if not k.startswith('_')}

        if existing_path and Path(existing_path).exists():
            save_path = existing_path
        else:
            result = window.create_file_dialog(
                webview.FileDialog.SAVE,
                save_filename='Untitled.pcm',
                file_types=('Pixelcamo Pattern (*.pcm)',),
            )
            save_path = _save_dialog_path(result)

        if not save_path:
            return ''

        if not save_path.endswith('.pcm'):
            save_path += '.pcm'

        try:
            Path(save_path).write_text(
                json.dumps(dirty_doc, indent=2), encoding='utf-8'
            )
            _push_mru(save_path)
            return save_path
        except Exception as exc:
            return ''

    def export_pattern(self, doc: dict, opts: dict) -> str:
        """
        Render and save the pattern.  opts: {width, height, dpi, format}.
        For tileable export, also accepts opts: {tileable_suffix: True}.
        Returns the saved path, or '' on cancel/error.
        """
        window = webview.windows[0]
        tileable = bool(opts.get('tileable_suffix', False))

        # Tileable export is always PNG; force tile=True in the doc
        if tileable:
            doc = dict(doc)
            doc['tile'] = True
            fmt = 'PNG'
        else:
            fmt = str(opts.get('format', 'PNG')).upper()

        ext = '.pdf' if fmt == 'PDF' else '.png'

        # Work out a default filename from the doc path or preset
        base_name = 'Untitled'
        if doc.get('_path'):
            base_name = Path(doc['_path']).stem
        elif doc.get('preset') and doc['preset'] != '— Custom —':
            base_name = doc['preset'].replace(' ', '_')

        # Append _tile suffix for tileable exports
        if tileable:
            base_name = f'{base_name}_tile'

        result = window.create_file_dialog(
            webview.FileDialog.SAVE,
            save_filename=f'{base_name}{ext}',
            file_types=(
                ('PDF Document (*.pdf)',) if fmt == 'PDF'
                else ('PNG Image (*.png)',)
            ),
        )
        save_path = _save_dialog_path(result)
        if not save_path:
            return ''

        if not save_path.lower().endswith(ext):
            save_path += ext

        try:
            img = render_pattern(doc, opts)

            # Seam verification for tileable exports at passes=3
            seam_warning = False
            if tileable:
                passes = int(doc.get('params', {}).get('passes', 2))
                if passes >= 3:
                    if not verify_seamless(img):
                        seam_warning = True
                        print('⚠ Tileable export: seam verification failed — edges do not match within tolerance')

            if fmt == 'PDF':
                _save_pdf(img, save_path, opts)
            else:
                img.save(save_path, 'PNG', dpi=(opts.get('dpi', 300), opts.get('dpi', 300)))

            return save_path if not seam_warning else f'{save_path}::seam_warning'
        except Exception:
            traceback.print_exc()
            return ''

    def save_palette(self, colors: list) -> str:
        """Save a palette to a .json file. Returns saved path or ''."""
        window = webview.windows[0]
        result = window.create_file_dialog(
            webview.FileDialog.SAVE,
            save_filename='palette.json',
            file_types=('Palette (*.json)',),
        )
        save_path = _save_dialog_path(result)
        if not save_path:
            return ''
        if not save_path.endswith('.json'):
            save_path += '.json'
        try:
            Path(save_path).write_text(json.dumps(colors, indent=2), encoding='utf-8')
            return save_path
        except Exception:
            return ''

    def load_palette(self) -> list | None:
        """Open a palette .json file and return a color array, or None."""
        window = webview.windows[0]
        paths = window.create_file_dialog(
            webview.FileDialog.OPEN,
            allow_multiple=False,
            file_types=('Palette (*.json)',),
        )
        if not paths:
            return None
        try:
            data = json.loads(Path(paths[0]).read_text(encoding='utf-8'))
            if isinstance(data, list) and all(isinstance(c, str) for c in data):
                return data
            return None
        except Exception:
            return None

    def get_recent(self) -> list[str]:
        """Return list of recently opened/saved .pcm paths (existing files only)."""
        return [p for p in _load_mru() if Path(p).exists()]

    def reveal_in_finder(self, path: str) -> None:
        """Select the given file in Finder."""
        subprocess.run(['open', '-R', path], check=False)


# ---------------------------------------------------------------------------
# PDF helper
# ---------------------------------------------------------------------------

def _save_pdf(img, path: str, opts: dict) -> None:
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.utils import ImageReader

    dpi = int(opts.get('dpi', 300))
    width_px = img.width
    height_px = img.height

    # Convert pixels → points (1 pt = 1/72 inch; 1 inch = dpi px)
    width_pt = width_px / dpi * 72
    height_pt = height_px / dpi * 72

    page_size = (width_pt, height_pt)
    c = rl_canvas.Canvas(path, pagesize=page_size)

    # ImageReader wraps a BytesIO so ReportLab can read it
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    buf.seek(0)

    c.drawImage(
        ImageReader(buf), 0, 0,
        width=width_pt, height=height_pt,
        preserveAspectRatio=False,
    )
    c.save()
