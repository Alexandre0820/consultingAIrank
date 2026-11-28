#!/usr/bin/env python3
"""AI咨询行动榜 standalone MVP server.

This project is intentionally separated from the AI 咨询知识分身 MVP.
It serves only the AI consulting action leaderboard files.
"""
import json
import os
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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

    # ———— 匿名提交（行业基准 / 证据线索）：本地测试与 Netlify Forms 用同一套表单标记 ————
    BENCHMARK_SEGMENTS = ["consulting-mbb", "consulting-big4", "consulting-tech", "consulting-boutique", "enterprise", "other"]
    ROLES = ["consultant", "buyer", "investor", "researcher", "other"]
    CLUE_TYPES = ["partnership", "platform", "service_line", "investment", "organization", "governance", "research", "client_proof", "other"]

    def _load_company_ids(self):
        try:
            companies = json.loads((DATA_DIR / "companies.json").read_text(encoding="utf-8"))
            return [c["id"] for c in companies]
        except Exception:
            return []

    def _validate_benchmark(self, fields):
        if fields.get("bot-field", "").strip():
            return False, "spam"
        if fields.get("consent") != "yes":
            return False, "consent_required"
        if fields.get("segment_type") not in self.BENCHMARK_SEGMENTS:
            return False, "bad_segment"
        if fields.get("segment_role", "other") not in self.ROLES:
            return False, "bad_role"
        for dim in ["strategy_signal", "tech_partnership", "proprietary_assets", "delivery_production",
                    "capital_ma", "industry_coverage", "client_value_proof", "governance_risk", "thought_leadership"]:
            raw = fields.get(f"d_{dim}", "")
            if raw not in {"0", "1", "2", "3", "4", "5"}:
                return False, f"missing_or_bad_score_{dim}"
        return True, ""

    def _validate_clue(self, fields):
        if fields.get("bot-field", "").strip():
            return False, "spam"
        company = fields.get("company", "")
        if company != "other" and company not in self._load_company_ids():
            return False, "bad_company"
        clue_type = fields.get("clue_type", "")
        if clue_type not in self.CLUE_TYPES:
            return False, "bad_clue_type"
        description = fields.get("description", "").strip()
        if not description or len(description) > 2000:
            return False, "description_required_1_2000_chars"
        url = fields.get("source_url", "").strip()
        if url and not url.startswith(("http://", "https://")):
            return False, "bad_url"
        return True, ""

    def _save_submission(self, form_name, fields):
        sub_dir = DATA_DIR / "submissions" / form_name
        sub_dir.mkdir(parents=True, exist_ok=True)
        record = {
            "received_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            **{k: v for k, v in fields.items() if k != "bot-field"},
        }
        out = sub_dir / f"pending-{datetime.now(timezone.utc).date().isoformat()}.jsonl"
        with out.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        return record

    def _send_thanks(self, title, message):
        body = f"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>{title}</title>
        <style>body{{font-family:'PingFang SC','Hiragino Sans GB',sans-serif;background:#FFF8EC;color:#171411;
        display:grid;place-items:center;min-height:100vh;margin:0}}main{{max-width:520px;text-align:center;
        background:rgba(255,255,255,.6);border:1px solid rgba(23,20,17,.16);border-radius:18px;padding:40px}}
        h1{{font-size:24px}}p{{color:#746b5f;line-height:1.7}}a{{color:#B42318;font-weight:800}}</style></head>
        <body><main><h1>{title}</h1><p>{message}</p><p><a href="/">返回 AI咨询行动榜</a></p></main></body></html>"""
        data = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/":
            self.send_json({"error": "not_found", "path": parsed.path}, status=404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 65536:
            self.send_json({"ok": False, "error": "bad_request"}, status=400)
            return
        content_type = self.headers.get("Content-Type", "")
        if "application/x-www-form-urlencoded" not in content_type:
            self.send_json({"ok": False, "error": "unsupported_content_type"}, status=415)
            return
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        fields = {k: v[0] for k, v in parse_qs(body, keep_blank_values=True).items()}
        form_name = fields.get("form-name", "")

        if form_name == "benchmark-submission":
            ok, error = self._validate_benchmark(fields)
        elif form_name == "evidence-clue":
            ok, error = self._validate_clue(fields)
        else:
            ok, error = False, "unknown_form"

        if not ok:
            if fields.get("ajax") == "1":
                self.send_json({"ok": False, "error": error}, status=400)
            else:
                self._send_thanks("提交未完成", f"原因：{error}。请返回检查表单后重新提交。")
            return

        self._save_submission(form_name, fields)
        if fields.get("ajax") == "1":
            self.send_json({"ok": True})
        else:
            self._send_thanks("已收到，谢谢你", "你的匿名提交已进入待审队列：人工复核后才会进入聚合基准，不会公开任何可识别个人的信息。")

    def log_message(self, format, *args):
        pass


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
