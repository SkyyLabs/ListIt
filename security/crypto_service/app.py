"""HTTP entrypoint for the local crypto service."""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from security.local_kms.local_key_manager import LocalKeyManager

from .auth import is_authorized
from .config import load_config
from .routes import handle_decrypt, handle_encrypt, handle_json_request


def create_handler(config, key_manager):
    """Build a request handler bound to config and a key manager instance."""

    class CryptoRequestHandler(BaseHTTPRequestHandler):
        server_version = 'ListerCryptoService/1.0'

        def _write_json(self, status_code: int, response_body: bytes) -> None:
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)

        def do_GET(self) -> None:  # noqa: N802
            if self.path == '/health':
                self._write_json(200, b'{"status":"ok"}')
                return
            self._write_json(404, b'{"error":"Not found"}')

        def do_POST(self) -> None:  # noqa: N802
            if not is_authorized(self.headers, config):
                self._write_json(401, b'{"error":"Unauthorized"}')
                return

            try:
                content_length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                self._write_json(400, b'{"error":"Invalid Content-Length"}')
                return

            body = self.rfile.read(content_length)
            if self.path == '/v1/encrypt':
                status_code, response_body = handle_json_request(
                    body,
                    action=lambda parsed_body: handle_encrypt(parsed_body, key_manager),
                )
                self._write_json(status_code, response_body)
                return

            if self.path == '/v1/decrypt':
                status_code, response_body = handle_json_request(
                    body,
                    action=lambda parsed_body: handle_decrypt(parsed_body, key_manager),
                )
                self._write_json(status_code, response_body)
                return

            self._write_json(404, b'{"error":"Not found"}')

        def log_message(self, format, *args):  # noqa: A003
            # Do not log request bodies or other potentially sensitive data.
            return

    return CryptoRequestHandler


def run_server() -> None:
    """Run the local crypto service."""
    config = load_config()
    key_manager = LocalKeyManager(
        config.master_key_file,
        env_var_name=config.env_var_name,
    )
    server = ThreadingHTTPServer(
        (config.host, config.port),
        create_handler(config, key_manager),
    )
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == '__main__':
    run_server()
