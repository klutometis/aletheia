#!/usr/bin/env python3
"""Fetch (or verify) the large assets that live outside git.

    tools/fetch_assets.py            fetch anything missing or corrupt
    tools/fetch_assets.py --check    verify what is here, fetch nothing
    tools/fetch_assets.py --only taylor-ocr.pdf

The manifest is `assets.json` at the repo root: every entry carries a
sha256 and a byte count, so "it downloaded" and "it is the right file"
are different questions and this script answers the second one.

Needs rclone with a `b2archive` remote configured.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "assets.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(rel: str, rec: dict) -> tuple[bool, str]:
    p = ROOT / rel
    if not p.exists():
        return False, "missing"
    size = p.stat().st_size
    if size != rec["bytes"]:
        return False, f"{size} bytes, expected {rec['bytes']}"
    got = sha256(p)
    if got != rec["sha256"]:
        return False, f"sha256 {got[:16]}... != {rec['sha256'][:16]}..."
    return True, f"ok ({size / 1048576:.1f} MB)"


def rclone_copy(url: str, dest: Path, remote: str) -> None:
    # b2://bucket/path -> <remote>:bucket/path
    assert url.startswith("b2://"), url
    src = f"{remote}:{url[len('b2://'):]}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["rclone", "copyto", src, str(dest), "--progress"], check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify only, fetch nothing")
    ap.add_argument("--only", help="operate on a single manifest path")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text())
    remote = manifest.get("remote", "b2archive")
    assets = manifest["assets"]
    if args.only:
        if args.only not in assets:
            print(f"not in manifest: {args.only}", file=sys.stderr)
            print("known:", *assets, sep="\n  ", file=sys.stderr)
            return 2
        assets = {args.only: assets[args.only]}

    bad = 0
    for rel, rec in assets.items():
        ok, why = verify(rel, rec)
        if ok:
            print(f"  ✓ {rel}  {why}")
            continue
        if args.check:
            print(f"  ✗ {rel}  {why}")
            bad += 1
            continue
        print(f"  ↓ {rel}  ({why}) fetching...")
        rclone_copy(rec["url"], ROOT / rel, remote)
        ok, why = verify(rel, rec)
        print(f"  {'✓' if ok else '✗'} {rel}  {why}")
        bad += 0 if ok else 1

    if bad:
        print(f"\n{bad} asset(s) missing or corrupt", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
