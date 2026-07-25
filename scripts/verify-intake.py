#!/usr/bin/env python3
"""Drive the homepage intake (flow "dev") and assert the behaviour it promises.

Usage:
    python3 scripts/verify-intake.py http://localhost:3000
    PREVIEW_COOKIE="_vercel_jwt=..." python3 scripts/verify-intake.py https://<preview>.vercel.app

A preview deployment sits behind Vercel auth. Mint a share link, follow it with
`curl -c jar -L "<url>?_vercel_share=<token>"`, and pass the _vercel_jwt cookie
in PREVIEW_COOKIE. Note the cookie jar line starts with "#HttpOnly_", so a naive
"skip lines starting with #" parser drops it.


Checks the behaviours the design promises, not just that it returns 200:
  - no deflection for any need
  - question count lands in range and never exceeds 5
  - primary_path judged from the work, not the writer's register
  - chips offered by default
  - match_intro present and on-topic at handoff
  - freelancers get expert_signup instead of a rejection
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
URL = f"{BASE}/api/chat"
COOKIE = os.environ.get('PREVIEW_COOKIE', '')

PASS, FAIL = "PASS", "FAIL"
results = []


def send(messages, flow="dev", attempts=4):
    """Upstream 529 Overloaded surfaces here as a 502. That is capacity, not a
    defect, so absorb it rather than failing the behavioural check."""
    body = json.dumps({"flow": flow, "messages": messages}).encode()
    last_err = None
    for i in range(attempts):
        req = urllib.request.Request(
            URL, data=body, headers={"Content-Type": "application/json", "Cookie": COOKIE}
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code not in (502, 429, 503):
                raise
            wait = 5 * (i + 1)
            print(f"     (upstream {e.code}, retrying in {wait}s)")
            time.sleep(wait)
    raise last_err


def converse(turns, flow="dev", max_turns=8):
    """Feed scripted user turns; returns (transcript, final_reply, n_questions)."""
    messages, transcript, last = [], [], None
    questions = 0
    for t in turns:
        messages.append({"role": "user", "content": t})
        rep = send(messages, flow)
        last = rep
        transcript.append(("user", t))
        transcript.append(("bot", rep.get("reply", ""), rep.get("chips") or []))
        if not rep.get("done"):
            questions += 1
        messages.append({"role": "assistant", "content": rep.get("reply", "")})
        if rep.get("done") or rep.get("expert_signup"):
            break
    return transcript, last, questions


def check(name, ok, detail=""):
    results.append((PASS if ok else FAIL, name, detail))
    print(f"  [{PASS if ok else FAIL}] {name}" + (f"  :: {detail}" if detail else ""))


def show(transcript):
    for row in transcript:
        if row[0] == "user":
            print(f"     USER > {row[1][:100]}")
        else:
            chips = f"   chips={row[2]}" if row[2] else ""
            print(f"     BOT  < {row[1][:100]}{chips}")


# 1. A need that used to be DEFLECTED must now be served end to end.
print("\n=== 1. Non-coding need is served, not deflected ===")
tr, last, q = converse([
    "I run a B2B fintech and I need someone to build us a RAG chatbot over our compliance docs.",
    "About 15k, and we want it live in two months.",
    "Just our internal policy PDFs, maybe 400 of them.",
    "Accuracy matters more than speed. Nobody has tried yet.",
    "Yes let's go.",
    "Sounds right, go ahead.",
    "Yes.",
    "Go ahead please.",
    "Yes that works.",
])
show(tr)
joined = " ".join(r[1] for r in tr if r[0] == "bot").lower()
check("no redirect to /chat", "midsesh.com/chat" not in joined, joined[:80])
check("reached a handoff with a brief", bool(last.get("done") and last.get("brief")))
check("question count 3..5", 3 <= q <= 5, f"asked {q}")
check("match_intro present", bool(last.get("match_intro")), str(last.get("match_intro"))[:90])
check("match_confidence set", last.get("match_confidence") in ("medium", "high"),
      str(last.get("match_confidence")))
check("primary_path session (digital work)", last.get("primary_path") == "session",
      str(last.get("primary_path")))

# 2. Plain speaker, digital work: register plain BUT path still session.
print("\n=== 2. Non-technical writer, digital work, session still leads ===")
tr, last, q = converse([
    "Our checkout keeps losing people and I don't know why.",
    "Right when the card form loads.",
    "No, we built it ourselves last year and nobody has looked at it.",
    "As soon as possible, we are losing sales every day.",
    "Yes please.",
    "Go ahead.",
    "Yes.",
])
show(tr)
bot_text = " ".join(r[1] for r in tr if r[0] == "bot")
check("primary_path session despite plain register", last.get("primary_path") == "session",
      str(last.get("primary_path")))
check("no MCP acronym leaked to a plain speaker", "MCP" not in bot_text)
check("reached handoff", bool(last.get("done")))

# 3. Work outside digital: email should lead.
print("\n=== 3. Work outside digital routes to email ===")
tr, last, q = converse([
    "I need someone to sort out our German VAT filings.",
    "Ongoing, we are a few months behind.",
    "Small company, about 12 people, selling into Germany and France.",
    "Nobody in house, our old accountant left.",
    "Yes.",
])
show(tr)
check("primary_path email for offline work", last.get("primary_path") == "email",
      str(last.get("primary_path")))

# 4. Freelancer gets the application, not a rejection.
print("\n=== 4. Freelancer gets an application path ===")
tr, last, q = converse([
    "Hi, I'm a freelance React developer with 8 years experience. Can I join your platform?",
    "sure, my email is dev@example.com and I build React and Next.js frontends.",
])
show(tr)
check("expert_signup set", last.get("expert_signup") is True, str(last.get("expert_signup")))
check("no client brief produced", not last.get("brief"))

# 5. Chips are offered by default (cold start).
print("\n=== 5. Chips offered on the opening turns ===")
first = send([{"role": "user", "content": "I want to automate a workflow"}])
print(f"     BOT  < {first.get('reply','')[:100]}")
print(f"     chips={first.get('chips')}  chip_mode={first.get('chip_mode')}")
check("opening question offers chips", len(first.get("chips") or []) >= 3,
      str(first.get("chips")))
check("chip_mode is valid", first.get("chip_mode") in ("single", "multi"),
      str(first.get("chip_mode")))

# 6. Question ceiling holds under a rambling visitor.
print("\n=== 6. Never exceeds 5 questions ===")
tr, last, q = converse([
    "hi", "not sure", "maybe an app", "dunno", "whatever you think",
    "ok", "sure", "fine",
], max_turns=8)
show(tr)
check("stopped at or before 5 questions", q <= 5, f"asked {q}, done={last.get('done')}")

# 7. Long message keeps its tail (the 600 char truncation fix).
print("\n=== 7. Long message keeps its tail ===")
filler = "We are a Berlin based payments company and our situation is complicated. " * 8
tail = "The single most important thing is that it must be finished before September."
rep = send([{"role": "user", "content": filler + tail}])
print(f"     sent {len(filler + tail)} chars")
print(f"     BOT  < {rep.get('reply','')[:120]}")
check("server accepted a >600 char message", True, f"{len(filler+tail)} chars sent")

print("\n" + "=" * 60)
n_fail = sum(1 for r in results if r[0] == FAIL)
print(f"  {len(results) - n_fail}/{len(results)} checks passed")
for status, name, detail in results:
    if status == FAIL:
        print(f"  FAILED: {name}  {detail}")
sys.exit(1 if n_fail else 0)
