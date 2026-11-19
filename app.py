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

    STATIC_CONTENT_TYPES = {
        ".html": "text/html; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".json": "application/json; charset=utf-8",
    }

    def send_static_asset(self, relative: str):
        """安全地提供 static/ 下由构建脚本生成的文件（公司追踪页、llms.txt、robots.txt）。"""
        asset_path = (STATIC_DIR / relative).resolve()
        try:
            asset_path.relative_to(STATIC_DIR.resolve())
        except ValueError:
            self.send_error(404, "File not found")
            return
        if not asset_path.is_file():
            self.send_error(404, "File not found")
            return
        content_type = self.STATIC_CONTENT_TYPES.get(asset_path.suffix)
        if not content_type:
            self.send_error(404, "File not found")
            return
        self.send_file(asset_path, content_type)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path in ("/", "/index.html"):
            self.send_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return

        if parsed.path in ("/companies", "/companies/"):
            self.send_static_asset("companies/index.html")
            return

        if parsed.path.startswith("/companies/"):
            self.send_static_asset(parsed.path.removeprefix("/"))
            return

        if parsed.path in ("/robots.txt", "/llms.txt"):
            self.send_static_asset(parsed.path.lstrip("/"))
            return

        # 与 Netlify（publish = "."）保持一致：/static/<path> 直接映射到 static/ 目录。
        if parsed.path.startswith("/static/"):
            self.send_static_asset(parsed.path.removeprefix("/static/"))
            return

        # 顶层静态页面与脚本（assessment / history / dimensions 及其 js），与导航里的相对链接对应。
        if (parsed.path.endswith(".html") or parsed.path.endswith(".js")) and "/" not in parsed.path.lstrip("/"):
            self.send_static_asset(parsed.path.lstrip("/"))
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

        # data/ 目录只读直出（rank-history.json 等），与 Netlify publish="." 的 /data/* 路径一致。
        if parsed.path.startswith("/data/") and parsed.path.endswith(".json"):
            relative = parsed.path.removeprefix("/data/")
            data_path = (DATA_DIR / relative).resolve()
            try:
                data_path.relative_to(DATA_DIR.resolve())
            except ValueError:
                self.send_json({"error": "not_found", "path": parsed.path}, status=404)
                return
            if data_path.is_file():
                self.send_file(data_path, "application/json; charset=utf-8")
                return
            self.send_json({"error": "not_found", "path": parsed.path}, status=404)
            return
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
