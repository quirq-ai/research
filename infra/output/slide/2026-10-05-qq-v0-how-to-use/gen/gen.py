import html, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'slides')
BG, S1, S2, LINE = '#100f14', '#19161e', '#231e2a', '#39303f'
INK, INK2, INK3, ACC, AMB, GRN = '#f3ece4', '#d0c3cc', '#b1a2b4', '#f2a2d5', '#eac17a', '#b7cc91'
ASOF = '2026-10-05'
e = html.escape

def section(sid, body, gap=32):
    return (f'<section id="{sid}" style="display:flex;flex-direction:column;gap:{gap}px;width:1920px;height:1080px;'
            f'padding:128px;box-sizing:border-box;background:{BG};color:{INK};font-family:\'Inter\'">\n{body}\n</section>\n')

def head(eyebrow, title, size=60, mono=False):
    fam = "'JetBrains Mono'" if mono else "'Poppins'"
    return (f'  <div style="display:flex;flex-direction:column;gap:14px">\n'
            f'    <div style="font-family:\'JetBrains Mono\';font-size:24px;color:{ACC}">{e(eyebrow)}</div>\n'
            f'    <div style="font-family:{fam};font-size:{size}px;font-weight:600;line-height:1.1">{title}</div>\n  </div>')

def label(t, color=ACC):
    return f'<div style="font-family:\'JetBrains Mono\';font-size:24px;color:{color}">{e(t)}</div>'

def items(lst, size=26, color=INK, bullet=True):
    out = []
    for x in lst:
        dot = f'<span style="color:{ACC};font-weight:600;width:20px;flex:none">·</span>' if bullet else ''
        out.append(f'<div style="display:flex;gap:12px;font-size:{size}px;line-height:1.35;color:{color}">{dot}<div>{x}</div></div>')
    return '\n'.join(out)

def card(inner, bg=S1, gap=14, pad=32, extra=''):
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px;background:{bg};border-radius:14px;padding:{pad}px;{extra}">{inner}</div>'

def code(t):
    return f'<span style="font-family:\'JetBrains Mono\';color:{ACC}">{e(t)}</span>'

# ---------- phases ----------
PHASES = [
 dict(id='phase-v0', v='v0', name='A base version of every repo, end to end on GitHub', state='Code merged except GAT-03, CFG-05 and suraj\'s items; exit test not yet passed',
  goal='All 13 infra repos exist, are public, sit behind their own gate and do a thin first version of their job. A product change is built from its manifest, gated on the exact merge result, watched after it lands and shipped to canary by agents daily.',
  scope='Python 3.14 and Next.js 16 kinds; xo-space and innernet; GitHub merge queue + Actions behind an executor interface; only the canary channel live.',
  exit=[('13 public repos, each with CODEOWNERS, a generated presubmit and a merge queue','partly: all have CODEOWNERS; repo rulesets applied at gate 6610664 (per-repo coverage not verified); infra presubmits hand-written',AMB),
        ('Both product repos gated from their manifests; a red PR is refused','builders required but on interim commands, not recipes adapters (open v0 work); no red-PR refusal yet',AMB),
        ('7 daily canaries, no human touch; bad canary held; rollback under 10 min','day 1 of 7: both repos shipped 2026-10-05; started by hand',AMB),
        ('A planted breaking commit is auto-reverted within caps, with a failure record','waits on the gardener App (not yet created)',AMB),
        ('Scorecard v0 computed by a script','test-pipelines scorecard workflow runs',GRN)]),
 dict(id='phase-v1', v='v1', name='Unattended canary, dev channel, fuzzing, failure tracking', state='Not started (follows v0, by inference)',
  goal='The daily canary runs with nobody watching: it soaks, rolls itself back, fuzzes, files failure records and drafts postmortems. Dev opens with human approval. Flakes are handled, builds are hermetic and cached, and containers and docs repos join.',
  scope='Headline items: canary soak + auto rollback, dev channel, Python/Node/API fuzzing, flake quarantine, shared REAPI cache, PostHog as a health signal, docs and wiki onboarded, one-command idempotent setup.',
  exit=[('14 green daily canaries in a row, zero human touches','',INK3),
        ('A planted bad canary is rolled back in its soak window, with failure record and cited postmortem draft','',INK3),
        ('A planted fuzz crash becomes one deduplicated issue that closes only when replay passes','',INK3),
        ('Dev promoted 4 times, each by a human owner approving agent evidence','',INK3),
        ('A failure class seen twice in 14 days yields a new test, fuzz target or gate','',INK3),
        ('Flake rate weekly; cache hit rate at least 90%; main red under 60 min a week for 4 weeks','',INK3)]),
 dict(id='phase-v2', v='v2', name='Stable, speed, depth and Launchpad', state='Not started (follows v1, by inference); stable and installers P4',
  goal='Everything that runs on GitHub can also run on Launchpad, quirq\'s own cloud. Remote execution and perf detection reach Chromium\'s shape, fuzzing gains depth, and agents hold the gardener, roller and release rotations.',
  scope='Headline items: Launchpad backend and a gate without GitHub\'s merge queue, remote execution and autoscaled workers, cross-repo gating and rolls, perf bisection, stable promotion and staged rollout.',
  exit=[('The same build runs on github and launchpad with matching digests, chosen only by config','',INK3),
        ('Gate p50 under 10 min and p90 under 20 min for 4 weeks','',INK3),
        ('A planted 10% perf regression is alerted and bisected to its culprit','',INK3),
        ('8 weeks under suraj\'s intervention target, revert rate no worse than v1, policy changes owner-approved','',INK3),
        ('P4: one stable promotion, a rollback drill under 10 min, xo-space installs follow a channel','',INK3)]),
]

for p in PHASES:
    rows = []
    for i, (t, s, c) in enumerate(p['exit'], 1):
        st = f'<div style="font-size:24px;color:{c}">{e(s)}</div>' if s else ''
        rows.append(f'<div style="display:flex;gap:16px"><div style="font-family:\'JetBrains Mono\';font-size:26px;color:{ACC};width:32px;flex:none">{i}</div><div style="display:flex;flex-direction:column;gap:4px"><div style="font-size:24px;line-height:1.3">{e(t)}</div>{st}</div></div>')
    left = card(label('GOAL') + f'<div style="font-size:26px;line-height:1.4">{e(p["goal"])}</div>'
                + label('SCOPE') + f'<div style="font-size:24px;line-height:1.4;color:{INK2}">{e(p["scope"])}</div>', gap=16, pad=24, extra='flex:1')
    right = card(label('EXIT TEST' + (f' · AS OF {ASOF}' if p['v']=='v0' else '')) + '\n'.join(rows), gap=14, pad=24, extra='flex:1.4')
    pill = f'<span style="font-family:\'JetBrains Mono\';font-size:24px;color:{BG};background:{ACC};border-radius:999px;padding:6px 18px">{e(p["state"])}</span>'
    body = head(f'PHASE {p["v"]}' + ('' if p['v'] == 'v0' else ' (plan)'), f'{p["v"]}: {e(p["name"])}', size=56) + f'\n  <div style="display:flex">{pill}</div>\n  <div style="display:flex;gap:32px;flex:1">{left}{right}</div>'
    open(os.path.join(OUT, p['id'] + '.html'), 'w').write(section(p['id'], body, gap=28))

# ---------- repos ----------
R = [
 ('infra-config','All policy as code','infra/config + lucicfg',
  ['Declares every repo, builder, gate rule, channel and cap as TOML under config/',
   'qqcfg validate checks schemas, references and invariants config cannot loosen',
   'qqcfg generate writes the builders; qqcfg deliver writes them into a product checkout',
   'Every tool reads it at a pinned commit, so a change reaches a tool only after a pin bump'],
  ['qqcfg validate [--todos]','qqcfg generate','qqcfg deliver <repo> <checkout>','config/repos.toml, pipelines.toml, gate.toml'],
  'CFG-01..03, ORG-01; CFG-05 partly','310e326','Generated builders on both repos, sink 28f49a0 (xo-space #220, innernet #44 merged); suraj owns org and 13 repos',
  'suraj\'s values (CFG-04), other area owners (ORG-02), compute ceiling (ORG-04)',
  ['Dev channel on','Health thresholds','Fuzz schedules and filing caps','Onboard docs, wiki, containers']),
 ('depot','The qq CLI','depot_tools',
  ['One command for developers and agents, pinned per repo in infra/repo.toml',
   'Fetches toolchains, builds and tests through recipes, uploads and lands changes',
   'qq try returns a run ID at once and delivers the verdict later, so agents never block',
   'An e2e-sync job, scheduled daily, checks that a fresh runner can sync both product repos'],
  ['qq sync · qq fetch <url>','qq build · qq test','qq upload · qq try','qq land · qq status (0 pass, 1 refused, 3 pending)'],
  'DEP-01..04 and all audit fixes','741967c','e2e-sync scheduled daily at 06:17 UTC for xo-space and innernet (runs not readable anonymously)',
  'No depot v* tag can be cut until the release executor exists',
  ['qq roll','qq channel (hold, release, roll back)','qq failure and qq postmortem']),
 ('sync','The manifest and its only parser','gclient / DEPS',
  ['Owns the manifest schema quirq-repo/1: qq version, toolchain pins by digest, typed targets',
   'qqsync is the one parser every other repo imports',
   'Pin check: every pin is a digest, and a fetch that does not match it fails',
   'A guard fails any other code that tries to parse the manifest itself'],
  ['infra/repo.toml','qqsync validate','qqsync show','qqsync guard'],
  'SYN-01..04','d97e2f7','Used by depot, recipes, gate, rollers, release and perf','none for v0',
  ['Mirroring: builds pass with upstream registries blocked','Schema quirq-repo/1.1: fuzz targets, probes, deploy targets']),
 ('recipes','One adapter per target kind','recipes',
  ['One adapter contract per kind: fetch, build, test, run, deploy, bench (+ package, fuzz)',
   'Adapters: python-service, pytest, node-app (Next.js); the loader finds them, no registry',
   'Property tests run inside test',
   'Deploys to a canary test environment for release\'s canary'],
  ['qq build / qq test call it','release canary and perf call it','adding a language = one adapter module'],
  'REC-01..05 plus bench','db6ce0a','Used by qq, release\'s canary and perf',
  'Open v0 work: generated CI builders still run interim commands, not these adapters (exit test 2)',
  ['container-image and static-docs adapters','Python, Node and API fuzzing','Real canary deploy targets']),
 ('toolchains','Pinned, promoted toolchains','CIPD / 3pp',
  ['Builds CPython 3.14.8 and Node 24.21.0 with pnpm 11.28.2',
   'Publishes each build to public ghcr, addressed by digest',
   'A build is staged, then promoted by PR into promoted.toml',
   'A promotion-gate workflow runs on PRs and the merge queue; as a required repo check it is decided and turns on with the next settings run'],
  ['promoted.toml','toolchains.toml','ghcr.io/quirq-ai/…@sha256'],
  'TCH-01..03','44f8f95','suraj is code owner of the gate paths (#14); promotion-gate runs on PRs and the queue (#15)',
  'promotion-gate as a required check: decided; turns on with the next settings run (gate #25)',
  ['Reproducibility check','Container toolchain']),
 ('remote-build','Where actions run, and their cache','RBE / REAPI (the goma slot)',
  ['An executor interface with two backends: local and github',
   'A local action cache keyed by action digest, with fallback counters',
   'Launchpad plugs into the same seam later'],
  ['qqrbe exec/selftest --backend local|github','recipes action shape'],
  'RBE-01, RBE-02','62b2f04','Interface and cache ready',
  'qq does not call it yet',
  ['Shared REAPI cache (v2: remote execution, autoscaled workers)']),
 ('test-pipelines','Results and verdicts','ResultDB, LUCI Analysis',
  ['A sink in every builder stores each JUnit result in a write-once store',
   'Verdict: retry, then compare with the base commit',
   'Failure records with an issue mirror; gardener writes one per revert',
   'A scorecard workflow collects results, perf bundles and gate timing'],
  ['sink step in each qq-*.yml','qqresults','scorecard workflow'],
  'TST-01..04 and audit fixes','a642399','Product results stored via sink 28f49a0, the v0 pin',
  'Retry-then-compare is off in product builders',
  ['Flake detection and quarantine with expiry','Exoneration of known flakes','New-test flakiness check','Failure classes and recurrence']),
 ('gate','What must pass before a change lands','LUCI CV',
  ['Computes each repo\'s required checks from infra-config and its manifest',
   'Rulesets and the merge queue as code, applied by one command',
   'Agnosticism guard: no core file may name a language or tool',
   'Gate timing (queue to verdict) into the scorecard'],
  ['qqgate (0 pass, 1 refused, 2 undecided, 3 not onboarded)','settings/github.toml','scripts/apply.sh one-liner'],
  'GAT-01, 02, 04 and ORG-03','c372136','Repo rulesets applied at 6610664; org rulesets off (GitHub Free)',
  'GAT-03 waits on owners; promotion-gate required: decided; turns on with the next settings run',
  ['Result reuse','Admission bar enforcement','Tree status in the gate']),
 ('gardener','Keeps main green','Sheriff-o-Matic, LUCI Bisection',
  ['Checks the tree every 5 minutes and publishes status per repo',
   'Groups failures, finds the culprit by bisection',
   'Opens clean revert PRs within the cap of 10 per 24 h',
   'Writes a failure record and postmortem stub per revert'],
  ['tree-status branch: status/<repo>.json','ledger branch (after a manual bootstrap run)','auto_revert.toml caps'],
  'GAR-01..04 and audit fixes','bf7d24d','Tree status published; both repos open',
  'Its GitHub App, not yet created (needed before exit test 4 can pass): until then it reports reverts but opens none',
  ['Test-failure reverts','Revert precision','Postmortem drafting agent','Canary bisection']),
 ('rollers','Keeps dependencies and toolchains current','AutoRoll',
  ['Ships Dependabot config to each product repo',
   'qq-roll-land checks that a roll is a clean patch or minor bump',
   'Rolls toolchain pins from promoted.toml as PRs from the quirqer App',
   'Weekly toolchain rotation'],
  ['.github/dependabot.yml','qq-roll-land.yml','branch qq-roll/toolchains'],
  'ROL-01, ROL-02 and lockfile tree check','4285aa4','Dependabot config on both repos; first roll innernet #43 (TS 5→7, a major bump the land check does not treat as clean) merged by hand',
  'Auto-land is off: a person merges every roll',
  ['Weekly rolls for every pin (v2: cross-repo rolls with canary feedback)']),
 ('release','lkgr, channels and the daily canary','lkgr finder, promote.py',
  ['Moves lkgr to the newest all-green main commit every 10 minutes',
   'Channel pointers with digests, and rollback',
   'Daily canary at 06:17 UTC: build, test, deploy and probe, then move channels/canary',
   'Writes a daily canary report; a watchdog starts a canary GitHub dropped'],
  ['release-state branch','channels.json (qq-channels/1)','qq channel rollback'],
  'REL-01..04 and audit fixes','83ef917','lkgr at both repos\' current main; first canary shipped both repos 2026-10-05 (day 1 of 7, started by hand) in release-state d08a2fd',
  'Days 2 to 7; product-repo git refs need the release executor (the canary itself does not)',
  ['Canary soak and automatic rollback','Canary fuzz stage','Dev channel','Escalation']),
 ('installer','Installs follow a channel, not main','Omaha',
  ['Reads release\'s channels.json for a repo and channel',
   'Resolves the commit and digest, then checks out and verifies exactly that',
   'v0 scope: xo-space test installs only, never real users\' machines'],
  ['qqinstall resolve --repo xo-space --channel canary','qqinstall checkout · verify','exit 0 ok, 1 mismatch, 2 error, 3 not published'],
  'INS-01, INS-02 with audit fixes','d39f302','Has a canary to resolve for both repos (since 2026-10-05)',
  'Canary test machines are not set up yet',
  ['Test installs follow dev (v2: xo-space follows a channel)']),
 ('perf','Performance on every commit','perf dashboard, Pinpoint',
  ['Records a benchmark per main commit for both repos, and innernet\'s build size',
   'Stores raw numbers with unit and runner type as test-pipelines bundles',
   'A record only in v0: never a gate or an alert'],
  ['perf-data branch','infra-config config/perf.toml','benchmarks: xo-space-server-start, innernet-search'],
  'PRF-01, PRF-02 and audit fixes','d1d9765','Recording main commits on perf-data (newest record 2026-10-05 02:27 UTC)',
  'One measurement per commit on shared runners, no baseline',
  ['Trend and threshold alerts','Bundle-size budget']),
]

ids = []
for n, (name, job, chromium, does, uses, deliv, main, live, open_, nxt) in enumerate(R, 1):
    sid = 'repo-' + name
    ids.append(sid)
    left = (card(label('WHAT IT DOES') + items([e(x) for x in does], size=24), gap=14, pad=24, extra='flex:1')
            + card(label('YOU MEET IT AS') + items([code(x) for x in uses], size=24), gap=10, pad=24))
    right = (card(label(f'v0 · AS OF {ASOF}') +
                  items([f'<b>Merged:</b> {e(deliv)}', f'<b>main:</b> {code(main)}', f'<b>Live:</b> {e(live)}',
                         f'<b style="color:{AMB}">Open:</b> {e(open_)}'], size=24), gap=12, pad=24, extra='flex:1')
             + card(label('NEXT IN v1') + items([e(x) for x in nxt], size=24, color=INK2), gap=10, pad=24))
    body = (head(f'REPO {n} OF 13 · CHROMIUM: {chromium}', f'<span style="font-family:\'JetBrains Mono\'">{e(name)}</span><span style="color:{INK3}"> · {e(job)}</span>', size=56)
            + f'\n  <div style="display:flex;gap:32px;flex:1"><div style="display:flex;flex-direction:column;gap:24px;flex:1.1">{left}</div><div style="display:flex;flex-direction:column;gap:24px;flex:1">{right}</div></div>')
    open(os.path.join(OUT, sid + '.html'), 'w').write(section(sid, body, gap=28))
print(' '.join(ids))
