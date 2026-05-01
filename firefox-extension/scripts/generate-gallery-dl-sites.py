#!/usr/bin/env python3
"""Generate popup gallery-dl site metadata from gallery-dl's own code.

The popup needs fast, offline host matching, so it cannot boot Pyodide
and import gallery-dl just to render a status panel. This script builds
that static data from gallery-dl's extractor registry and upstream
scripts/supportedsites.py, which is also what generates
docs/supportedsites.md.
"""

from __future__ import annotations

import html
import importlib.util
import json
import re
import sys
import tempfile
import urllib.request
from pathlib import Path
from urllib.parse import urlparse


EXTENSION_OUTPUT = Path(__file__).resolve().parents[1] / "gallery-dl-sites.js"
WEB_OUTPUT = Path(__file__).resolve().parents[2] / "web" / "lib" / "gallery-dl-sites.js"


def fetch(url: str, path: Path) -> None:
    with urllib.request.urlopen(url) as resp:
        path.write_bytes(resp.read())


def upstream_base() -> tuple[str, str]:
    import gallery_dl

    version = getattr(gallery_dl, "__version__", "") or "master"
    ref = f"v{version}" if version != "master" else "master"
    return version, f"https://raw.githubusercontent.com/mikf/gallery-dl/{ref}"


def load_supportedsites(tmpdir: Path, base_url: str):
    fetch(f"{base_url}/scripts/supportedsites.py", tmpdir / "supportedsites.py")
    fetch(f"{base_url}/scripts/util.py", tmpdir / "util.py")
    script = tmpdir / "supportedsites.py"
    text = script.read_text(encoding="utf-8")
    # supportedsites.py is normally run inside gallery-dl's source tree,
    # where test.results can supply a few missing roots. When run against
    # an installed wheel, pixiv-novel can otherwise have no inferred URL.
    text = text.replace(
        'domains["pixiv-novel"] += "novel"',
        'domains["pixiv-novel"] = (domains.get("pixiv-novel") or "https://www.pixiv.net/") + "novel"',
    )
    text = text.replace(
        'domains[category] = root + "/"',
        'domains[category] = (root + "/") if root else ""',
    )
    script.write_text(text, encoding="utf-8")
    sys.path.insert(0, str(tmpdir))
    try:
        spec = importlib.util.spec_from_file_location(
            "supportedsites", tmpdir / "supportedsites.py"
        )
        if spec is None or spec.loader is None:
            raise RuntimeError("could not load gallery-dl supportedsites.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        try:
            sys.path.remove(str(tmpdir))
        except ValueError:
            pass


def strip_html(value: str) -> str:
    value = re.sub(r"<[^>]*>", "", value or "")
    return html.unescape(value).replace("\xa0", " ").strip()


def ascii_json(value) -> str:
    return json.dumps(value, indent=2, ensure_ascii=True)


def build_entries(supportedsites) -> list[dict[str, str]]:
    categories, domains = supportedsites.build_extractor_list()
    examples = build_examples(supportedsites)
    entries = []

    for base_category, base in categories.items():
        if not base:
            continue
        if base_category:
            category_items = base.items()
        else:
            category_items = sorted(base.items(), key=supportedsites.category_key)

        for category, subcategories in category_items:
            domain = domains.get(category, "")
            parsed = urlparse(domain)
            if parsed.scheme not in ("http", "https") or not parsed.hostname:
                continue
            row = {
                "site": strip_html(supportedsites.category_text(category)),
                "url": domain,
                "host": parsed.hostname.removeprefix("www.").lower(),
                "capabilities": strip_html(", ".join(
                    text
                    for text in (
                        supportedsites.subcategory_text(base_category, category, subcategory)
                        for subcategory in subcategories
                    )
                    if text
                )),
                "auth": strip_html(supportedsites.AUTH_MAP.get(category, "")),
                "examples": examples.get(category, []),
            }
            entries.append(row)

    return entries


def build_examples(supportedsites) -> dict[str, list[dict[str, str]]]:
    from gallery_dl import extractor

    examples: dict[str, list[dict[str, str]]] = {}
    for extr in extractor._list_classes():
        category = extr.category
        if category in supportedsites.IGNORE_LIST:
            continue
        if category:
            category_examples = [(category, getattr(extr, "example", ""))]
        else:
            category_examples = [
                (instance_category, getattr(extr, "example", ""))
                for instance_category, _root, _info in getattr(extr, "instances", ())
            ]

        for example_category, example in category_examples:
            if not example or not example.startswith(("http://", "https://")):
                continue
            label = strip_html(supportedsites.subcategory_text(
                getattr(extr, "basecategory", ""),
                example_category,
                getattr(extr, "subcategory", ""),
            ))
            item = {"label": label or "Example", "url": example}
            bucket = examples.setdefault(example_category, [])
            if item not in bucket:
                bucket.append(item)

    return examples


def main() -> None:
    version, base_url = upstream_base()
    with tempfile.TemporaryDirectory(prefix="ambrosia-gallery-dl-") as tmp:
        supportedsites = load_supportedsites(Path(tmp), base_url)
        entries = build_entries(supportedsites)

    header = (
        "// Generated from gallery-dl extractor code via scripts/supportedsites.py.\n"
        f"// gallery-dl version: {version}\n"
        f"// Source: {base_url}/scripts/supportedsites.py\n"
        "// Run firefox-extension/scripts/generate-gallery-dl-sites.py after updating gallery-dl.\n"
    )
    EXTENSION_OUTPUT.write_text(
        header + f"window.GALLERY_DL_SUPPORTED_SITES = {ascii_json(entries)};\n",
        encoding="utf-8",
    )
    WEB_OUTPUT.write_text(
        header + f"export const GALLERY_DL_SUPPORTED_SITES = {ascii_json(entries)};\n",
        encoding="utf-8",
    )
    print(f"wrote {len(entries)} entries to {EXTENSION_OUTPUT}")
    print(f"wrote {len(entries)} entries to {WEB_OUTPUT}")


if __name__ == "__main__":
    main()
