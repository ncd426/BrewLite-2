#!/usr/bin/env python3
"""A2-25 Render deploy and smoke checks (stdlib only; no credentials logged)."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RENDER_API = "https://api.render.com/v1"
SERVICE_ID = re.compile(r"^srv-[a-z0-9]+$")
IMAGE_DIGEST = re.compile(r"^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@sha256:[a-f0-9]{64}$")
FAIL_STATES = {"build_failed", "update_failed", "pre_deploy_failed", "canceled", "deactivated"}


class ReleaseError(Exception):
    pass


def validate_origin(value: str, name: str) -> str:
    parsed = urllib.parse.urlsplit(value.strip())
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
        or parsed.hostname in {"localhost", "127.0.0.1"}
    ):
        raise ReleaseError(f"{name}: expected a public HTTPS origin without path or credentials")
    return f"https://{parsed.netloc}"


def validate_image(value: str) -> str:
    if not IMAGE_DIGEST.fullmatch(value):
        raise ReleaseError("Expected a GHCR image pinned to a full sha256 digest")
    return value


def validate_service(value: str) -> str:
    if not SERVICE_ID.fullmatch(value):
        raise ReleaseError("Invalid Render service ID (expected srv-...)")
    return value


def render_request(method: str, path: str, payload: dict | None = None) -> dict:
    token = os.environ.get("RENDER_API_KEY", "")
    if not token:
        raise ReleaseError("Missing RENDER_API_KEY secret")
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        RENDER_API + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "BrewLite-A2-25-GitHub-Actions/1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as response:
            return json.load(response)
    except urllib.error.HTTPError as e:
        # Never print an API response body: may contain sensitive provider details.
        raise ReleaseError(f"Render API {method} failed with HTTP {e.code}") from None
    except urllib.error.URLError as e:
        raise ReleaseError(f"Render API connection error: {type(e.reason).__name__}") from None
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ReleaseError("Render API returned invalid JSON") from None


def evidence_dir() -> Path:
    path = Path(os.getenv("A225_EVIDENCE_DIR", "work/A2-25/evidence"))
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_evidence(name: str, data: dict) -> None:
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "-", name)
    (evidence_dir() / f"{safe_name}.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8"
    )


def append_summary(markdown: str) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY", "")
    if path:
        with open(path, "a", encoding="utf-8") as out:
            out.write(markdown + "\n")


def deploy(service: str, image: str, label: str, timeout_seconds: int = 1200) -> None:
    service = validate_service(service)
    image = validate_image(image)
    if not os.environ.get("RENDER_API_KEY", ""):
        raise ReleaseError("RENDER_API_KEY secret is required")

    print(f"[A2-25] Deploying {label} using immutable image {image}", flush=True)
    start = dt.datetime.now(dt.timezone.utc)
    deploy_obj = render_request("POST", f"/services/{service}/deploys", {"imageUrl": image})
    deploy_id = deploy_obj.get("id")
    if not isinstance(deploy_id, str) or not deploy_id.startswith("dep-"):
        raise ReleaseError("Render did not return a deploy ID; refusing to claim success")
    deadline = time.monotonic() + timeout_seconds
    last_status = ""
    while time.monotonic() < deadline:
        info = render_request("GET", f"/services/{service}/deploys/{deploy_id}")
        state = info.get("status", "unknown")
        if state != last_status:
            print(f"[A2-25] {label} deploy {deploy_id}: {state}", flush=True)
            last_status = state
        if state == "live":
            deployed_ref = (info.get("image") or {}).get("ref")
            # A 200 on a public URL alone can still serve the *old* revision.
            if deployed_ref != image:
                raise ReleaseError(
                    f"{label}: deploy is live but returned image ref does not match requested digest"
                )
            evidence = {
                "service": label,
                "service_id": service,
                "deploy_id": deploy_id,
                "requested_image": image,
                "deployed_ref": deployed_ref,
                "resolved_digest": (info.get("image") or {}).get("sha"),
                "state": state,
                "started_utc": start.isoformat(),
                "finished_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            }
            write_evidence(f"render-{label}-deploy", evidence)
            append_summary(
                f"- **{label}**: Render deploy `{deploy_id}` **live**, immutable image `{image}`"
            )
            print(f"[PASS] {label}: Render confirmed deploy {deploy_id} live at requested digest")
            return
        if state in FAIL_STATES:
            raise ReleaseError(f"{label}: Render deployment {deploy_id} ended with {state}")
        time.sleep(12)
    raise ReleaseError(f"{label}: timeout waiting for deploy {deploy_id} to become live")


def get_probe(url: str, kind: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "BrewLite-A2-25-Smoke/1"})
    began = time.monotonic()
    with urllib.request.urlopen(req, timeout=105) as res:
        code = int(res.status)
        content_type = res.headers.get("content-type", "").lower()
        raw = res.read(1024 * 1024)  # smoke must never download arbitrary huge responses
    if code != 200:
        raise ReleaseError(f"{kind}: HTTP {code}")
    if kind == "web":
        if "text/html" not in content_type or b"<html" not in raw.lower():
            raise ReleaseError("web: did not return HTML")
    else:
        try:
            payload = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            raise ReleaseError(f"{kind}: expected JSON response") from None
        if kind == "health" and not (isinstance(payload, dict) and payload.get("status") == "ok"):
            raise ReleaseError("health: expected status=ok")
        if kind == "products" and not isinstance(payload, list):
            raise ReleaseError("products: expected a JSON list")
    return {
        "probe": kind,
        "url": url,
        "http_status": code,
        "duration_ms": round((time.monotonic() - began) * 1000),
        "result": "PASS",
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def smoke(api_url: str, web_url: str | None = None) -> None:
    api = validate_origin(api_url, "API URL")
    targets = [("health", api + "/health"), ("products", api + "/products")]
    if web_url:
        targets.append(("web", validate_origin(web_url, "Web URL") + "/"))
    results = []
    for kind, url in targets:
        last = ""
        for attempt in range(1, 6):
            try:
                result = get_probe(url, kind)
                results.append(result)
                print(f"[PASS] {kind}: HTTP 200 ({result['duration_ms']} ms)", flush=True)
                break
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ReleaseError) as exc:
                last = f"{type(exc).__name__}"
                print(f"[RETRY] {kind} attempt {attempt}/5 ({last})", flush=True)
                if attempt < 5:
                    time.sleep(12)
        else:
            write_evidence("render-smoke-failed", {"passed": results, "failed_probe": kind, "error": last})
            raise ReleaseError(f"{kind}: smoke check did not pass")
    write_evidence("render-smoke", {"checks": results})
    append_summary("- **Smoke tests:** " + ", ".join(f"`{r['probe']}` HTTP 200" for r in results))


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)
    d = sub.add_parser("deploy")
    d.add_argument("--service", required=True)
    d.add_argument("--image", required=True)
    d.add_argument("--label", required=True, choices=["api", "web"])
    d.add_argument("--timeout-seconds", type=int, default=1200)
    s = sub.add_parser("smoke")
    s.add_argument("--api-url", required=True)
    s.add_argument("--web-url")
    try:
        args = p.parse_args()
        if args.command == "deploy":
            deploy(args.service, args.image, args.label, args.timeout_seconds)
        else:
            smoke(args.api_url, args.web_url)
        return 0
    except ReleaseError as error:
        print(f"::error::A2-25: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
