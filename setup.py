"""
setup.py — py2app build configuration for Pixelcamo.

Build the standalone .app:
    .venv/bin/python setup.py py2app

Output: dist/Pixelcamo.app
"""

from setuptools import setup

APP = ['main.py']

# Data files bundled inside the .app's Resources/
DATA_FILES = [
    # Bundled frontend (Vite build output)
    ('frontend/dist', [
        'frontend/dist/index.html',
    ]),
    ('frontend/dist/assets', [
        f'frontend/dist/assets/{f}'
        for f in __import__('os').listdir('frontend/dist/assets')
    ]),
]

OPTIONS = {
    'iconfile': 'static/pixelcamo.icns',

    # Packages py2app should include wholesale
    'packages': [
        'webview',
        'PIL',
        'numpy',
        'reportlab',
        'blend_modes',
        'objc',
        'AppKit',
        'Foundation',
        'Cocoa',
        'Quartz',
    ],

    # Individual modules that py2app misses via static analysis
    'includes': [
        'renderer',
        'api',
        'menu',
        'bottle',
        'proxy_tools',
        'typing_extensions',
        'importlib.metadata',
    ],

    # Frameworks / dylibs to copy in
    'frameworks': [],

    # Suppress the macOS dock icon bounce and standard menu setup
    # (we build our own NSMenu in menu.py)
    'plist': {
        'CFBundleName': 'Pixelcamo',
        'CFBundleDisplayName': 'Pixelcamo',
        'CFBundleIdentifier': 'com.pixelcamo.app',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0',
        'NSHumanReadableCopyright': '© 2024 Pixelcamo',
        'NSHighResolutionCapable': True,
        'LSMinimumSystemVersion': '12.0',
        # Allow reading/writing documents anywhere the user chooses
        'NSDocumentsFolderUsageDescription': 'Pixelcamo saves pattern files here.',
        'NSDesktopFolderUsageDescription': 'Pixelcamo can save exports to the Desktop.',
        # Hide from dock when running as an agent — NOT set: we want a regular app
    },

    # Strip debug symbols for a smaller bundle
    'strip': True,

    # Don't use a zip archive — keeps Resources readable and avoids some
    # pywebview path issues when loading dist/index.html
    'no_chdir': True,
}

setup(
    name='Pixelcamo',
    app=APP,
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
