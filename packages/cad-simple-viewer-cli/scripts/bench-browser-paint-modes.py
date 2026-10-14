#!/usr/bin/env python3
"""Patch AcTrView2d paint policy for browser-open paint benches, then restore.

Modes:
  throttle — current branch (4s interactive non-progressive paints)
  every    — dirty every glyph, no mid-open throttle (pre-#738 interactive)
  none     — skip all non-progressive mid-open paints (#738 browser regression)
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
VIEW = ROOT / "packages/cad-simple-viewer/src/view/AcTrView2d.ts"
BACKUP = VIEW.with_suffix(".ts.bench-bak")

THROTTLE_DEFER = """    const deferRenderWhileLoading =
      !this._progressiveRendering && !this._cooperativeYield && sceneBusy"""

NONE_DEFER = """    const deferRenderWhileLoading =
      !this._progressiveRendering && sceneBusy"""

THROTTLE_GLYPH = """          if (
            job.epoch === this._convertEpoch &&
            (this._progressiveRendering || this._cooperativeYield)
          ) {
            this._isDirty = true
          }"""

NONE_GLYPH = """          if (job.epoch === this._convertEpoch && this._progressiveRendering) {
            this._isDirty = true
          }"""

THROTTLE_INTERVAL = (
    "private static readonly NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 4000"
)
EVERY_INTERVAL = (
    "private static readonly NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 0"
)


def read() -> str:
    raw = VIEW.read_bytes()
    return raw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")


def write(text: str) -> None:
    nl = b"\r\n" if b"\r\n" in VIEW.read_bytes() else b"\n"
    # Prefer CRLF if backup/original used it
    if BACKUP.exists():
        nl = b"\r\n" if b"\r\n" in BACKUP.read_bytes() else b"\n"
    out = text.replace("\n", "\r\n" if nl == b"\r\n" else "\n")
    VIEW.write_bytes(out.encode("utf-8"))


def backup() -> None:
    if not BACKUP.exists():
        shutil.copy2(VIEW, BACKUP)


def restore() -> None:
    if BACKUP.exists():
        shutil.copy2(BACKUP, VIEW)
        BACKUP.unlink()
        print("restored", VIEW)
    else:
        print("no backup to restore", file=sys.stderr)


def apply(mode: str) -> None:
    backup()
    # Always start from backup (throttle baseline on this branch)
    text = BACKUP.read_bytes().decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")

    if mode == "throttle":
        # backup already is throttle
        write(text)
        print("mode=throttle")
        return

    if mode == "every":
        if THROTTLE_INTERVAL not in text:
            raise SystemExit("throttle interval constant missing")
        text = text.replace(THROTTLE_INTERVAL, EVERY_INTERVAL, 1)
        write(text)
        print("mode=every (interval 0)")
        return

    if mode == "none":
        if THROTTLE_DEFER not in text:
            raise SystemExit("throttle defer block missing")
        if THROTTLE_GLYPH not in text:
            raise SystemExit("throttle glyph block missing")
        text = text.replace(THROTTLE_DEFER, NONE_DEFER, 1)
        text = text.replace(THROTTLE_GLYPH, NONE_GLYPH, 1)
        write(text)
        print("mode=none (#738 skip paints)")
        return

    raise SystemExit(f"unknown mode {mode}")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["apply", "restore"])
    p.add_argument(
        "mode",
        nargs="?",
        choices=["throttle", "every", "none"],
        help="required for apply",
    )
    args = p.parse_args()
    if args.command == "restore":
        restore()
        return
    if not args.mode:
        raise SystemExit("mode required for apply")
    apply(args.mode)


if __name__ == "__main__":
    main()
