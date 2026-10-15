# Foundations at a glance

suraj's explainers on computer science and mathematics, in one page: Markov
processes, the state model of timer-driven mobile games, and the ten hardest
open problems in mathematics. The first two were published on 28 September
2026. The problems survey was published on 21 August 2026 and describes each
problem as of August 2026. All three are read from his writings at `a5a356d`.

## The claim

> The context is not the state; it is an *observation*, assembled by the
> agent's own past tool calls, truncated when it grows, and summarised when
> it is truncated. The state is the environment — the working tree, the
> services, the external systems the tools reach.

From [The State Is Enough](../report/2026-10-15-markov-processes.md#13-agent-loops-as-processes),
§13, labelled *[my framing]*.
[Nothing Runs While You're Gone](../report/2026-10-15-game-timers.md#the-audit-case-which-is-where-i-actually-use-this)
reaches the same point from battle replays.

## In numbers

| | |
|---|---|
| **92.97%** | end-to-end success of a four-attempt retry policy at 70% per attempt *[computed here]* |
| **160×** | less queueing for 32 servers sharing one queue than for one server, both at 80% utilisation *[computed here]* |
| **17×** | gap at p99.99 between an exponential and a Pareto with the same 100 ms mean *[computed here]* |
| **28,800** | times less work when timers resolve at login than in a tick loop, for ten million daily players *[computed here]* |
| **14,629** | to one: a battle replay of about 3 kibibytes against a 3-minute video *[computed here]* |
| **3.012*n*** | gates: the best proved circuit lower bound for an explicit function; P ≠ NP needs a superpolynomial one |
| **5,372** | states in a Turing machine that halts if and only if the Riemann hypothesis is false (Yedidia and Aaronson, 2016) |
| **0.95** | suraj's forecasts for the eleven entries, summed: slightly fewer than one falls by 2050 (his judgment) |

## Where to go next

| Read | For |
|---|---|
| [The State Is Enough](../report/2026-10-15-markov-processes.md) | The Markov assumption, what it buys in computing from PageRank to sequence models, and six ways it fails; 21 figures |
| [Nothing Runs While You're Gone](../report/2026-10-15-game-timers.md) | How timer games keep state cheap, reconstructed from play; where the timer economy turns extractive; what to transplant; 10 figures |
| [The ten hardest open problems in mathematics](../report/2026-10-15-hardest-problems.md) | Ten problems as of August 2026, where mathematics really is NP-hard or undecidable, and a dated forecast to 2050; 15 figures |

## How it connects

Each explainer has a passage on agents.

- **Agent sessions.** The Markov essay treats a session as partially
  observed, and an episode as "a unit of work with a beginning, an end, and
  a verification step". The framing is "not a model you can solve"
  *[my framing]*.
  ([§13](../report/2026-10-15-markov-processes.md#13-agent-loops-as-processes))
- **Snapshots plus commands.** A battle replay can be re-executed to check a
  claim. Agent sessions "are usually stored the wrong way round".
  ([§09](../report/2026-10-15-game-timers.md#the-audit-case-which-is-where-i-actually-use-this))
- **Machines in mathematics.** As of August 2026, no machine has produced a
  proof of a first-rank open conjecture.
  ([§15](../report/2026-10-15-hardest-problems.md#the-machine-question))

## Open questions

- Do the quantities the Markov essay cites hold against the primary papers?
  suraj cites them from the published record and names four to check before
  reuse: Markov's letter counts, the PageRank iteration count, the optimal
  acceptance rates and DDPM's step count.
  ([§15](../report/2026-10-15-markov-processes.md#f-the-computed-numbers))
- Are the game-server internals right? They are *[reconstruction]*: they fit
  the observable behaviour, "and so would other designs".
  ([§10](../report/2026-10-15-game-timers.md#d-the-computed-numbers))
- Which of the four bets in the dated forecast hold?
  ([§16](../report/2026-10-15-hardest-problems.md#what-the-column-adds-up-to))

Related issues on this repo:
[#26 Markov model of agent runs](https://github.com/quirq-ai/research/issues/26),
[#39 a first dataset from PR histories](https://github.com/quirq-ai/research/issues/39) and
[#40 the held-out test and baselines](https://github.com/quirq-ai/research/issues/40).

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[markov-processes](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/markov-processes)
([`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/markov-processes/index.html)),
[game-timers](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/game-timers)
([`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/game-timers/index.html)) and
[hardest-problems](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/hardest-problems)
([`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/hardest-problems/index.html)).
