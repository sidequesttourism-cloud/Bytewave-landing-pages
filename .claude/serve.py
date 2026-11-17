"""Local preview server for the ByteWave site.

Serves a folder like `python -m http.server`, plus GitHub Pages' clean URLs: a request for /start (no extension)
is answered with start.html when that file exists. Files are sent with no-cache headers so edits show up on a
normal reload.

Usage: python serve.py [port] [folder]
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not os.path.splitext(path)[1] and os.path.isfile(path + '.html'):
            base, _, rest = self.path.partition('?')
            self.path = base + '.html' + (('?' + rest) if rest else '')
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    folder = sys.argv[2] if len(sys.argv) > 2 else '.'
    handler = partial(CleanUrlHandler, directory=folder)
    print(f'Serving {os.path.abspath(folder)} at http://localhost:{port}', flush=True)
    ThreadingHTTPServer(('', port), handler).serve_forever()
