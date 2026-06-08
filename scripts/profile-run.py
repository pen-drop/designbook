#!/usr/bin/env python3
"""Profile a Claude Code transcript for workflow token cost.

Measures the dominant cost of a long workflow run — sum-over-turns re-processing
of accumulated context — and models what subagent-per-stage isolation would save.

Usage:
    python3 scripts/profile-run.py <transcript.jsonl> [--workflow design-shell]

Input: a Claude Code session transcript (`~/.claude/projects/<proj>/<uuid>.jsonl`).
Output (stdout):
  - assistant turns, summed billed input (re-processing proxy), output tokens
  - one-time tool_result payload by category
  - per-stage breakdown (turns, content added, monolith billed)
  - subagent-per-stage cost model at bootstrap ∈ {8k,15k,25k} and the reduction ratio
  - duplicate-read table (the "too many reads" check)

Stdlib only. No external deps. The subagent model resets context to a fixed
bootstrap at each stage boundary; the SAME content-attribution model is applied to
both monolith and subagent sides, so the *ratio* is the reliable signal (absolute
reconstruction over-counts vs the cache-discounted measured billed input).
"""
import json
import sys
import re
import os
from collections import defaultdict, Counter


def load(path):
    rows = []
    for line in open(path, errors="replace"):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows


def approx_tokens(chars):
    return chars / 4.0


def tool_use_map(rows):
    tu = {}
    for r in rows:
        msg = r.get("message") or {}
        c = msg.get("content")
        if isinstance(c, list):
            for b in c:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    tu[b.get("id")] = (b.get("name"), b.get("input") or {})
    return tu


def categorize(name, inp):
    cmd = ""
    if isinstance(inp, dict):
        cmd = f"{inp.get('command', '')} {inp.get('file_path', '')} {inp.get('description', '')}"
    sl = f"{name or ''} {cmd}".lower()
    if name == "Read" and "/rules/" in cmd:
        return "rule_file"
    if name == "Read" and "/blueprints/" in cmd:
        return "blueprint_file"
    if name == "Read" and "/tasks/" in cmd:
        return "task_body"
    if name == "Read" and "/resources/" in cmd:
        return "skill_resource"
    if any(k in sl for k in ("workflow create", "workflow done", "workflow instructions", "_debo")):
        return "workflow_cli"
    if "get_page_text" in sl or "read_page" in sl or "capture-reference" in sl:
        return "reference_extract"
    if "screenshot" in sl or ".png" in sl:
        return "screenshot_cmd"
    if name == "Read":
        return "read_other"
    if name == "Bash":
        return "bash_other"
    return name or "other"


def parse_response(text):
    m = re.search(r"RESPONSE:\s*(\{.*\})", text)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def result_size(block):
    content = block.get("content")
    chars, imgs = 0, 0
    if isinstance(content, str):
        chars = len(content)
    elif isinstance(content, list):
        for cb in content:
            if isinstance(cb, dict):
                if cb.get("type") == "text":
                    chars += len(cb.get("text", ""))
                elif cb.get("type") == "image":
                    imgs += 1
    return chars, imgs


def result_text(block):
    content = block.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            cb.get("text", "") for cb in content if isinstance(cb, dict) and cb.get("type") == "text"
        )
    return ""


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    path = sys.argv[1]
    workflow = "design-s"
    if "--workflow" in sys.argv:
        workflow = sys.argv[sys.argv.index("--workflow") + 1]

    rows = load(path)
    tu = tool_use_map(rows)

    # Find segment start: first `workflow create --workflow <workflow>`
    start = None
    for i, r in enumerate(rows):
        msg = r.get("message") or {}
        c = msg.get("content")
        if isinstance(c, list):
            for b in c:
                if (
                    isinstance(b, dict)
                    and b.get("type") == "tool_use"
                    and b.get("name") == "Bash"
                    and f"workflow create --workflow {workflow}" in str((b.get("input") or {}).get("command", ""))
                ):
                    start = i
                    break
        if start is not None:
            break
    if start is None:
        print(f"No `workflow create --workflow {workflow}` found in {os.path.basename(path)}")
        sys.exit(0)

    seg = rows[start:]
    turns = []
    reads = []
    cur_step = "(first-stage)"
    cat_chars = defaultdict(float)
    cat_count = defaultdict(int)
    img_blocks = 0

    for r in seg:
        typ = r.get("type")
        m = r.get("message") or {}
        c = m.get("content")
        if typ == "assistant":
            u = m.get("usage") or {}
            billed = (
                u.get("input_tokens", 0)
                + u.get("cache_read_input_tokens", 0)
                + u.get("cache_creation_input_tokens", 0)
            )
            out = u.get("output_tokens", 0)
            turns.append({"step": cur_step, "billed": billed, "out": out, "added": out})
        if isinstance(c, list):
            for b in c:
                if not isinstance(b, dict) or b.get("type") != "tool_result":
                    continue
                ch, imgs = result_size(b)
                img_blocks += imgs
                tk = approx_tokens(ch) + imgs * 1300
                if turns:
                    turns[-1]["added"] += tk
                tid = b.get("tool_use_id")
                name, inp = tu.get(tid, (None, {}))
                cat = categorize(name, inp)
                cat_chars[cat] += ch
                cat_count[cat] += 1
                resp = parse_response(result_text(b))
                if resp:
                    ns = resp.get("next_step") or resp.get("next_stage")
                    if ns:
                        cur_step = ns
                if name == "Read" and isinstance(inp, dict) and inp.get("file_path"):
                    reads.append((cur_step, inp["file_path"]))

    total_billed = sum(t["billed"] for t in turns)
    total_out = sum(t["out"] for t in turns)
    base = turns[0]["billed"] if turns else 0
    cum, recon = 0, 0
    for t in turns:
        cum += t["added"]
        recon += base + cum

    print(f"FILE: {os.path.basename(path)}   workflow filter: {workflow}")
    print(f"assistant turns: {len(turns)}")
    print(f"MEASURED billed input (sum over turns):   {total_billed:,.0f}")
    print(f"RECONSTRUCTED (base+cumulative added):    {recon:,.0f}   base={base:,.0f}")
    print(f"output tokens (sum): {total_out:,.0f}   screenshots: {img_blocks}")
    print()

    print("=== one-time tool_result payload by category ===")
    tot = sum(cat_chars.values()) or 1
    for cat, ch in sorted(cat_chars.items(), key=lambda x: -x[1]):
        print(f"  {cat:18} {approx_tokens(ch):>10,.0f} tok  ({100 * ch / tot:4.1f}%)  n={cat_count[cat]}")
    print()

    by_turns = defaultdict(int)
    by_added = defaultdict(float)
    by_billed = defaultdict(float)
    order = []
    for t in turns:
        s = t["step"]
        if s not in by_turns:
            order.append(s)
        by_turns[s] += 1
        by_added[s] += t["added"]
        by_billed[s] += t["billed"]
    print("=== per-stage: turns, content added, measured billed (monolith) ===")
    for s in order:
        print(f"  {s:26} turns={by_turns[s]:4d}  added={by_added[s]:>9,.0f}  billed={by_billed[s]:>12,.0f}")
    print()

    def subagent_cost(boot):
        total, cur, local = 0, None, 0
        for t in turns:
            if t["step"] != cur:
                cur = t["step"]
                local = boot
            local += t["added"]
            total += local
        return total

    print("=== subagent-per-stage model (ratio is the reliable signal) ===")
    for boot in (8000, 15000, 25000):
        sc = subagent_cost(boot)
        print(f"  bootstrap={boot:>6}: billed={sc:,.0f}   vs monolith {recon:,.0f}  -> {recon / sc:.2f}x reduction")
    print()

    fc = Counter(f for _, f in reads)
    dup = sorted([(f, n) for f, n in fc.items() if n > 1], key=lambda x: -x[1])
    print(f"=== reads: {len(reads)} total, {len(fc)} unique, {len(dup)} read >1x ===")
    for f, n in dup[:20]:
        print(f"  {n}x  {f.replace(os.path.expanduser('~'), '~')}")


if __name__ == "__main__":
    main()
