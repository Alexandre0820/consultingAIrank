#!/usr/bin/env python3
"""AI咨询行动榜 standalone MVP server.

This project is intentionally separated from the AI 咨询知识分身 MVP.
It serves only the AI consulting action leaderboard files.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
DATA_DIR = APP_DIR / "data"
DATA_PATH = DATA_DIR / "ai-consulting-leaderboard.json"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def send_file(self, path: Path, content_type: str):
        try:
            body = path.read_bytes()
        except FileNotFoundError:
            self.send_error(404, "File not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path in ("/", "/index.html"):
            self.send_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return

        if parsed.path in ("/styles.css", "/app.js", "/static/styles.css", "/static/app.js"):
            asset_relative = parsed.path.removeprefix("/static/").lstrip("/")
            asset_path = STATIC_DIR / asset_relative
            content_type = "text/css; charset=utf-8" if parsed.path.endswith(".css") else "text/javascript; charset=utf-8"
            self.send_file(asset_path, content_type)
            return

        if parsed.path in ("/api/leaderboard", "/data/ai-consulting-leaderboard.json"):
            try:
                payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
            except Exception as exc:
                self.send_json({"error": "data_load_failed", "message": str(exc)}, status=500)
                return
            self.send_json(payload)
            return

        if parsed.path == "/api/health":
            try:
                payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
            except Exception as exc:
                payload = {"error": str(exc)}
            self.send_json({
                "ok": True,
                "project": "AI咨询行动榜",
                "companies": len(payload.get("companies", [])),
                "dimensions": len(payload.get("dimensions", [])),
                "event_types": len(payload.get("event_types", [])),
            })
            return

        self.send_json({"error": "not_found", "path": parsed.path}, status=404)


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8765"))
    try:
        server = ReusableThreadingHTTPServer((host, port), Handler)
    except OSError as exc:
        print(f"启动失败：无法监听 {host}:{port}。错误：{exc}", flush=True)
        print("如果是端口被占用，请改用：PORT=8766 python3 app.py", flush=True)
        raise

    print(f"AI咨询行动榜 MVP: http://127.0.0.1:{port}", flush=True)
    print(f"Project: {APP_DIR}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
