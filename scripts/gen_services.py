#!/usr/bin/env python3
import os

def wf(p, c):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", newline="
") as f:
        f.write(c)
    print(f"  Created: {p}")

print("Script skeleton created")
