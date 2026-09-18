#!/usr/bin/env python3
import json
import sys
from collections import Counter
from pathlib import Path

if len(sys.argv) != 2:
    print("Usage: slither-gate.py <slither-report.json>")
    sys.exit(2)

path = Path(sys.argv[1])
if not path.exists() or path.stat().st_size == 0:
    print("Slither report is missing or empty.")
    sys.exit(2)

try:
    report = json.loads(path.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"Unable to parse Slither report: {exc}")
    sys.exit(2)

if report.get("success") is False:
    print("Slither did not complete successfully.")
    print(report.get("error"))
    sys.exit(2)

detectors = report.get("results", {}).get("detectors", [])
counts = Counter(str(item.get("impact", "Unknown")) for item in detectors)

print("Slither detector summary:")
for severity in ["High", "Medium", "Low", "Informational", "Optimization", "Unknown"]:
    if counts.get(severity):
        print(f"  {severity}: {counts[severity]}")

blocking = [
    item
    for item in detectors
    if str(item.get("impact", "")).lower() in {"high", "medium"}
]

if blocking:
    print("\nBlocking High/Medium findings:")
    for item in blocking:
        check = item.get("check", "unknown")
        impact = item.get("impact", "unknown")
        confidence = item.get("confidence", "unknown")
        description = " ".join(str(item.get("description", "")).split())
        print(f"- [{impact}/{confidence}] {check}: {description[:500]}")
    sys.exit(1)

print("\nNo High or Medium Slither findings detected.")
sys.exit(0)
