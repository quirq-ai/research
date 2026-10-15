# The State Is Enough

A Markov process is a bet: that you can choose a description of "now" so complete that the past adds nothing. This is what that bet buys — matrices you can raise to a power, stationary distributions, mixing times — and where computer science has cashed it: PageRank, MCMC, Viterbi, Kalman, MDPs and reinforcement learning, branch predictors, cache models, queueing and capacity planning, and the state-size fight between attention and state-space models. It closes with where the bet loses.

By **Suraj Sharma**, XO Labs · Foundations. First published 28 September 2026 as *The State Is Enough* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/markov-processes).

Source: [`markov-processes/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/markov-processes/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the literature\]* marks a definition, theorem or result stated in a published source named in the sentence or in [Sources](#15-sources). *\[computed here\]* marks a number produced for this page by running the model printed next to it — every such figure states its own inputs, so the arithmetic can be redone. Framing, analogies and the reading of modern architectures are mine unless a source is named; the closing provenance note says what was not verified.

## 01 · The memoryless bet

A Markov process does not claim that the past is irrelevant. It claims that you have found a way to write down the present which already contains everything about the past that matters. That is a modelling decision, and it is almost always yours to make.

Take a sequence of random variables `X₀, X₁, X₂, …` taking values in a set `S` of states. The sequence has the **Markov property** if, for every time `t` and every history you could have observed:

    Pr[ X₍ₜ₊₁₎ = s | Xₜ = xₜ, X₍ₜ₋₁₎ = x₍ₜ₋₁₎, …, X₀ = x₀ ]  =  Pr[ X₍ₜ₊₁₎ = s | Xₜ = xₜ ]

Everything to the left of the bar except `Xₜ` is decoration. Stated the other way round, it is a conditional independence: the future is independent of the past *given* the present. The present acts as a screen. *\[from the literature\]*

**Figure 1. The present as a screen — what the Markov property forbids**

![A row of six states X0 to X5 joined by arrows. A vertical band marks the present state X3. Two dashed arrows that would jump from X0 and X1 directly to X4 are struck through, showing that the past may influence the future only through the present. Below, a caption band distinguishes the process from the state space.](2026-10-15-markov-processes/fig-01-screen.svg)

The property is a ban on edges, not a ban on memory. Anything the future needs is allowed to live inside the circle marked *the present* — and deciding what goes in that circle is the whole craft.

### Two assumptions, usually bundled together

Almost every practical result quietly needs a second assumption: **time-homogeneity**, that the transition law is the same function at every step. The Markov property alone permits a process whose rules change each tick; the moment you write down a single transition matrix `P` and raise it to a power, you have assumed homogeneity as well. It is the assumption that fails first in production — traffic at 03:00 is not traffic at 13:00 — and [§14](#14-where-the-bet-loses) returns to it.

### Order-k is first-order in disguise

Suppose the next symbol depends on the last two, not the last one. The process is not Markov on the alphabet, and it is Markov on *pairs*: define `Yₜ = (X₍ₜ₋₁₎, Xₜ)` and the dependence becomes one step again. Nothing about the world changed. The state space did.

**Figure 2. An order-2 process on two symbols, redrawn as an order-1 process on four**

![On the left, a process over symbols a and b whose next symbol depends on the previous two. On the right, the same process as a first-order chain over the four pairs aa, ab, ba, bb, with each pair having exactly two outgoing edges. A note records that the state count grows as the alphabet size raised to the order.](2026-10-15-markov-processes/fig-02-order-k.svg)

Augmentation always works and is never free. The right-hand chain is memoryless because the memory has been moved into the node labels; the last line is the price, and it is the reason Figure 8 exists.

### Where the idea came from

Andrey Markov introduced these chains in 1906 to settle an argument. Pavel Nekrasov had asserted that the law of large numbers required independent trials — a claim he attached to an argument about free will. Markov's answer was to construct dependent sequences that obey the law anyway. *\[from the literature\]* In 1913 he gave the first empirical demonstration by hand-tallying the first 20,000 letters of Pushkin's *Eugene Onegin* as a two-state chain over vowels and consonants: 8,638 vowels and 11,362 consonants, with a vowel following a vowel about 13% of the time and a vowel following a consonant about 66% of the time. The dependence is enormous, and the averages converge regardless. The first Markov chain ever fitted to data was a language model.

It stayed one. Shannon's 1948 *A Mathematical Theory of Communication* defines a discrete information source as exactly this object — "a Markoff process" — and its famous ladder of approximations to English, from letter frequencies up to second-order word statistics, is a ladder of Markov models of increasing order. Everything in [§12](#12-sequence-models-and-the-size-of-the-state) is a continuation of that experiment with a bigger budget.

### The question is never "is it Markov?"

It is "Markov *with respect to what state?*" The question has no answer until the state is named, and naming it well is the engineering. Two examples that make the point sharply:

- **Chess.** Piece placement alone is *not* a Markov state: whether castling is legal, whether an en-passant capture is available, and how close you are to the fifty-move draw all depend on history. Forsyth–Edwards Notation carries exactly four extra fields — side to move, castling rights, en-passant target, halfmove clock — and with them the position becomes a Markov state. The file format is a record of someone solving this problem.
- **A TCP sender.** "The last byte I sent" is not a state. Congestion window, slow-start threshold, bytes in flight, the smoothed round-trip estimate and the retransmission timer very nearly are — which is why that tuple is what the kernel actually stores per connection.

In both cases someone chose a state that makes the process memoryless, and the choice shows up as a data structure. That is the pattern this whole essay follows: find the state, and the mathematics of the next section becomes available to you.

## 02 · Four kinds of chain

"Markov process" names a family, not a model. Two independent choices — whether time ticks or flows, and whether the state is countable or not — produce four families, and each one owns a different corner of computer science. Two further extensions change the index set or add a decision, and both keep the name.

**Figure 3. Four families, the object that describes each, and where computing uses it**

![A two by two grid. Columns are discrete state and continuous state; rows are discrete time and continuous time. Each cell names the model family, the mathematical object that defines it, and computing examples: discrete time discrete state gives Markov chains defined by a transition matrix, used for PageRank, n-grams and branch predictors; discrete time continuous state gives state space models defined by a transition kernel, used for Kalman filters and diffusion models; continuous time discrete state gives continuous time Markov chains defined by a generator matrix, used for queueing and reliability; continuous time continuous state gives diffusions defined by a stochastic differential equation, used for Brownian motion and Langevin dynamics. A band below shows two extensions: Markov random fields and Markov decision processes.](2026-10-15-markov-processes/fig-03-quadrants.svg)

The mathematics is the same idea four times: an operator that pushes a distribution forward one unit of time. What changes is whether that operator is a matrix, an integral kernel, a matrix exponential, or a differential equation.

### Discrete time, discrete state

The default meaning of "Markov chain". The transition law is a finite table, which is why this cell is where computing spends most of its time: a table can be stored, inverted, raised to a power, and learned by counting. Everything in [§3](#03-the-arithmetic-it-buys-you) lives here.

### Discrete time, continuous state

The state is a vector and the "matrix" becomes a kernel: a probability density over where you land next. Two special cases carry most of the weight. If the transition is linear and the noise Gaussian, the whole filtering problem has a closed form — that is the Kalman filter ([§8](#08-hidden-state-viterbi-baum-welch-kalman)). If the transition is "add a calibrated amount of Gaussian noise", you have the forward process of a diffusion model ([§12](#12-sequence-models-and-the-size-of-the-state)).

### Continuous time, discrete state

Events happen at instants rather than on a clock: a request arrives, a disk fails, a node learns a rumour. The describing object is not a matrix of probabilities but a matrix of *rates*, the generator `Q`, and the arithmetic goes through a matrix exponential. This is the cell performance engineering and reliability engineering both live in, and [§4](#04-continuous-time-and-the-forced-exponential) is about why memorylessness forces the exponential distribution on you here.

### Continuous time, continuous state

Both limits taken at once: diffusions, described by stochastic differential equations. Computationally you almost always discretise back into the cell above it, which is why Langevin dynamics appears both as an SDE in the theory and as a loop with a step size in the code.

### And two things that are not chains but keep the name

A **Markov random field** replaces the timeline with a graph. The property becomes: a node is conditionally independent of all others given its neighbours. That is the assumption under image denoising, the Ising model, and conditional random fields — and the "Markov blanket" of a node in a Bayesian network is the same idea named differently.

A **Markov decision process** inserts a choice into the transition, `P(s′ | s, a)`. The process stops being something you observe and becomes something you steer, which is the entire subject of [§9](#09-decisions-mdps-and-reinforcement-learning). Add partial observability on top and you get a POMDP, where the Markov state is no longer visible and you must carry a belief instead — the subject of [§5](#05-the-state-is-a-design-choice).

## 03 · The arithmetic it buys you

Memorylessness converts a question about histories into a question about linear algebra. That is the entire return on the bet: once the future depends only on the present, one step is a matrix, `n` steps is that matrix raised to the `n`-th power, and the long run is an eigenvector.

For a finite state space, collect the one-step probabilities into a square matrix `P` where `P[i][j] = Pr[ next = j | now = i ]`. Every row is a probability distribution, so every row sums to 1: the matrix is *row-stochastic*. Write a belief about where you are now as a row vector `μ`. Then one step of the process is one vector–matrix product, and `n` steps compose:

    μ₍ₜ₊₁₎ = μₜ P                     one step
    P⁽ᵐ⁺ⁿ⁾ = Pᵐ Pⁿ                    Chapman–Kolmogorov
    Pr[ X₍ₜ₊ₙ₎ = j | Xₜ = i ] = (Pⁿ)[i][j]

Nothing here is deep; it is bookkeeping made possible by the assumption. But it means that a question like "where will this service be in eight hours?" is answered by squaring a matrix three times.

**Figure 4. A three-state service chain, and the rows of Pⁿ forgetting where they started**

![On the left, a three-state chain with states Healthy, Degraded and Down and labelled transition arrows. In the middle, the transition matrix P. On the right, a table of the rows of P to the powers one, two, four, eight and sixteen, showing all three rows converging to the same stationary distribution 0.78767, 0.15068, 0.06164.](2026-10-15-markov-processes/fig-04-powers.svg)

*\[computed here\]* — the matrix at the left is the input; everything else is its consequence. The three rows starting out very different and ending identical *is* the forgetting: by step 16 the chain no longer knows where it began.

### The stationary distribution, and the three conditions

A distribution `π` is **stationary** if `πP = π`: run one more step and nothing changes. It is a left eigenvector of `P` with eigenvalue 1, and because `P` is row-stochastic, eigenvalue 1 always exists. Three separate facts are worth keeping apart, because implementations break when they are conflated: *\[from the literature\]*

- **Existence.** Every finite chain has at least one stationary distribution. Perron–Frobenius gives it.
- **Uniqueness** needs *irreducibility*: from any state you can eventually reach any other. A chain with two disjoint closed groups has a stationary distribution for each, and infinitely many mixtures of them. This is exactly the failure that PageRank's damping factor exists to prevent ([§6](#06-walking-a-graph-pagerank-and-after)).
- **Convergence from anywhere** needs *aperiodicity*. The two-state chain that flips deterministically every step has the unique stationary distribution `(0.5, 0.5)` and never converges to it from a corner: it oscillates forever. A single self-loop anywhere in an irreducible chain is enough to fix this.

With all three, the chain is **ergodic**: `Pⁿ` converges to a matrix whose rows are all `π`, and — the part that makes simulation legitimate — long-run time averages along a single trajectory equal averages under `π`. Every Monte Carlo method in [§7](#07-sampling-by-walking-mcmc) is cashing that theorem. A useful corollary, Kac's formula: the expected time to return to state `i` is exactly `1/π(i)`. In the chain above, Down has `π = 0.06164`, so outages recur every 16.2 hours on average. *\[computed here\]*

### Reversibility: the shortcut that makes design possible

Solving `πP = π` requires knowing `P`. The reverse problem — *given* a target `π`, build a `P` that has it — is the one that matters for algorithms, and it has a famous shortcut. If

    π(i) · P[i][j]  =  π(j) · P[j][i]      for every pair i, j          (detailed balance)

then `π` is stationary. Sum both sides over `i` and the claim falls out in one line. The condition says the chain pushes as much probability from `i` to `j` as back again: run it and film it, and the film looks the same backwards. Not every chain with a stationary distribution satisfies it — the service chain above does not — but it is a *sufficient* condition you can impose by construction, and imposing it is the trick behind Metropolis–Hastings. One useful instance for free: a simple random walk on an undirected graph is reversible with `π(i) ∝ deg(i)`.

### How long is "eventually"? The spectral gap

Ergodicity promises convergence and says nothing about speed. Speed is set by the second-largest eigenvalue modulus. Order the eigenvalues `1 = λ₁ > |λ₂| ≥ … `; the distance to stationarity decays like `|λ₂|ⁿ`, and the quantity `1 − |λ₂|` is the **spectral gap**. The **mixing time** `t_mix(ε)` is the first `n` at which total-variation distance to `π` drops below `ε`, conventionally `ε = 1/4`; it scales roughly as `1/(1 − |λ₂|)`.

**Figure 5. Same limit, three speeds — total-variation distance to π, step by step**

![A line chart of total variation distance against step number for three two-state chains. The chain with second eigenvalue zero reaches its stationary distribution in one step. The chain with second eigenvalue 0.8 crosses one quarter at step 4. The chain with second eigenvalue 0.96 crosses one quarter only at step 17 and is still visibly above zero at step 40.](2026-10-15-markov-processes/fig-05-spectral.svg)

*\[computed here\]* — three chains that agree about the destination and disagree by a factor of 17 about the journey. Every sampler, every simulation-based estimate and every "let it warm up" heuristic is really a bet about which curve you are on.

### Chains that end: absorbing states and the fundamental matrix

Not every chain is meant to run forever. If some states are **absorbing** — once entered, never left — the interesting questions become "how long until it stops?" and "where does it stop?". Order the states so that `P` splits into transient-to-transient `Q` and transient-to-absorbing `R`. Then the **fundamental matrix**

    N = (I − Q)⁻¹ = I + Q + Q² + Q³ + …

has entry `N[i][j]` = expected number of visits to transient state `j` before absorption, starting from `i`. Row sums of `N` are expected time to absorption; `B = N R` gives the probability of ending in each absorbing state. Two matrix operations answer every question about a retry policy, a randomised algorithm's running time, or a funnel.

**Figure 6. A four-attempt retry policy, solved exactly**

![A chain of four attempt states leading to two absorbing states, success and permanent failure. Each attempt succeeds with probability 0.70, retries with probability 0.25 and fails permanently with probability 0.05. The fundamental matrix gives an expected 1.3281 attempts, a 92.97 percent success rate and a 7.03 percent failure rate.](2026-10-15-markov-processes/fig-06-absorbing.svg)

*\[computed here\]* — the policy costs 1.33 attempts per request on average, not 4, and converts a 70% per-attempt success rate into 92.97% end-to-end. Capacity planning needs the first number; the error budget needs the second; one matrix inverse gives both.

## 04 · Continuous time, and the forced exponential

In continuous time there is no "next step" to write a probability for. What survives of the Markov property is a stranger statement: how long you have already been in a state tells you nothing about how much longer you will stay. That single sentence forces the exponential distribution on you, and everything else about continuous-time chains follows from it.

Let `T` be the time until the process leaves its current state, and let `G(t) = Pr[T > t]`. Memorylessness says that having waited `s` already changes nothing:

    Pr[ T > s + t | T > s ] = Pr[ T > t ]
    ⟺   G(s + t) / G(s) = G(t)
    ⟺   G(s + t) = G(s) · G(t)
    ⟹   G(t) = e^(−λt)         the only non-degenerate solution

The middle line is the Cauchy functional equation; with `G` monotone and `G(0) = 1`, exponentials are the only solutions. So the exponential holding time in every queueing model you have ever seen is not a convenience assumption bolted on afterwards. It is the *same* assumption as memorylessness, wearing different clothes. If you reject exponential service times — and [§14](#14-where-the-bet-loses) argues you often should — you are rejecting the Markov property, not a detail of it. *\[from the literature\]*

### The generator, and the two things it contains

A continuous-time Markov chain is therefore completely described by a matrix of *rates* rather than probabilities. The **generator** `Q` has off-diagonal entries `q(i,j) ≥ 0`, the rate of jumping from `i` to `j`, and diagonal entries `q(i,i) = −Σ q(i,j)`, so every row sums to zero. Two readings of the same matrix:

- The total exit rate `q(i) = −q(i,i)` sets the holding time: `Exp(q(i))`, with mean `1/q(i)`.
- Normalising a row by its exit rate gives the **embedded jump chain** — an ordinary discrete-time chain saying *where* you go, once you have decided to go somewhere.

Time and destination are independent, and that factorisation is the whole content of a CTMC. Transient behaviour comes from the Kolmogorov forward equation `P′(t) = P(t) Q`, whose solution is the matrix exponential `P(t) = e^(Qt)`, and the stationary distribution solves `πQ = 0` instead of `πP = π`.

**Figure 7. One generator, two chains — and why counting transitions misreads the system**

![A three-state continuous-time chain with states Up, Degraded and Down, drawn with rate-labelled arrows. The generator matrix Q is shown, then split into two parts: mean holding times of 1000 minutes, 27.3 minutes and 60 minutes, and an embedded jump chain of pure destination probabilities. A comparison panel shows the time-stationary distribution 0.9641, 0.0219, 0.0140 against the jump-chain stationary distribution 0.4818, 0.4015, 0.1168, with the relation pi is proportional to nu over q.](2026-10-15-markov-processes/fig-07-holding.svg)

*\[computed here\]* — the same generator answers two different questions and gives two very different numbers. Degraded is 40% of all transitions and 2.2% of all time, because it is left quickly. Every incident-counting metric has this bug latent in it.

### The Poisson process, and getting back to a matrix

The simplest CTMC is the one that only counts: state `n` goes to `n+1` at rate `λ`, forever. That is the **Poisson process**, the default model of arrivals, and its two closure properties are why it is so sticky in practice. Superposition: merge independent Poisson streams of rates `λ₁, λ₂` and you get Poisson with rate `λ₁ + λ₂`. Thinning: keep each arrival independently with probability `p` and you get Poisson with rate `pλ`. Fan-in and sharding both preserve the model, which makes capacity arithmetic almost free — and makes it very easy to forget that real arrival streams are bursty and correlated.

Numerically, nobody exponentiates a large matrix. **Uniformisation** picks a rate `Λ ≥ max q(i)`, defines the discrete chain `P = I + Q/Λ` — self-loops absorb the slack — and observes it at the ticks of a Poisson(`Λ`) clock. Transient probabilities become a weighted sum of powers of `P`, and you are back in [§3](#03-the-arithmetic-it-buys-you). For the generator above, `Λ = 2.2/h` and the uniformised chain has a 0.9727 self-loop on Up. *\[computed here\]*

### The escape hatch, named

When holding times refuse to be exponential — a timeout is a constant, a retry is a delay, a disk's failure rate rises with age — the honest move is a **semi-Markov** process: keep the embedded jump chain, let the holding distributions be whatever the data says. The process is then Markov only at the jump instants, which is exactly what discrete-event simulators exploit. You lose the matrix exponential and the closed forms. You keep the structure.

## 05 · The state is a design choice

There is a universal recipe for making a process Markov: put more of the history into the state. It always works, because in the limit the state *is* the history. It is also never free, and the bill arrives as state-space size. Every interesting modelling decision in this essay is a position on that trade.

The thing you are looking for has a name in statistics: a **sufficient statistic** for the future. You need a function `s = f(x₀ … xₜ)` such that conditioning on `s` predicts the future exactly as well as conditioning on the whole history. Any such `f` gives you a Markov process on its range. `f = identity` qualifies and is useless. The craft is finding the smallest `f` that still works.

**Figure 8. Five ways to build a state out of the same stream, and what each costs**

![A table of five state designs over the same observation stream. Row one, the raw observation, costs one symbol and is usually not Markov. Row two, a fixed window of k symbols, costs alphabet size to the power k. Row three, a hand-chosen summary such as a congestion window or a saturating counter, costs a few bytes. Row four, a belief state, is a probability vector over hidden states and is exactly Markov but continuous. Row five, a learned state vector as used by recurrent and state-space models, is a fixed number of bytes trained to be sufficient.](2026-10-15-markov-processes/fig-08-augment.svg)

Reading down the table is a history of the field: hand-built states, then windows, then beliefs, then states learned end to end. Nothing was ever solved; the bill just moved from memory to compute to training.

### The cheapest famous fix

A single Atari frame is not a Markov state: a still image of Pong cannot tell you which way the ball is moving. DeepMind's DQN did not introduce a recurrent memory to solve this. It stacked the last four frames and called that the state. *\[from the literature\]* That is row 2 of the figure with `k = 4`, chosen because velocity is a first difference and acceleration is rarely decisive in those games. It is worth remembering when reaching for something more elaborate: the question is not "what is the most expressive state?" but "what is the smallest state that restores the property I need?"

### The principled fix, and why it costs so much

When the true state is hidden, the exactly-correct construction is the **belief state**: the posterior distribution over hidden states given everything observed. It really is Markov — the new belief is a deterministic function of the old belief, the action and the observation — which is why a POMDP is often described as "an MDP over beliefs". The catch is that the belief space is the probability simplex over the hidden states, so a discrete problem with `n` hidden states becomes a continuous problem in `n − 1` dimensions, and exact finite-horizon POMDP planning is PSPACE-hard. *\[from the literature\]* The Kalman filter ([§8](#08-hidden-state-viterbi-baum-welch-kalman)) is the one important case where the belief stays finite-dimensional forever — a mean and a covariance — because linear-Gaussian assumptions are closed under updating.

### Going the other way: lumping states together

Augmentation has an inverse worth knowing. A chain is **lumpable** with respect to a partition of its states if, for every block, all states within it have the same total probability of moving to each other block. When that holds, the aggregated process is itself an exact Markov chain on the blocks, and you can analyse a small chain instead of a large one. Model checkers use the same criterion under the name *bisimulation*: two states are bisimilar when no experiment can distinguish them, so they can be merged before the state space is explored. Augmentation is what you do when the state is too small; lumping is what you do when it is needlessly large.

### Spending state only where it pays

Fixed-order windows are wasteful: most contexts do not need depth. The classic answer is a **variable-order** model, which keeps a tree of contexts and extends a branch only where the data justifies it — prediction by partial matching in compressors, context-tree weighting, and in silicon, the TAGE branch predictor's bank of differently-sized history tables ([§10](#10-chains-inside-the-machine)). All three are the same idea: let the process tell you how much history it needs, per context, instead of paying `mᵏ` everywhere.

### Knowing when to stop

"Is this process really Markov?" is not a decidable question about the world; it is a question about which residual dependence you are willing to ignore. The workable test is empirical and takes two runs: fit the model with the candidate variable in the state and without it, then compare held-out predictive likelihood, or — better — the downstream decision the model exists to support. If a longer history does not move the number you actually care about, the shorter state is Markov enough, and you should take the smaller state space and the closed forms that come with it.

## 06 · Walking a graph: PageRank and after

PageRank is a stationary distribution. That is the whole algorithm: build a Markov chain whose states are pages and whose transitions are links, then report `π`. Everything else in the definition — the damping factor, the teleport vector, the treatment of dead ends — is repair work to make the chain satisfy the three conditions of [§3](#03-the-arithmetic-it-buys-you).

Take the raw link graph and define a walk: from a page, follow one of its outgoing links uniformly at random. Two things immediately go wrong, and both are structural rather than statistical.

- **Dangling nodes.** A page with no outgoing links gives a row of zeros. The matrix is not stochastic, probability mass leaks away, and repeated multiplication drives everything to zero.
- **Rank sinks.** A set of pages that link only to each other is a closed class. The chain is reducible, the stationary distribution is not unique, and in the limit the sink swallows all the mass — regardless of how unimportant it is.

The fix is one line. Redistribute each dangling node's mass uniformly, then mix the whole thing with a uniform jump:

    P′ = d · ( P + dangling-correction )  +  (1 − d) · (1/n) · J        with d = 0.85

`J` is the all-ones matrix. Every entry of `P′` is now strictly positive, so the chain is irreducible and aperiodic by construction, `π` exists and is unique, and power iteration converges from any start. The damping factor is usually explained as a surfer who gets bored. It is better understood as a regulariser whose value controls the conditioning of the problem: the second eigenvalue of `P′` is bounded by `d`, so convergence is geometric at rate `d` and the iteration count is roughly `log ε / log d`. *\[from the literature\]*

**Figure 9. Eight pages, one dead end, one sink — and what damping is actually buying**

![A directed graph of eight pages. Pages A, B and C form a closed cycle. D links into A and C. E, F and G form a feeder component. H has no outgoing links. Computed PageRank values at damping 0.85 are shown at each node. A panel compares the ranks at damping 0.85 against damping 0.99, where D, E, F and G collapse from 0.0365 to 0.0028, and lists iteration counts to converge.](2026-10-15-markov-processes/fig-09-pagerank.svg)

*\[computed here\]* — eight pages, power iteration to `1e−12`. The right-hand panel is the point: `d` trades fidelity to the raw link structure against conditioning, and 0.85 is a choice on that curve rather than a discovered constant.

### Why it scaled

Power iteration on a sparse graph is one sparse matrix–vector product per step, and the original 1998 paper reports convergence to a usable tolerance in roughly 50 iterations on a 322-million-link graph. *\[from the literature\]* Nothing about that is clever; it is what §3 promised — geometric convergence at rate `|λ₂|` — applied to a graph large enough that the promise was the product.

### Personalising the teleport

The uniform teleport vector `(1/n)` is the only part of the construction that is not derived from the graph, which makes it the natural place to inject intent. Replace it with a distribution concentrated on a few seed nodes and you get **personalised PageRank**: the stationary distribution of a walker who keeps restarting from the pages, or products, or accounts you already care about. That single substitution turns a global ranking into a recommendation engine, and it is the core of graph-based recommenders — Pinterest's Pixie describes exactly this as a random walk with restart over a bipartite pin–board graph, served in real time. *\[from the literature\]*

### The walk as a data generator

A second family inverts the use. Rather than computing a walk's stationary distribution, sample its *trajectories* and treat each one as a sentence: DeepWalk (2014) and node2vec (2016) feed random walks over a graph into a word-embedding objective, and the resulting vectors carry structural similarity. node2vec's two hyperparameters are a deliberate distortion of the Markov chain — biasing the walk toward breadth or depth — which changes what "similar" means in the embedding. The chain here is not a model of anything; it is a sampler over context.

### Mixing time is community structure

One last connection, because it recurs in [§7](#07-sampling-by-walking-mcmc). A random walk on a graph mixes slowly exactly when the graph has a bottleneck: a set of nodes the walk struggles to leave. Cheeger's inequality makes this precise, relating the spectral gap to *conductance*, the minimum fraction of edge weight crossing any balanced cut. So the slow eigenvector of the walk *is* the cluster boundary, which is why spectral clustering works and why a slow-mixing sampler and a graph with communities are the same phenomenon seen from two directions.

## 07 · Sampling by walking: MCMC

Every section so far took a chain and asked what it does. Markov chain Monte Carlo runs the implication backwards: you are handed a distribution you cannot sample from, and you *construct* a chain whose stationary distribution is that target. Then you run it and read the states off. It is the single most consequential use of the whole theory.

The setting is always the same. You can evaluate a function `f(x)` proportional to the probability you want, but you cannot normalise it — the normalising constant is a sum over a state space too large to enumerate. Bayesian posteriors have this shape (the evidence is an intractable integral), so do Boltzmann distributions `exp(−E(x)/T)` over configurations, and so do most counting problems. Direct sampling is out of reach. A chain is not.

### The Metropolis–Hastings rule

Choose any proposal distribution `q(y | x)` you can sample from. From the current state `x`, draw a candidate `y`, and accept it with probability

    α(x → y) = min( 1 ,  [ f(y) · q(x | y) ] / [ f(x) · q(y | x) ] )

If the candidate is rejected, the chain stays where it is — and that repeat is part of the sample, not a wasted draw. Two properties make this work. First, `f` appears only as a ratio, so the unknown normalising constant cancels and never has to be computed; that is the practical miracle. Second, the resulting chain satisfies detailed balance with respect to `π ∝ f`: for the case where `α(x→y) < 1`, the acceptance factor is exactly the correction that makes `π(x)P(x,y) = π(y)P(y,x)`, and by §[3](#03-the-arithmetic-it-buys-you) that is sufficient for `π` to be stationary. Add irreducibility — the proposal must be able to reach everywhere — and the ergodic theorem does the rest. *\[from the literature\]*

Metropolis and co-authors published the symmetric case in 1953, computing equations of state on the MANIAC machine at Los Alamos; Hastings generalised it to asymmetric proposals in 1970. **Gibbs sampling** is the special case where you propose from the exact conditional distribution of one coordinate given the rest, which makes `α = 1` always — every proposal is accepted, at the cost of needing those conditionals in closed form.

**Figure 10. The loop, and the step size that decides whether it is worth running**

![On the left, the Metropolis-Hastings loop: propose a candidate, compute the acceptance ratio, accept or stay, record the state, repeat. On the right, measured results for four proposal step sizes on a standard normal target: step size 0.1 accepts 96.9 percent of proposals but yields only 9.7 effective samples per thousand; step 0.5 accepts 84.5 percent and yields 45.7; step 2.4 accepts 44.3 percent and yields 222.3; step 10 accepts 12.5 percent and yields 85.4. Bars visualise the effective sample sizes.](2026-10-15-markov-processes/fig-10-mh.svg)

*\[computed here\]* — one seeded run per row, 200,000 draws each; `τ_int` is the integrated autocorrelation time and effective sample size is `1000/τ_int`. The spread between the best and worst row is 23×, from nothing but a step size.

### Better proposals

Since the acceptance rule permits *any* proposal, most progress in MCMC has been in proposing better. **Simulated annealing** keeps the machinery and moves the target, sampling `exp(−E(x)/T)` while cooling `T` toward zero, so the chain concentrates on minima — a general-purpose optimiser built out of a sampler. **Hamiltonian Monte Carlo** uses the gradient of `log f` to simulate a physical trajectory, proposing points far from the current state that are still accepted at a high rate; the No-U-Turn Sampler removes its two hyperparameters, which is what makes modern probabilistic programming systems usable by non-specialists. *\[from the literature\]* The pattern is constant: keep detailed balance, spend more per step, move further per step.

### Where it earns its keep in computing

- **Bayesian inference at large.** Probabilistic programming languages compile a model into a log-density and hand it to a sampler; the user writes the model, the chain does the integral.
- **Approximate counting.** Counting problems that are \#P-hard exactly become tractable approximately by sampling: the classic result is a polynomial-time approximation scheme for the permanent of a non-negative matrix, built on a rapidly mixing chain. Approximating the volume of a convex body is the same story.
- **Statistical physics and combinatorial optimisation.** Ising and spin-glass simulation is where the method was born, and Metropolis-style local search remains a serviceable baseline for layout, scheduling and placement problems.

### The part that is never solved

Correctness is easy and convergence is not. The chain is guaranteed to converge to `π`; nothing tells you it has. Standard practice — discard a burn-in, run several chains from dispersed starts, compare within-chain and between-chain variance, report effective sample size — is a set of *necessary* conditions. A target with well-separated modes can leave a sampler happily reporting convergence inside one mode it never leaves, and diagnostics computed on chains that all started nearby will agree with each other. Mixing time is the whole game, and outside carefully constructed cases nobody can bound it. When a sampler is used in production, the honest version of the claim is "this chain looked stable under the checks we ran", not "these are samples from the posterior".

## 08 · Hidden state: Viterbi, Baum–Welch, Kalman

Usually the Markov state is not something you can see. You see a consequence of it — a sound, a word, a request, a sensor reading — and have to infer the state behind it. A hidden Markov model is the smallest formalism for that situation, and the algorithms it comes with are among the most deployed dynamic programs in computing.

The object has two layers. An unobserved chain moves over states according to a transition matrix; in each state, an observation is drawn from an emission distribution. The Markov property holds of the hidden layer, not of what you see — the observation sequence is generally not Markov at all, which is exactly why the model is useful. Rabiner's 1989 tutorial organises everything around three questions: *\[from the literature\]*

- **Evaluation** — how likely is this observation sequence? The *forward* algorithm, summing over all paths in `O(T·n²)`.
- **Decoding** — which hidden sequence best explains it? The *Viterbi* algorithm, the same recursion with max instead of sum.
- **Learning** — which parameters make this data likely? *Baum–Welch*, an instance of EM: run forward–backward to get expected state occupancies, re-estimate, repeat.

**Figure 11. A Viterbi decode, every surviving number shown**

![A trellis with two hidden states, Human and Bot, over four observations: page, api, api, asset. Each cell shows the best path probability reaching it. Bold arrows mark surviving backpointers, thin grey arrows mark losing candidates. The best path is Human, Bot, Bot, Human with probability 0.0013328 out of a total observation probability of 0.005389625, so the single best path carries 24.7 percent of the posterior mass.](2026-10-15-markov-processes/fig-11-trellis.svg)

*\[computed here\]* — Viterbi keeps one survivor per state per step, so the cost is `O(T·n²)` = 16 operations here rather than the `2⁴` paths a naive search would walk. The caveat on the right is the one most systems ignore: the most likely single explanation is usually not a *likely* explanation.

### Where the trellis is load-bearing

Viterbi decoding is probably running in the room you are in. The algorithm was published in 1967 for decoding convolutional error-correcting codes, and in that role it went into satellite links, GSM, Wi-Fi and the read channel of hard drives — implemented in silicon, with the trellis laid out as a fixed circuit. *\[from the literature\]* The same recursion, with a linguistic model instead of a code, carried speech recognition for three decades: HMMs over phone states with Gaussian mixture emissions were the backbone from the 1980s until deep networks replaced first the emission model and then the whole pipeline in the 2010s. It remains the standard tool for part-of-speech tagging, gene finding, keyboard decoding on touchscreens, and any problem shaped like "segment this stream into labelled runs".

### The continuous twin

Make the hidden state a real vector, the transition linear, and all the noise Gaussian, and the same filtering problem acquires a closed form: the **Kalman filter** (1960). Its belief state is a Gaussian — a mean and a covariance — and linear-Gaussian updates map Gaussians to Gaussians, so the belief never grows in complexity no matter how long the filter runs. That fixed-size sufficient statistic is why it fits in the memory of a 1960s guidance computer, and it is the same trick [§12](#12-sequence-models-and-the-size-of-the-state) will find at the centre of state-space sequence models.

The predict–update cycle is the forward algorithm with integrals in place of sums: propagate the belief through the dynamics, then multiply by the likelihood of the new measurement and renormalise. When the dynamics are not linear you linearise (extended Kalman filter), or propagate sample points through the nonlinearity (unscented), or abandon the Gaussian and carry a weighted particle cloud instead (particle filter) — paying variance for generality. GPS receivers, inertial navigation, sensor fusion in vehicles, and the back end of most SLAM systems are all instances.

The unifying statement is worth keeping: forward algorithm, Kalman filter and particle filter are the same recursion — maintain the belief state of [§5](#05-the-state-is-a-design-choice) — under three different assumptions about what the belief is allowed to look like.

## 09 · Decisions: MDPs and reinforcement learning

Put an action inside the transition and the chain stops being something you watch. A Markov decision process is best understood as a whole *family* of Markov chains, indexed by policy: fix a policy and you get back an ordinary chain of the kind §[3](#03-the-arithmetic-it-buys-you) analyses. Choosing among those chains is the problem.

The tuple is `(S, A, P, R, γ)`: states, actions, a transition kernel `P(s′ | s, a)` that still obeys the Markov property given the action, a reward function, and a discount factor `γ ∈ [0,1)` which makes infinite-horizon sums finite and encodes how much the future is worth. Bellman named the framework in 1957; Howard's 1960 *Dynamic Programming and Markov Processes* gave it the algorithm that still bears the structure. *\[from the literature\]*

The object you solve for is the value function — expected discounted return from a state — and the equation it satisfies is a fixed point:

    V*(s) = max over a of [ R(s,a) + γ · Σ over s′ of P(s′|s,a) · V*(s′) ]

Read it as two operations stacked: an *expectation* over where the environment takes you, and a *maximum* over what you choose. That asymmetry is the entire difference between this section and the rest of the essay.

**Figure 12. The loop, and the backup — expectation over the world, maximum over the policy**

![On the left, the agent-environment loop: the agent observes a state and reward, chooses an action, and the environment applies the transition kernel. A note says that fixing a policy turns the MDP back into an ordinary Markov chain. On the right, the Bellman backup tree: a state node branches over two actions, each action branches over outcome states with probabilities, and the value is the maximum over actions of the expectation over outcomes.](2026-10-15-markov-processes/fig-12-mdp.svg)

An MDP is a Markov chain with a choice bolted into each transition. Everything that makes the theory work — a unique optimal value function, convergence from any initialisation — comes from that single contraction property.

### Solving it when you know the model

**Value iteration** applies the backup everywhere, repeatedly. **Policy iteration** alternates exact evaluation of the current policy — a linear solve — with a greedy improvement step, and terminates in finitely many iterations because there are finitely many policies. Both are dynamic programming over a state space you must be able to enumerate, which is the binding constraint: the number of states in anything interesting is the product of its variables' ranges.

**Figure 13. Value iteration on a six-cell corridor, sweep by sweep**

![A six-cell corridor with a goal at the right end. A table shows the value of each cell after sweeps zero, one, two, three, five and ten, and at convergence: 0.4995, 0.5859, 0.6925, 0.8145, 0.9533 and the terminal zero. Value information propagates one cell to the left per sweep at first. The run converges to 1e-9 in 32 sweeps.](2026-10-15-markov-processes/fig-13-value-iteration.svg)

*\[computed here\]* — watch the information travel: after one sweep only the cell adjacent to the goal knows anything, and each sweep pushes the frontier one cell further left. The early negative values are correct — until the goal's value arrives, every action looks like pure cost. The contraction bound promises 1e−3 within 66 sweeps; the actual run reached 1e−9 in 32.

### Solving it when you do not know the model

Reinforcement learning is what remains when `P` and `R` are unavailable and all you can do is act and observe. Temporal-difference learning updates a value estimate toward a *bootstrapped* target built from the next state's current estimate; Q-learning does this off-policy, learning about the greedy policy while behaving otherwise, and converges in the tabular case under the usual stochastic-approximation conditions plus infinitely many visits to every state–action pair. Policy-gradient methods skip the value function and differentiate expected return with respect to policy parameters directly.

Every one of those guarantees is tabular. Replace the table with a function approximator and combine bootstrapping, off-policy updates and approximation — Sutton and Barto's "deadly triad" — and divergence is possible in principle and common in practice. Most engineering in deep RL is machinery for keeping that instability survivable: target networks, replay buffers, trust regions, clipped objectives. *\[from the literature\]*

### Where it is actually deployed

- **Games with a known model.** AlphaGo and its successors search a deterministic, perfectly observed MDP; MuZero's contribution was to learn a latent model good enough to plan in, which is precisely a learned Markov state (row 5 of Figure 8).
- **Control problems with tight loops.** Datacentre cooling, video bitrate adaptation, congestion control, and compiler heuristics such as LLVM's ML-guided inlining all fit because the state is instrumented, the action space is small, and the reward is measurable within seconds.
- **Bandits.** An MDP with one state, where actions do not change the world — ranking, ad selection, layout choices. Thompson sampling and UCB are the workhorses, and the reason this case is so widely deployed is exactly that the Markov modelling problem disappears.
- **RLHF, with an asterisk.** Preference-tuning a language model uses the vocabulary and the optimisers of MDPs, but the process is usually a token-level MDP whose reward arrives only at the end, or a contextual bandit over whole completions. The sequential structure the theory is about is mostly absent; what is borrowed is the optimiser.

The honest summary is that MDPs give you vocabulary, algorithms and a clean statement of what "optimal" means. They do not give you the transition kernel, and in deployed systems that kernel is unknown, estimated from logs, and changes while you are estimating it — [§14](#14-where-the-bet-loses).

## 10 · Chains inside the machine

The uses so far have been models — descriptions a person writes down about a system. This section is about Markov chains that are physically present in hardware: state machines of two or three bits, in the critical path, updated every cycle, designed by someone who may never have called them chains.

### The two-bit branch predictor is a four-state chain

Smith's 1981 saturating counter is the canonical example. Two bits hold one of four states — strongly not-taken, weakly not-taken, weakly taken, strongly taken — the prediction is the high bit, and each outcome nudges the counter one step toward what actually happened, saturating at the ends. *\[from the literature\]* If branch outcomes were independent and taken with probability `p`, this is exactly a four-state Markov chain, and everything in [§3](#03-the-arithmetic-it-buys-you) applies: solve `πP = π`, weight by whether the prediction is wrong in each state, and the misprediction rate falls out in closed form.

**Figure 14. Two bits of hysteresis, priced exactly**

![A four-state saturating counter drawn as a chain: strongly not taken, weakly not taken, weakly taken, strongly taken, with taken transitions moving right and not-taken transitions moving left, and self-loops at both ends. A table compares misprediction rates of the two-bit counter against a one-bit predictor for branch taken-rates from 0.5 to 0.95: at 0.9 the two-bit predictor mispredicts 10.98 percent against the one-bit predictor's 18 percent.](2026-10-15-markov-processes/fig-14-2bit.svg)

*\[computed here\]* — the stationary distribution of the four-state chain, solved by power iteration, then weighted by whether each state predicts wrongly. The 1-bit column is `2p(1−p)`. At `p = 0.5` the two designs are identical and both useless; the second bit only pays where branches are biased, which is where real branches live.

Real branches are not independent, which is precisely why the next thirty years of the field were spent augmenting the state. **gshare** indexes the counter table by the program counter hashed with a global history register — order-`k` augmentation (Figure 2) implemented as an XOR. **TAGE** keeps several tagged tables with geometrically increasing history lengths and predicts from the longest one that matches, which is a variable-order context model (§[5](#05-the-state-is-a-design-choice)) in silicon, with tag checks standing in for the statistical test about whether the longer context is worth trusting. The whole lineage is a single idea — grow the state until the process looks memoryless — pursued under a cycle-time budget.

### Prefetchers learn a transition matrix at runtime

Joseph and Grunwald's 1997 "Markov predictor" is the most literal instance in the machine: a hardware table mapping each observed cache-miss address to the addresses that followed it, with counts, from which the prefetcher issues the most likely successors. *\[from the literature\]* That table *is* an empirical transition matrix, estimated online, truncated to fit in a few kilobytes.

**Figure 15. A Markov prefetcher table, and what each column is in chain terms**

| Hardware | Chain | What limits it |
|----|----|----|
| Index: last miss address | The current state | Order-1 by construction; correlations further back are invisible |
| Entry: *n* successor addresses | A truncated row of `P` | Only the top few successors fit; the tail is discarded |
| Per-successor counters | Maximum-likelihood estimates of `P[i][j]` | Estimated from a short, moving window of history |
| Replacement of table entries | Forgetting rows | Working-set changes evict exactly the rows about to be needed |
| Prefetch degree | How much of the row you act on | Every wrong prefetch costs bandwidth, so precision matters more than recall |

Stride and stream prefetchers are the degenerate case where the row is assumed to be a single deterministic successor; temporal prefetchers are the case where the row is allowed to be long and is spilled to memory. All three are the same estimator under different budgets.

### Caches, and why LRU resists closed forms

Cache replacement looks like it should fall to the same treatment, and it nearly does. Under the independent reference model — each access draws an item independently from a fixed popularity distribution — an LRU set of associativity `k` is a Markov chain whose state is the recency *ordering* of resident lines. That is `k!` states, which is why exact LRU hit ratios are computed for small caches and approximated for real ones. The standard approximation introduces a characteristic time: treat the cache as evicting anything not referenced within a window `T`, solve for the `T` that makes the expected occupancy equal the cache size, and read hit rates off per item. It is accurate in practice and it is a mean-field simplification of a chain nobody wants to write down. *\[from the literature\]*

### Algorithms that are random walks

- **2-SAT in expected `O(n²)`.** Start from any assignment; while some clause is unsatisfied, pick one of its two literals at random and flip it. The Hamming distance to a fixed satisfying assignment is a random walk on `{0 … n}` that moves toward zero with probability at least ½ — gambler's ruin, with the classic quadratic hitting time.
- **3-SAT in `(4/3)ⁿ`.** Schöning's 1999 algorithm is the same walk with restarts: from a random start, flip a random literal of an unsatisfied clause up to `3n` times, then restart. The analysis is a birth–death chain on Hamming distance, and it was for years the best known bound for 3-SAT. *\[from the literature\]*
- **Epidemic and gossip protocols.** The number of nodes that have heard a rumour is a continuous-time chain with a rate proportional to infected × susceptible, giving the familiar `O(log n)` rounds to full dissemination — the same equations as epidemiology, which is where the naming came from.
- **Randomised data structures.** Skip-list heights, hash probe sequences and the balance of a treap are all analysed as chains or walks; the guarantees printed in the textbooks are hitting times and stationary quantities of exactly the sort in §3.

## 11 · Queues, capacity, and failure

Performance engineering and reliability engineering are the same continuous-time chain wearing two hats. In one, states count requests in a system; in the other, they count working components. Both inherit the closed forms of [§4](#04-continuous-time-and-the-forced-exponential), and both inherit its assumption — which is why the numbers below are excellent for *shape* and unreliable for tails.

Queueing theory is older than computing: Agner Erlang worked out call-loss and waiting formulas for the Copenhagen telephone exchange from 1909, and Kendall's 1953 notation still labels every model in the field. `A/S/c` names the arrival process, the service distribution and the number of servers, and the letter `M` in those slots stands for *Markovian* — which, by §4, means exponential. `M/M/1` is the memoryless queue: Poisson arrivals at rate `λ`, exponential service at rate `μ`, one server. *\[from the literature\]*

As a chain it is the simplest possible birth–death process: state `n` is the number in the system, arrivals push right at rate `λ`, completions pull left at rate `μ`. Detailed balance holds between neighbours, so the stationary distribution is geometric — `π(n) = (1 − ρ)ρⁿ` with `ρ = λ/μ` — and everything else is arithmetic on a geometric series.

**Figure 16. The birth–death chain, and the wall it runs into**

![At the top, a birth-death chain with states zero, one, two, three and so on, arrivals at rate lambda moving right and completions at rate mu moving left. Below left, a curve of mean response time divided by service time against utilisation, flat until about 0.7 and then rising steeply, reaching 20 at utilisation 0.95. Below right, a table: at utilisation 0.5 response time is 2 times service time; 0.8 gives 5 times; 0.9 gives 10 times; 0.95 gives 20 times; 0.99 gives 100 times.](2026-10-15-markov-processes/fig-16-mm1.svg)

*\[computed here\]* — all closed form from `ρ` alone. The curve is the reason capacity targets sit near 60–70% rather than 90%: not caution, but the shape of `1/(1 − ρ)`.

### Little's law, which survives the assumption

One result in this area needs no Markov property at all. **Little's law** — `L = λW`, mean number in system equals arrival rate times mean time in system — holds for essentially any stable queueing system regardless of arrival process, service distribution, or scheduling discipline. *\[from the literature\]* That makes it the safest tool in the box: if you can measure two of the three quantities, the third is not a model output but an identity. Use it to sanity-check every other number in this section.

### Why pooling wins

With `c` servers sharing one queue, the waiting probability is given by Erlang's C formula, and the result is the strongest argument for shared queues in distributed systems. Holding utilisation fixed at 80% and varying only the number of servers: *\[computed here\]*

    servers c      P(must wait)      mean wait ÷ service time
         1            0.800              4.000
         2            0.711              1.778
         4            0.596              0.746
         8            0.458              0.286
        16            0.305              0.095
        32            0.161              0.025

Same utilisation, same per-request work, 160× less queueing from pooling alone. This is why one shared queue in front of `N` workers beats `N` queues each in front of one worker, why per-connection thread pools underperform shared pools, and why sharding a workload by hash — which partitions the queue — costs latency that no amount of extra capacity in the wrong shard can return.

### The same chain, counting failures instead of requests

**Figure 17. Two states, and the nines they imply**

![A two-state continuous-time chain between Up and Down, with failure rate one over MTTF and repair rate one over MTTR. A table gives availability and yearly downtime for four combinations: MTTF 720 hours with MTTR 1 hour gives 2.86 nines and 729.5 minutes per year; the same MTTF with a 5-minute repair gives 3.94 nines and 60.6 minutes; MTTF one year with a 4-hour repair gives 3.34 nines; MTTF 3 months with a 30-minute repair gives 3.64 nines.](2026-10-15-markov-processes/fig-17-availability.svg)

*\[computed here\]* — availability is a stationary distribution over two states, which is the entire theory behind the nines. The redundancy line assumes independent failures, and that assumption is the one that actually fails ([§14](#14-where-the-bet-loses)).

## 12 · Sequence models and the size of the state

Every autoregressive generator is a Markov process. It has to be: generation is a loop that emits a token and updates something, and the something it updates is the state. The only question — and it is the central architectural question of the last few years — is how big that state is allowed to be, and what it is allowed to forget.

Shannon started here. The ladder of approximations to English in the 1948 paper is a sequence of Markov models whose state is the last `k − 1` symbols, and the observation that longer contexts produce more plausible text is the observation the field has been cashing ever since. What stopped the ladder was the bill from Figure 2: a 5-gram over a 50,000-token vocabulary has `3.1 × 10²²` states, of which any corpus visits a vanishing fraction. Every technique in language modelling before neural networks — back-off, Kneser–Ney smoothing, clustering — was an attempt to make an enormous, almost entirely unobserved transition table behave.

### The modern models, sorted by state

Neural sequence models replace the lookup table with a function, which dissolves the `mᵏ` problem and replaces it with a design choice: what does the model carry from step to step? Sorting the architectures by that answer is more illuminating than sorting them by year.

**Figure 18. What each architecture carries forward, in bytes**

![A table of five architectures and the size of the state each carries between tokens. An n-gram carries 16 bytes and recalls the last four tokens exactly. A recurrent network carries a fixed hidden vector. A state space model carries 16 mebibytes fixed, computed from 64 layers times 8192 inner dimension times 16 state dimension times 2 bytes. Sliding window attention carries window size times 320 kibibytes. Full attention carries 320 kibibytes per token, reaching 40 gibibytes at 128 thousand tokens and 320 gibibytes at one million tokens.](2026-10-15-markov-processes/fig-18-state-size.svg)

*\[computed here\]* — sizes from a stated 70B-class configuration at fp16; change the config and every number moves, but the *shape* of the table does not. Rows 1–4 keep a bounded Markov state and therefore forget; row 5 refuses to forget and therefore pays linearly, forever.

### The argument this table is really about

A transformer with full attention is still a Markov process — the next token depends only on the current KV cache and the last token, with no further reference to history. What makes it different is that its state grows with time. That is the trade in Figure 8 pushed to its limit: never compress, and you never lose anything; pay linear memory and linear per-token compute for the privilege.

State-space models take the opposite end. S4, Mamba, RWKV and linear attention all carry a fixed-size recurrent state, which makes generation `O(1)` in memory per token and makes the model an honest, classical Markov chain over a learned state — row 5 of Figure 8, at scale. The cost is equally clean: a bounded state cannot hold an unbounded number of distinguishable facts, so tasks that require verbatim recall of an arbitrary earlier token degrade in a way attention does not. The pragmatic industry answer as of 2026 is a hybrid stack — mostly recurrent or windowed layers, with a few full-attention layers retained precisely for exact recall — which is an explicit statement that neither end of the table is correct on its own.

The useful way to read any new architecture, then, is to ask the §[5](#05-the-state-is-a-design-choice) question of it: what is the state, how large is it, and what does it throw away? Every answer on that table has been chosen, and each one is a position on the same trade Markov modelling has always posed.

### Two more chains in the same stack

**Speculative decoding** exploits the memorylessness of the decoding loop directly. A small draft model proposes several tokens; the large model scores them all in one parallel pass; an acceptance rule keeps the longest prefix and resamples at the first rejection from an adjusted distribution. The rule is a rejection-sampling argument, and what it buys is exactness: the accepted sequence is distributed exactly as if the large model had generated it alone. Speed with no change in the output distribution — the same style of guarantee, and the same kind of proof, as the acceptance rule in [§7](#07-sampling-by-walking-mcmc). *\[from the literature\]*

**Diffusion models** are Markov chains twice over. The forward process is a *fixed* chain that adds calibrated Gaussian noise over many steps until the data is indistinguishable from noise — no learning involved, and the schedule is chosen so that any step can be sampled in closed form. The reverse process is a learned chain that removes it. Sampling an image is running that chain, and the original DDPM formulation used a thousand steps, which is why every subsequent advance — distillation, consistency models, flow matching — has been an attempt to shorten a Markov chain without changing where it ends up. *\[from the literature\]*

**Figure 19. One chain fixed, one chain learned**

![A forward chain from x zero to x T adding Gaussian noise, labelled fixed and requiring no learning, running left to right. Beneath it a reverse chain from x T back to x zero labelled learned. A note says the forward chain has a closed form for any step and that shortening the reverse chain is what distillation and consistency models do.](2026-10-15-markov-processes/fig-19-diffusion.svg)

Generative image models are, structurally, an MCMC-shaped idea with the chain learned rather than designed: the interesting engineering is entirely in making a long chain short.

## 13 · Agent loops as processes

This section is my own framing rather than a result from the literature, and it is the reason I wrote the rest. An agent working in a repository looks exactly like the object in [§9](#09-decisions-mdps-and-reinforcement-learning): a loop that observes, acts, and changes the world. It is worth being precise about how the resemblance fails, because the failure is where the measurement problem lives. *\[my framing\]*

The tempting reading is that the context window is the state and the session is an MDP over it. That reading is wrong in a specific and useful way. The context is not the state; it is an *observation*, assembled by the agent's own past tool calls, truncated when it grows, and summarised when it is truncated. The state is the environment — the working tree, the services, the external systems the tools reach. So the honest model is a partially observed one, with two unusual properties: the agent chooses what it observes, because reading a file is an action; and the agent's memory is the same object as its observation history, because there is nowhere else for it to keep anything.

**Figure 20. Where the Markov state of an agent session actually lives**

![On the left, a loop in which the agent holds a context window, issues tool calls, and the environment consisting of a working tree and services changes. A heavy label marks the environment as the Markov state and the context as a lossy observation. On the right, the session drawn as an episode: an initial snapshot S0, a sequence of actions each accruing cost, a final snapshot S1, and a verification step producing a score V between zero and one which mints V times the budget B.](2026-10-15-markov-processes/fig-20-agent.svg)

*\[my framing\]* — the useful consequence is on the left: if the environment is the state, then evidence about what an agent did has to be captured from the environment, and a transcript is a record of observations rather than of the process.

### What the framing is good for

Three things, and they are the reason I keep it. First, it says where to put the instrumentation: if the Markov state is the environment, then snapshots before and after are the honest record, and the transcript is supporting evidence rather than the primary artefact. Second, it gives a clean definition of an episode — a unit of work with a beginning, an end, and a verification step — which is what makes two pieces of agent work comparable at all. Third, it names the objective correctly: what matters is not cumulative discounted reward but verified output per unit of all-in cost, which is a ratio and behaves differently under optimisation than a sum.

### What it is not good for

It is not a model you can solve. There is no transition kernel to estimate: the environment is arbitrary, the action space is unbounded, and the agent modifies the dynamics as it works. The reward is terminal and sparse, which is precisely the regime where credit assignment is hardest, and the process is non-stationary across episodes because the model, the tools and the repository all change underneath. Anyone promising policy optimisation over this object should be asked which of those four problems they solved.

So the value here is vocabulary and discipline, not machinery — which is, in fairness, most of what Markov modelling has ever offered engineering. It tells you what to record, what to call an episode, and where the boundary of a measurement lies. The next section is about taking that modesty seriously everywhere else too.

## 14 · Where the bet loses

The Markov property is an assumption, and assumptions have failure modes worth knowing by name. None of what follows argues against using these models. It argues for knowing which of your numbers survive the assumption being wrong — because some do, and the ones that do not tend to be exactly the numbers people page each other about.

### 1 · Real arrivals are not Poisson

The most consequential empirical result in this area is now more than thirty years old. Leland, Taqqu, Willinger and Wilson's 1994 study of Ethernet traffic at Bellcore showed that packet arrivals are *self-similar*: burstiness does not average out as you zoom out, it persists across timescales, and the traffic has long-range dependence rather than the exponentially decaying correlation a Markov model implies. *\[from the literature\]* Poisson arrivals smooth out when aggregated. Real traffic does not. The same has since been reported for web request streams, storage workloads and datacentre traffic.

What this breaks is specific: queue-length and buffer-occupancy predictions from `M/M/·` models are optimistic, sometimes by orders of magnitude, because the model expects bursts to cancel and they correlate instead. What it does not break is Little's law, or the qualitative shape of the utilisation curve in Figure 16 — congestion still detonates near saturation, generally sooner.

### 2 · Heavy tails, at the same mean

Service times misbehave in a second, independent way. Memorylessness implies an exponential distribution, and exponentials have thin tails: the probability of a very long request decays geometrically. Measured latencies frequently do not. The comparison below holds the mean fixed at 100 ms and changes nothing else.

**Figure 21. Same mean, two tails — and what it does to the percentiles you report**

![A log-scale survival plot comparing an exponential distribution with mean 100 milliseconds against a Pareto distribution with the same mean and tail index 1.5. The exponential falls off a cliff; the Pareto decays slowly. A table gives the probability of exceeding 200, 500, 1000 and 10000 milliseconds for each, and the 99th, 99.9th and 99.99th percentiles: 460, 691 and 921 milliseconds for the exponential against 718, 3333 and 15472 for the Pareto.](2026-10-15-markov-processes/fig-21-tails.svg)

*\[computed here\]* — identical means, identical medians to within a factor of two, and a p99.9 that differs by 4.8× and a p99.99 that differs by 17×. Fitting an exponential to the mean and extrapolating to the tail is the single most common way Markov models mislead in production.

### 3 · Failures are correlated

The redundancy arithmetic in Figure 17 assumes independent failures, and independence is what redundancy almost never buys. Replicas share a power feed, a network fabric, a configuration push, a container image, and the same bug reached by the same input. The computed `1 − (1 − A)²` is therefore an upper bound on what two replicas deliver, and the gap is not small: incident histories are dominated by correlated causes, not by two independent machines failing to coincide. Use the formula to compare designs; do not put its output in a contract.

### 4 · Nothing is stationary

Time-homogeneity — the quiet second assumption from [§1](#01-the-memoryless-bet) — fails on every timescale that matters. Load is diurnal and weekly. Deploys change the service rate mid-measurement. Retry policies couple the arrival process to the service process, so a slowdown creates load, which is the mechanism behind metastable failures: a system that was stable at the same offered load ten minutes ago and will not recover when the load is removed. A single transition matrix cannot represent a system whose transition matrix is a function of its own recent behaviour.

### 5 · The state space explodes

Augmentation is always available and rarely affordable. The state space of a composed system is the product of its components' state spaces, which is the wall every model checker hits; symbolic representations, partial-order reduction and lumping ([§5](#05-the-state-is-a-design-choice)) push the wall back without removing it. The same bound is why exact POMDP solutions are unavailable and why tabular reinforcement learning does not scale. Whenever a Markov model of something real is tractable, someone has already thrown information away; the question is whether they told you which.

### 6 · You cannot tell when a chain has mixed

Restated from [§7](#07-sampling-by-walking-mcmc) because it belongs in this list: convergence is guaranteed and unverifiable. Diagnostics detect some failures and certify nothing, and a multimodal target can leave every diagnostic content while an entire mode goes unvisited. This is also the honest limit on simulation-based capacity estimates and on "we ran it until it looked stable".

### What to do about all of it

A working rule, in three parts. Use Markov models for **structure** — what the states are, what transitions exist, where the feedback loops are, what the invariants must be. Trust their **comparisons** more than their absolute numbers: pooling really does beat partitioning, two bits of hysteresis really do beat one, damping really does control conditioning, and those conclusions survive the assumptions being approximate. And take **tails from measurement**, never from the model: report measured quantiles, cross-check with Little's law, which needs no distributional assumption at all, and check whether your holding times are actually exponential before believing any number derived from assuming they are. Markov models are excellent at telling you which way things move. They are unreliable about how far.

## 15 · Sources

Cited by author, title and year rather than by link, so that each reference resolves the same way in ten years as today. Everything marked *\[from the literature\]* in the text comes from this list; everything marked *\[computed here\]* comes from the script in group F.

### A. Origins

- **A. A. Markov (1906)**, "Extension of the law of large numbers to quantities depending on each other" — the chains, introduced to show the law of large numbers survives dependence.
- **A. A. Markov (1913)**, the vowel–consonant analysis of the first 20,000 letters of Pushkin's *Eugene Onegin* — the first chain fitted to data, and a language model.
- **A. N. Kolmogorov (1931)**, "On analytical methods in probability theory" — the forward and backward equations for continuous time.
- **C. E. Shannon (1948)**, "A Mathematical Theory of Communication", §3 — a discrete source *is* a Markov process; the n-gram approximations to English.
- **Perron (1907)** and **Frobenius (1912)** — the eigenvalue theory that makes stationary distributions exist.

### B. Standard texts

- **J. G. Kemeny and J. L. Snell (1960)**, *Finite Markov Chains* — absorbing chains and the fundamental matrix `N = (I − Q)⁻¹`.
- **R. A. Howard (1960)**, *Dynamic Programming and Markov Processes* — policy iteration, and the phrase "Markov decision process" in general use.
- **L. Kleinrock (1975)**, *Queueing Systems, Volume 1*; **M. Harchol-Balter (2013)**, *Performance Modeling and Design of Computer Systems* — the queueing results in §11, and the pooling argument.
- **J. R. Norris (1997)**, *Markov Chains*; **D. Levin and Y. Peres (2017)**, *Markov Chains and Mixing Times* (2nd ed.) — irreducibility, aperiodicity, reversibility, spectral gap, Cheeger's inequality.
- **R. S. Sutton and A. G. Barto (2018)**, *Reinforcement Learning: An Introduction* (2nd ed.) — the contraction argument, TD and Q-learning, and the "deadly triad".

### C. Algorithms

- **Metropolis, Rosenbluth, Rosenbluth, Teller and Teller (1953)**, "Equation of State Calculations by Fast Computing Machines"; **W. K. Hastings (1970)**, "Monte Carlo sampling methods using Markov chains and their applications".
- **S. Geman and D. Geman (1984)** — Gibbs sampling; **Kirkpatrick, Gelatt and Vecchi (1983)** — simulated annealing; **Duane, Kennedy, Pendleton and Roweth (1987)** — hybrid/Hamiltonian Monte Carlo; **Hoffman and Gelman (2014)** — the No-U-Turn Sampler.
- **Roberts, Gelman and Gilks (1997)**, "Weak convergence and optimal scaling of random walk Metropolis algorithms" — the 0.234 asymptotic acceptance rate, and ≈ 0.44 in one dimension.
- **A. J. Viterbi (1967)**, "Error bounds for convolutional codes and an asymptotically optimum decoding algorithm"; **Baum, Petrie, Soules and Weiss (1970)** — the forward–backward re-estimation; **L. R. Rabiner (1989)**, "A tutorial on hidden Markov models and selected applications in speech recognition".
- **R. E. Kalman (1960)**, "A New Approach to Linear Filtering and Prediction Problems".
- **R. Bellman (1957)**, *Dynamic Programming*; **C. Watkins (1989)** — Q-learning; **Kaelbling, Littman and Cassandra (1998)** — planning in POMDPs; **Papadimitriou and Tsitsiklis (1987)** — the complexity of Markov decision problems.
- **Jerrum, Sinclair and Vigoda (2004)** — a polynomial-time approximation scheme for the permanent, via a rapidly mixing chain; **C. Papadimitriou (1991)** — the 2-SAT random walk; **U. Schöning (1999)** — the `(4/3)ⁿ` random walk for 3-SAT.

### D. Systems

- **S. Brin and L. Page (1998)**, "The Anatomy of a Large-Scale Hypertextual Web Search Engine"; **Page, Brin, Motwani and Winograd (1999)**, "The PageRank Citation Ranking" — damping, dangling nodes, and the reported iteration counts.
- **A. K. Erlang (1917)** — loss and waiting formulas; **D. G. Kendall (1953)** — the A/S/c notation; **J. D. C. Little (1961)** — `L = λW`, proved without distributional assumptions.
- **Leland, Taqqu, Willinger and Wilson (1994)**, "On the Self-Similar Nature of Ethernet Traffic" — the measurement that ended Poisson arrivals as a default.
- **J. E. Smith (1981)**, "A study of branch prediction strategies" — the saturating counter; **S. McFarling (1993)** — gshare; **Seznec and Michaud (2006)** — TAGE.
- **D. Joseph and D. Grunwald (1997)**, "Prefetching using Markov Predictors" — a transition table in hardware.
- **Che, Tung and Wang (2002)**, and **Fricker, Robert and Roberts (2012)** — the characteristic-time approximation for LRU hit ratios.
- **Perozzi, Al-Rfou and Skiena (2014)** — DeepWalk; **Grover and Leskovec (2016)** — node2vec; **Eksombatchai et al. (2018)** — Pixie, random walk with restart in production.

### E. Modern architectures

- **Mnih et al. (2015)**, "Human-level control through deep reinforcement learning" — the four-frame stack as a Markov state.
- **Silver et al. (2016)** — AlphaGo; **Schrittwieser et al. (2020)** — MuZero, planning in a learned latent state.
- **Sohl-Dickstein et al. (2015)**; **Ho, Jain and Abbeel (2020)**, "Denoising Diffusion Probabilistic Models" — the fixed forward chain and the learned reverse, at `T = 1000`.
- **Katharopoulos et al. (2020)** — linear attention as an RNN; **Gu, Goel and Ré (2021)** — S4; **Gu and Dao (2023)** — Mamba; **Peng et al. (2023)** — RWKV.
- **Ainslie et al. (2023)** — grouped-query attention, the reason the KV figures in §12 use 8 KV heads rather than 64.
- **Leviathan, Kalman and Matias (2023)**, and **Chen et al. (2023)** — speculative decoding and speculative sampling, with the distribution-preserving acceptance rule.
- **Trofin et al. (2021)** — MLGO, ML-guided inlining in LLVM; **Mirhoseini et al. (2021)** — chip floorplanning framed as a sequential decision problem.

### F. The computed numbers

- `markov-processes/_compute.py` in this repository — pure-stdlib Python, no dependencies, one function per figure. It produces the transition-matrix powers and stationary distribution of §3, the mixing curves, the fundamental matrix of the retry ladder, the CTMC of §4 with both its stationary distributions, the PageRank values at two damping factors, the Metropolis–Hastings acceptance and effective-sample-size table, the Viterbi trellis, the value-iteration sweeps, the saturating-counter stationary distributions, the M/M/1 and Erlang-C tables, the availability figures, the KV-cache and state-size arithmetic, and the tail comparison. Running it reproduces every number printed in a figure.

**Provenance.** What is sourced: the definitions, theorems, algorithms and historical claims, all from the published record listed above. What is computed: every number appearing in a figure with a *\[computed here\]* badge, produced by `_compute.py` from the model stated beside it — these are exact for the model and say nothing about the world. What is mine: the framing throughout, the choice of examples, the reading of sequence architectures in §12 as a dispute about state size, and all of §13, which is explicitly my own model of agent sessions rather than a result. What I did not verify: I cite the literature from the published record rather than from a fresh reading of each paper for this piece, so quantities attributed to a source — Markov's letter counts, the PageRank iteration count, the optimal acceptance rates, DDPM's step count — should be checked against the primary before being reused as data. The model configuration behind the KV-cache arithmetic in §12 is a stated, representative 70B-class shape, not a specific released model. No claim here rests on a benchmark I ran.
