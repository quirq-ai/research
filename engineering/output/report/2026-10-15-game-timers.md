# Nothing Runs While You're Gone

A build timer in Clash of Clans is one integer on one row. It is also the cheapest server design anyone has found for a game with a hundred million players, and the mechanism that decides when you next open the app. This is a short note on how the two halves are the same object: the state model that makes these games nearly free to run is the state model that makes them hard to put down — and where that stops being a fair trade.

By **Suraj Sharma**, XO Labs · Product Engineering. First published 28 September 2026 as *Nothing Runs While You're Gone* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/game-timers).

Source: [`game-timers/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/game-timers/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> I have not seen any of these games' source. *\[from the record\]* marks something publicly documented or directly observable in a shipped client — a published talk, a stated design, behaviour anyone can reproduce by playing. *\[reconstruction\]* marks mechanism I have inferred from that behaviour, which is a guess with reasons and may be wrong in its details. *\[computed here\]* marks arithmetic done for this page from the assumptions printed beside it. Where a number would have to come from a company's internal dashboard, I have left it out rather than invent it.

## 01 · One object, two jobs

When you start an upgrade in Clash of Clans, almost nothing happens. A row acquires a field: `finish_at`, one integer, some seconds in the future. No job is enqueued. No worker wakes up. Nothing on any server will think about your barracks again until you come back and look at it.

That single field is doing two jobs at once, and the argument of this note is that they are not really two.

To the backend, `finish_at` is the cheapest possible representation of work in progress. It replaces a queue, a scheduler and a worker pool with arithmetic performed on read. It is why a game with a hundred million installs can keep every active player's entire world in memory on a rack of ordinary machines, and why the servers are close to idle while most of the player base is asleep.

To the player, the same field is an appointment. It is the answer to "when should I open this again?", and it is the content of the push notification that asks. The game's whole rhythm — the reason you check in at lunch, the reason a three-day upgrade feels different from a four-hour one — is a set of timestamps chosen by a designer.

**Figure 1. The same field, read from both sides**

![A single database row containing a building id, a level and a finish-at timestamp, with an arrow to the left reading it as a server-side saving — no queue, no worker, state computed on read — and an arrow to the right reading it as a player-facing appointment: a countdown, a notification, and a session.](2026-10-15-game-timers/fig-01-thesis.svg)

The economy of the design is exactly the source of its grip. That is worth stating plainly before admiring either half.

The first half of this note is about the data structures, because they are genuinely good engineering and most of them transplant cleanly into software that has nothing to do with games. The second half is about what those structures are used for, where the line between a fair loop and an extractive one falls, and why the line is easier to see from the schema than from the marketing.

One caveat before starting, repeated from the badge note above: I have not seen any of these games' source code. What follows is reconstructed from behaviour anyone can observe by playing, from what the clients visibly send and render, and from the general shape of how these backends are publicly discussed. The reasoning is reproducible; the internals are a guess with reasons.

## 02 · The village is a small document

The natural way for a web engineer to model a village is a `buildings` table with a foreign key to a player. For a hundred million players that is forty billion rows, an index, and a transaction every time anyone taps anything. These games do the opposite: the player is the aggregate, the village is one document, and it is startlingly small.

Everything a player can change belongs to that player. Nothing in the core loop touches another player's state. That single ownership property is what lets the whole village be stored, loaded, mutated and written back as one value — no joins, no locks, no distributed transaction, no partial write to reconcile.

**Figure 2. A whole village, field by field — and the table it points into**

![On the left, a packed player record: one hundred buildings at nine bytes each, three hundred walls at four bytes each, thirty-two bytes of resources, two hundred bytes of army state and two hundred bytes of progression, totalling 2,532 bytes, against 18.2 kibibytes for the same thing as JSON. On the right, the shipped config table keyed by type and level holding cost, build time, capacity and hit points, with a note that the save stores only ids and levels.](2026-10-15-game-timers/fig-02-village.svg)

*\[computed here\]* — sizes from the encoding printed in the figure, not measured from a shipped client. The exact totals do not matter; the order of magnitude does, and it is kilobytes.

### Why the split is the important part

The save holds identity and progress — *which* building, *where*, at *what level*, finishing *when*. It never holds a number a designer might want to change. Cost, duration, capacity, damage and hit points all live in a config table keyed by `(type, level)`, identical for every player, shipped with the client and held by the server. *\[reconstruction\]*

Three consequences follow, and they are the reason these games can be rebalanced weekly:

- **Rebalancing touches no player data.** Halving an upgrade cost is an edit to a table, not a migration across a hundred million documents. The old saves are still correct; they just mean something different now.
- **The client can be trusted to render but not to decide.** Both sides hold the same table, so the client can draw an accurate countdown and a correct cost without asking; the server recomputes anyway before committing anything.
- **Config is versioned.** A stored battle or an old save resolves against the table version it was recorded under, which is what keeps replays from quietly changing meaning after a patch — see [§5](#05-commands-not-state).

At this size the population arithmetic stops being interesting, which is the point. A hundred million packed villages is about 253 GB; ten million daily players is about 25 GB resident. *\[computed here\]* Nobody would actually run that on one machine, but the fact that they could is what makes the next section's design available at all: if the working set fits in memory, you do not need a database in the hot path — you need a way to write it down occasionally.

## 03 · Nothing runs while you are gone

Here is the rule the whole genre runs on: never schedule work for something that is a pure function of elapsed time. If the answer can be computed from a timestamp and a rate, do not maintain it — derive it, at the moment somebody asks.

It shows up in exactly two shapes.

    // discrete — a thing finishes
    done = now >= finish_at

    // continuous — a thing accumulates
    amount = min(capacity, stored + rate × (now − last_collected))

The second is the one worth staring at. A resource collector filling for nine hours performs no writes during those nine hours and takes no memory beyond the two numbers already in the record. The integral has a closed form, so the loop that would have computed it is replaced by a multiply. The purest shipped example is Candy Crush's lives: five maximum, one every thirty minutes, which is exactly `min(5, stored + (now − last) ÷ 30 min)` evaluated on open. *\[from the record\]* It is also why setting your phone's clock forward used to refill them, and why every game that learned that lesson now derives `now` from the server.

**Figure 3. Twelve hours offline, under two designs**

![Two timelines over twelve hours of a player being offline. The top lane, a tick loop, shows continuous ticks across the whole period and costs four billion field updates per second across ten million daily players. The bottom lane, lazy resolution, is empty across the whole period and has a single resolve step at login, costing 347 resolutions per second in aggregate, or about 139 thousand field touches per second — 28,800 times less.](2026-10-15-game-timers/fig-03-lazy.svg)

*\[computed here\]* — from the stated assumptions, not from anyone's capacity planning. The ratio is the point: the difference between these two designs is not a percentage, it is four to five orders of magnitude, and it is available for free to anything whose state is a function of elapsed time.

### The parts that are not about cost

Cheapness is the obvious benefit and not the best one. Three others matter more in operation:

- **No drift.** A tick loop that falls behind produces state that is subtly wrong and stays wrong. Derived state is exact by construction, because it is recomputed from the clock every time.
- **Outages cost nothing.** If the service is down for an hour, no timers are "missed" and there is no catch-up storm on recovery; the arithmetic simply spans the gap. Compare a cron-driven design, where an hour of downtime means an hour of backlog arriving at once.
- **No thundering herd.** Nothing fires at midnight for everybody, because nothing fires at all. Load follows players, and players arrive smoothly.

### Where the trick stops working

Two honest limits. First, anything that must happen whether or not the player shows up — a clan war ending, a season closing, a leaderboard resetting — still needs a real scheduler. These games keep one; it just runs global events, not per-player ones, so it is sized by the number of clans and seasons rather than the number of players. Second, the clamp at capacity destroys information on purpose: once a collector is full, the record no longer knows how long it has been full. That loss is not an oversight. It is the mechanism that turns a full collector into a reason to come back, which is [§7](#07-the-timer-economy).

## 04 · One player, one actor

Once the working set fits in memory and every write is owner-scoped, a third decision becomes available that most web backends cannot make: hold the player's whole state in memory, in one place, and let exactly one thread touch it.

The pattern is the actor model in its plainest form. A player is an object with a mailbox. Commands arrive, are applied one at a time in arrival order, and mutate in-memory state directly. Nothing else in the system has a reference to that state. Periodically — on a timer, on session end, on a significant event — the object is serialised and written down. *\[reconstruction\]*

**Figure 4. Ownership, and the one place it is shared**

![Three player actors each own their own village state and write periodic snapshots to storage. Above them a clan actor owns chat, donations and war state. Messages flow between player actors and the clan actor, labelled as idempotent and eventually consistent. A caption notes that no player actor ever reads another player actor's memory.](2026-10-15-game-timers/fig-04-actor.svg)

*\[reconstruction\]* — the shape is inferred from behaviour: actions apply instantly and strictly in order, a lost connection rolls back to a save point rather than leaving half a transaction, and clan state is visibly a little behind. Those are the symptoms of in-memory single-owner state with periodic persistence.

### What disappears

Locks, for a start. There is nothing to contend over, because there is exactly one writer per piece of state and it is single-threaded. With them go optimistic-concurrency retries, lost-update bugs, read-modify-write races, and the entire category of "two taps arrived at once". A tap is a message; messages are processed in order; the order is whatever arrived first. Correctness by structure rather than by discipline.

The database also disappears from the hot path. It stops being the system of record consulted on every action and becomes a place where snapshots go. Read latency stops mattering because there are no reads; write throughput becomes a function of session count rather than action count, which is the 347 writes per second from the previous section instead of one per tap.

### The one place it is shared, and how that is handled

Clans are the exception and the design treats them as one. A clan is its own owner with its own mailbox, and every interaction across the boundary is a message rather than a shared read. Donations are the clearest case: a request is a record, a fulfilment is a command against it, and if two clanmates fill the last slot simultaneously one of them is told they were too late. No two-phase commit, no cross-actor lock, and the failure mode is a minor social disappointment rather than an inconsistency. *\[from the record\]*

The generalisable rule is not "use actors". It is: **choose the ownership boundary so that almost all writes are single-owner, and make the remainder idempotent messages instead of transactions.** Games get to do this because a village genuinely belongs to one person. Most business software has at least one genuinely shared object, and the useful question is how small you can make it.

The honest cost: an in-memory actor with periodic persistence loses whatever happened since the last snapshot if its host dies. Games accept that — a few minutes of rebuilt progress is an annoyance, and they usually re-grant it. A ledger cannot accept it at any price. The design is right here precisely because the data is not money, and copying it into a system where the data *is* money is how this pattern goes wrong.

## 05 · Commands, not state

The client never tells the server what is true. It tells the server what the player did. "Place building 41 at (12, 30), at tick 9,412" — and the server applies that to its own copy and works out the consequences itself. That one discipline is simultaneously the anti-cheat boundary, the offline story, and the reason a battle replay fits in three kilobytes.

Both sides run the same simulation over the same config table from [§2](#02-the-village-is-a-small-document), so the client can apply a command immediately and show the result without waiting for a round trip, while the server recomputes the identical result at its own pace. The client is a predictor, not an authority. If the two disagree, the server is right and the client resynchronises — and a client that disagrees repeatedly is interesting for other reasons.

### A battle is a snapshot plus a list of taps

The payoff is clearest in combat. An attack is a sequence of placements: at tick *t*, drop unit *u* at *(x, y)*. Roughly eight bytes each, sixty of them in a busy raid. Because the engine is deterministic, replaying that list against the defender's village snapshot reproduces the battle exactly — every troop path, every wall break, every percentage.

**Figure 5. Three kilobytes that contain a three-minute battle**

![A defender snapshot of 2,532 bytes plus a command list of 60 placements at 8 bytes each plus a deterministic engine reproduces the battle exactly, for a total replay size of about 3 kibibytes, against 45 megabytes for a 3-minute video at 2 megabits per second — a ratio of 14,629 to one. At ten million daily players and five attacks each, that is 154 gigabytes of replay traffic per day against 2,250 terabytes of video.](2026-10-15-game-timers/fig-05-replay.svg)

*\[computed here\]* — from the encoding stated in the figure. That replays are re-simulations rather than recordings is directly observable: they render at your device's frame rate, in your UI language, and you can watch them at double speed. *\[from the record\]*

### Why nobody has to be online

The same property makes asynchronous player-versus-player possible, and asynchronous PvP is what lets a game span every timezone at once. You do not attack a person; you attack a *snapshot* of their village. There is no matchmaking queue to join and no session to negotiate — the server looks up a stored village near your rating in a sorted index, hands you a copy, and you play against it. The defender finds out afterwards, as a replay, which is itself a notification and therefore another appointment.

This is why the loop scales so unreasonably well. Two players interacting normally requires both online, a session, and a real-time transport. Snapshot combat requires one player online and a read from an index. The social experience is preserved; the coordination problem is deleted.

### The tax determinism charges

It is not free, and the costs are the reason many teams do not attempt it. Every source of non-determinism has to be hunted out of the simulation: floating-point behaviour must be constrained or replaced with fixed-point arithmetic, iteration order over collections must be stable, no wall clock may be read inside the simulation, and randomness must come from a seeded generator whose seed travels with the command list. Config must be versioned so an old replay resolves against the numbers it was recorded under rather than today's. And the simulation has to produce identical results across every platform the client ships on, which makes "rewrite this in the platform-native language" a permanent hazard.

What you buy for that tax is worth listing plainly, because it generalises well beyond games: instant local response with server authority, cheat detection by re-execution, replay as a first-class artefact, and an audit trail that is the same size as the input rather than the size of the output.

## 06 · Loops inside loops

A game like this is not one loop. It is five or six, running simultaneously, with periods separated by roughly an order of magnitude each. The design constraint that organises all of them is simple to state: whenever the player opens the app, something should be finishing.

**Figure 6. Six periods, placed on a log scale — what each one asks for and what it pays**

![A logarithmic time axis from ten seconds to ninety days, with six loops marked: a thirty-second tap-to-collect loop, an eight-minute raid or level loop, an eight-hour collector and short-upgrade loop, a two-day building upgrade loop, a two-week season or war loop, and a multi-month progression tier. Each is annotated with what the player does and what they receive, and the reward magnitude grows with the period.](2026-10-15-game-timers/fig-06-loops.svg)

Drawn to scale on a log axis, the structure is obvious: the periods are spaced so that they rarely align. If every loop closed at once you would get one enormous session and then a week of nothing.

### The rule of two timers

Strip the design down and a single heuristic remains: there should always be at least one short timer and one long timer running. The short one is the reason to open the app now — something is nearly ready, and waiting four minutes is cheap. The long one is the reason to open it tomorrow. Games that only have long timers feel dead between sessions; games that only have short ones have nothing to look forward to and lose players the moment the novelty fades.

This is why the periods are deliberately non-harmonic. A player who finished everything simultaneously would have a clean exit — nothing pending, nothing owed, a natural place to stop. Overlapping loops of different lengths mean there is no such moment, which is the part to look at squarely rather than to admire. It is an excellent piece of scheduling and it is designed to remove the natural stopping point, and both of those are true at once.

### The loops are shorter when you are new

Open one of these games for the first time and everything takes seconds. Upgrades finish while you watch, the first ten levels fall in a single sitting, rewards land constantly. The periods stretch as you progress — minutes, then hours, then days.

Half of that is honest teaching. A fast first session shows you the loop, demonstrates that progress is real, and gets you to the point where the game makes sense before asking you to wait for anything. The other half is an escalation: by the time an upgrade takes three days, you have a base you are attached to, a clan that notices when you are absent, and enough invested that the wait is tolerable. The curve is tuned so that the cost of waiting rises only as fast as your reason to accept it. [§8](#08-where-it-turns-extractive) is about where that stops being fair.

## 07 · The timer economy

A timer is an appointment. It names a moment and asks you to be there. Stack seven of them at different lengths and you have not built a feature — you have built a schedule for somebody else's day, and the schedule is the product.

**Figure 7. One day, seven concurrent timers, and the appointments they generate**

![A 24-hour axis showing seven concurrent timers for a mid-game player: troop training every 15 minutes drawn as a dense band, builders finishing at 4, 8 and 24 hours, a collector overflowing at 16 hours, and longer builders at 48 and 72 hours falling outside the day. Counting everything, 108 completion events per day; excluding timers under an hour, 12.3 per day, one every 1.9 hours.](2026-10-15-game-timers/fig-07-ladder.svg)

*\[computed here\]* — from the timer set printed in the figure, which is my estimate of a mid-game player's state rather than a measurement. The completion rate is just the sum of the reciprocals of the durations; the structure is what matters.

### Caps: urgency without taking anything

The clamp at capacity from [§3](#03-nothing-runs-while-you-are-gone) is doing motivational work. Because a collector stops when full, staying away costs you *foregone* production rather than anything you already had. That distinction is load-bearing. Losing stored progress makes people quit; missing out on progress they never held makes people set an alarm. The cap is therefore tuned to a target return interval: 200,000 capacity at 12,500 per hour overflows in 16 hours, which is roughly "once before bed and once after". *\[computed here\]*

### The second currency prices the first one's time

Soft currency is earned and spends time. Hard currency is bought and buys time back. Every one of these economies converges on the same exchange: gems, coins, whatever they are called, are fundamentally a price on skipping a wait. Which means the *length of a timer is a pricing decision*, and the price curve is worth looking at.

**Figure 8. Time, priced — an illustrative skip curve**

![A table of an illustrative skip-price model in which gems equal 74.28 times hours to the power 0.6. One hour costs 74 gems or 62 cents, at 62 cents per hour saved. Twenty-four hours costs 500 gems or 4 dollars 17, at 17 cents per hour saved. One hundred and sixty-eight hours costs 1,607 gems or 13 dollars 39, at 8 cents per hour saved. The price per hour falls as the wait grows.](2026-10-15-game-timers/fig-08-gems.svg)

*\[computed here\]* — from the model stated in the first line, chosen to reproduce the *shape* of published skip prices rather than any actual table. Treat the numbers as illustrative and the concavity as the observation.

The pricing sets up a two-sided constraint on duration. A timer must be long enough that skipping it is worth paying for, and short enough that waiting is tolerable. That is a narrow band, and it explains why durations in these games cluster in hours-to-days and almost never reach weeks.

Which makes the real lever the *builder count*, not the timer length. Limiting how many upgrades can run in parallel sells capacity rather than impatience: a second builder does not make any single wait shorter, it doubles how much waiting you can do at once. It is a structurally better product — the player gets a permanent improvement instead of a one-off skip, and the studio sells something that raises the value of every future timer. When one of these games has a single best-value purchase, it is usually this one.

### Why the daily loop gets so much attention

The commercial reason is arithmetic. If a player has a constant daily probability `r` of returning, expected lifetime is `1/(1 − r)` days, and that function is violently non-linear near the top: *\[computed here\]*

    daily retention   expected days   alive at d30   alive at d90   LTV at $0.05/day
          93%              14.3           11.3%          0.15%          $0.71
          95%              20.0           21.5%          0.99%          $1.00
          96%              25.0           29.4%          2.54%          $1.25
          97%              33.3           40.1%          6.45%          $1.67
          98%              50.0           54.5%         16.23%          $2.50
          99%             100.0           74.0%         40.47%          $5.00

One percentage point of daily retention, from 95% to 96%, is a 25% increase in the value of every install; from 97% to 98% it is 50%. No feature in the game is worth as much as a slightly better reason to open it tomorrow. That is the whole economic logic of everything above, and it is also the pressure that produces the mechanics in the next section.

## 08 · Where it turns extractive

Everything so far is value-neutral. A timestamp is not a moral object, and a game that respects your time can be built out of exactly the same parts as one that does not. The difference is not in the mechanic; it is in what the mechanic is being paid to do.

Here is the test I find most useful, and it has the advantage of being answerable from the schema rather than from intent: **does the mechanic make a promise the player can plan around, or does it manufacture a penalty for not showing up?** A build timer makes a promise. It finishes at a known moment, it waits for you indefinitely, and ignoring it costs nothing you had. A streak that resets does the opposite: it creates a quantity out of nothing, hands it to you, and then threatens it.

**Figure 9. The same mechanic, on both sides of the line**

| Mechanic | Promise-shaped version | Trap-shaped version |
|----|----|----|
| Waiting | A timer that finishes at a stated moment and waits for you | A window in which the reward must be claimed or it is destroyed |
| Accrual | A cap, so absence costs foregone production and nothing else | Decay, so absence costs progress you already earned |
| Deadlines | A season with a published end date and a visible reward track | A countdown on an offer that reappears whenever you decline it |
| Sessions | Energy that runs out at the end of a task | Energy calibrated to run out mid-task, with a refill button |
| Purchases | A permanent capability at a stated price — the extra builder | A randomised reward at a stated price, with the odds unstated |
| Protection | A shield granted automatically after you are beaten | A shield sold to you while you are being beaten |
| Other people | A war you opted into, with a known start and finish | A loop where your absence visibly costs your friends something |

Every row is the same piece of engineering. What changes is whether the value to the business comes from the player getting what they wanted, or from the player failing to.

### A sharper version of the test

If the schedule, the odds and the prices were printed on the box, would the mechanic still work?

Build timers pass easily. Publishing "this upgrade takes three days and skipping it costs about four dollars" changes nothing; players already know and plan around it. Season passes pass — the whole track is visible when you buy it. Randomised paid rewards with undisclosed odds fail by construction: their commercial performance depends on the buyer misjudging the distribution, which is why disclosure requirements changed them materially where they were imposed. Several regulators have acted on this since the late 2010s — probability disclosure was mandated in China, Belgium's gaming regulator took the position that certain paid random rewards fell under gambling law, and various age-appropriate design codes have since constrained how these mechanics may be aimed at children. The specifics vary by jurisdiction and have moved repeatedly; the direction has not. *\[from the record\]*

### The structural problem, not the individual trick

The uncomfortable part is not any one mechanic. It is the revenue shape. Industry analyses routinely report that only a low single-digit percentage of players in a free-to-play title ever pay, and that a small fraction of those payers produce most of the revenue. *\[from the record\]* Whatever the exact numbers in a given game, the consequence is structural: the design is optimised against the behaviour of its heaviest spenders, and the population of heaviest spenders is not a random sample of people. It over-represents exactly those for whom "one more purchase to skip the wait" is hardest to refuse.

You do not need to attribute bad intent to anyone to see the problem. A team doing ordinary, competent A/B testing against revenue will drift toward mechanics that work on that tail, because those are the mechanics that move the metric. The drift is emergent, and it is why the honest guardrails in this space are structural too — spending caps, disclosed odds, real cooling-off periods, age gates that actually gate — rather than appeals to restraint.

My own position, briefly, because a note like this should state one: the engineering in sections 2 through 5 is some of the best cost-per-user design in the industry and deserves to be copied widely. The scheduling in section 6 is legitimate when the thing being scheduled is real. The line is crossed at the point where revenue depends on regret — and that point is visible in the data model, because it is where you find a field whose only purpose is to be taken away.

## 09 · What the rest of us should steal

The engineering half of this note transplants almost without modification, and most of it costs nothing to adopt. Four things are worth taking, and one is worth taking carefully.

**Figure 10. Four transplants, and the class of bug each one deletes**

![Four rows. Lazy accrual replaces cron jobs with a timestamp and a formula, and deletes backlog, drift and thundering herds. Commands with sequence numbers replace state PUTs and delete lost updates and unsafe retries. Owner-scoped documents replace cross-entity transactions and delete lock contention. A deterministic core makes replay possible and deletes the argument about what happened.](2026-10-15-game-timers/fig-10-steal.svg)

None of these is novel; all four are standard techniques. What the games demonstrate is that you can adopt all four at once and end up with *less* machinery than the conventional design, not more.

### Lazy accrual is the one most teams are missing

Look for any scheduled job whose output is a pure function of elapsed time and delete it. Trial countdowns, credit top-ups, quota resets, subscription entitlement, aging counters, anything that "fills up". Store the last update and the rate; compute the value on read. Rate limiters already work this way — a token bucket is exactly `min(cap, tokens + rate × Δt)` — which is a good sign the pattern holds up in infrastructure, and a strange one that it so rarely escapes that corner of the stack.

### The audit case, which is where I actually use this

The replay structure in [§5](#05-commands-not-state) is the one worth internalising if you work on agents. A battle is auditable because it is a snapshot plus a command list plus a deterministic engine: three kilobytes that can be re-executed to check a claim. A recording of the same battle is fifteen thousand times larger and proves nothing, because you cannot re-run it.

Agent sessions have the same shape and are usually stored the wrong way round — a long transcript, which is a recording, rather than an environment snapshot plus the commands that were issued against it. I made this argument at more length in [The State Is Enough](2026-10-15-markov-processes.md): the transcript is an observation, the environment is the state, and evidence has to be captured from the state. The games got there first, for the entirely mercenary reason that video is expensive and determinism is free.

### And the product transplant, with care

Appointments are legitimate when the thing genuinely finishes and the user asked for it. A long build completing, a large import finishing, a scheduled report becoming ready — these are real events, and telling someone about them respects their attention rather than competing for it. The engineering test from [§8](#08-where-it-turns-extractive) transfers directly and is easy to apply in a code review: is there a `finish_at` that corresponds to something actually finishing? If the notification exists because engagement was down, there is no `finish_at` — there is only a calendar entry with your product's name on it, and the user will eventually work that out.

## 10 · Sources

This note has an unusual evidence profile and it is worth being blunt about it. There is no checkout to cite. Almost everything here is either behaviour anyone can reproduce, arithmetic done from stated assumptions, or inference — and the three are not equally reliable.

### A. Directly observable, by playing

- **Clash of Clans** (Supercell, 2012) — build timers with a stated finish time and a gem cost to skip, a fixed number of builders, resource collectors that fill to a cap, shields, clans with chat and donations, clan wars on a fixed schedule, and attacks against offline players.
- **Battle replays** — that these are re-simulations rather than video is observable: they render in your UI language at your device's frame rate, can be watched at increased speed, and are shared as small messages rather than files.
- **Candy Crush Saga** (King, 2012) — five lives, one regenerating every thirty minutes to a cap of five; the canonical clamped closed-form accrual, and historically the canonical device-clock exploit.
- **Hay Day, Coin Master, Royal Match, Monopoly Go** and the idle/AFK genre generally — the same two primitives (a finish time, a capped accrual rate) in different costumes, with offline progress computed on return.
- **Client behaviour** — actions applying instantly with no round trip, a lost connection rolling back to a save point rather than leaving partial state, and clan state visibly lagging your own.

### B. Publicly discussed engineering

- The general shape of these backends — in-memory per-player state, single-owner mutation, periodic persistence, deterministic simulation shared between client and server — has been described in conference talks and engineering write-ups by studios in this space over the last decade. I have summarised the pattern rather than any one talk, and I have not attributed any specific implementation detail to any specific company.
- **Deterministic lockstep and command-list replays** are long-standing, well-documented practice in real-time strategy games; the technique predates mobile free-to-play by roughly two decades and the constraints it imposes (fixed-point arithmetic, seeded randomness, stable iteration order) are standard.

### C. The design and retention literature

- **Appointment mechanics, variable-ratio reinforcement and loss aversion** are standard vocabulary in game design and behavioural economics; the reinforcement-schedule results go back to the operant-conditioning literature of the mid twentieth century, and loss aversion to Kahneman and Tversky.
- **Free-to-play revenue concentration** — that a low single-digit percentage of players pay, and that a minority of those produce most revenue, is reported consistently across industry analyses. I have deliberately not quoted a precise figure, because the published ones vary by title, genre and year.
- **Regulation of paid random rewards** — probability disclosure requirements in China from 2017, the Belgian gaming regulator's 2018 position on certain loot boxes, and subsequent age-appropriate design codes in several jurisdictions. Details differ by jurisdiction and have changed more than once; treat the direction as the claim, not the specifics.

### D. The computed numbers

- `game-timers/_compute.py` in this repository — pure-stdlib Python. It produces the record and fleet sizes of §2, the lazy-versus-tick comparison of §3, the replay arithmetic of §5, and the appointment density, overflow times, illustrative skip curve and retention table of §7. Every block states its own assumptions in the source; changing them changes the outputs and not the argument.

**Provenance.** What is observed: everything in group A, which you can reproduce by installing the games. What is computed: every figure carrying a *\[computed here\]* badge, from the assumptions printed in that figure — these are exact for the model and are not measurements of any shipped system. In particular, the record sizes, the traffic figures, the appointment density and the skip-price curve are constructions of mine chosen to have the right shape and order of magnitude; none of them is a number from a real game's telemetry, and the skip curve explicitly is not any published price table. What is inferred: everything about server internals — the actor-per-player model, the config/save split, periodic persistence, the ownership boundary around clans. These are badged *\[reconstruction\]* and are guesses with reasons; they fit the observable behaviour, and so would other designs. What I did not do: talk to anyone who works on these games, inspect a binary, or capture network traffic. Where a claim would have required a company's internal data, I have either left it out or marked its range as uncertain rather than inventing a figure.
