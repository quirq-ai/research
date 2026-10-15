# Starting quirq on Reddit

Research for quirq's first steps on Reddit: which account to use, how new
accounts get treated, and where quirq can add something useful. Checked
2026-10-13 and 2026-10-14.

## Question and context

quirq has no Reddit presence. Yash asked three things:

1. Should he post from a personal account or a company account?
2. How do moderators react to new accounts that post?
3. What is the most effective way to use Reddit?

quirq builds infrastructure for running AI agents (the XO workspace) and
published a model-routing case study with Levanto on 12 October 2026. That
case study gives it real data to share.

## Method

- Read Reddit's help-centre page on spam, and AutoModerator documentation on
  two public read-only mirrors of reddit.com. Reddit blocks the cloud network
  this research ran from.
- Read the r/AgentsOfAI wiki through a mirror, and its size on GummySearch.
- On 13 October 2026, pulled the 100 newest and 25 rising posts from
  r/AI_Agents, r/AgentsOfAI, r/LLMDevs and r/ClaudeAI through their public
  RSS feeds. Kept posts from the last 72 hours about agent costs, choosing
  models, routing, multi-agent setups, memory and evaluation. Dropped vendor
  posts, link-only posts and "best framework?" polls. That left a shortlist of
  15. The 10 best fits were read in full, each with up to its first 10
  comments.

## Findings

### 1. Reddit treats people who mention their business differently from businesses that post

- Reddit's spam page asks people whose contributions "consist primarily of
  links to a business that you run, own, or otherwise benefit from" to "be
  thoughtful about the frequency of posting", and to "post authentic content
  into communities where you have a personal interest". It defines spam as
  "repeated or unsolicited actions (whether automated or manual) that
  negatively affect users". [1]
- Reddit's older community etiquette (reddiquette) put it this way: "it's fine
  to be a redditor with a website, it's not fine to be a website with a Reddit
  account". It also gave a rough ratio: if more than about 10% of your activity
  is submitting your own stuff, Reddit sees you as a spammer. These quotes come
  through a Reddit-marketing vendor's guide, not from Reddit directly. [2]
- The same guide advises founders and employees to disclose the connection
  whenever they mention their product. [2]

**Inference:** a personal account, clearly marked as quirq's founder, fits
these rules better than a brand account. A company account whose activity is
all about its own product matches the pattern Reddit calls spam.

### 2. New accounts get filtered by rules set in each community

- Each subreddit can run AutoModerator rules that check the poster's account
  age, post karma, comment karma and combined karma. [3]
- The documentation's examples remove posts with no human involved. One
  removes links to certain domains from accounts "less than a day old".
  Another removes link submissions from users with "less than 5 comment
  karma". [4]
- Each community sets its own thresholds, and they aren't usually published,
  so a new account can't tell which line it falls under. [3][4]

**Inference:** for the first couple of weeks, a new account should build
comment karma and history before it posts, and should avoid linking quirq.ai.
Otherwise its posts may vanish without anyone looking at them.

### 3. r/AgentsOfAI fits quirq and wants depth

- r/AgentsOfAI had 129k members, up 61k (89%) in a year, as of 1 October
  2026. [5]
- The wiki's community principles are "Depth over Breadth" (detailed
  technical breakdowns over "AI hype" screenshots), attribution of original
  work, and "No Link Farming": explain your project in the post body and put
  the link in the comments. [6]

### 4. What agent communities are asking this week

All of these are open threads read in full on 13 October 2026. [7]

- **People want total cost with retries counted.** In r/ClaudeAI, the poster
  and commenters asked for the same tasks run through Haiku and Opus, with
  total cost including retries. Nobody in the thread had answered with data.
  quirq's published case study is that test: 84 of 90 tasks done for $34.04
  with routing, against 83 of 90 for $69.57 on Opus 5.5 alone. [7a][8]
- **People don't trust automatic routers.** In r/AI_Agents, a student asked
  whether anything routes small and big tasks automatically. Most replies
  said routers misfire, so they route by hand. [7b]
- **One builder found routing saved nothing on long tasks.** In r/LLMDevs, a
  routing experiment on agentic browser-testing missions found no overall
  token advantage. The author asked which variable to isolate next. [7c]
- **The basic advice is already covered.** In the cost-limit threads, the
  common answers already appear many times: clear the context between tasks,
  write handoff files, run each eval several times. A new reply only adds
  something if it brings data or a case nobody covered. [7d][7e][7f]
- **Some replies look machine-written.** At least one commenter signed a
  reply "ai-assisted reply" [7c]. Polished generic answers blend into that.

**Inference:** quirq's best opening is answering these threads with its own
numbers, written plainly, in the poster's terms. A launch post can come once
the account has history.

## Recommendation (inference, not established)

1. **Account:** use Yash's personal account, with "Co-founder @ quirq" in the
   bio. Disclose the connection whenever quirq comes up.
2. **Weeks 1 and 2:** post two or three comments a day in r/AI_Agents,
   r/AgentsOfAI, r/LLMDevs and r/ClaudeAI. Only answer threads where quirq's
   data or experience adds something. Don't post links to quirq.ai yet.
3. **Week 3:** write one post built on the routing case study. Explain it in
   the post body, include what didn't work, and put the link in a comment.
   Stay and reply for the first couple of hours.

## Limitations and open questions

- The new-account thresholds of the four target subreddits weren't checked.
  Their sidebars need reading from a logged-in browser.
- The quotes in finding 1 come from a vendor's guide quoting older Reddit
  etiquette, not from a current Reddit policy page.
- Comment counts and thread ages are approximate, taken on 13 October 2026.
- It is untested whether answering threads leads to signups for quirq.

## References

1. Reddit Help, "What constitutes spam? Am I a spammer?",
   https://support.reddithelp.com/hc/en-us/articles/360043504051-What-constitutes-spam-Am-I-a-spammer
   (checked 2026-10-14).
2. Redship, "The complete guide to Reddit self-promotion rules in 2026",
   https://redship.io/blog/reddit-self-promotion-rules-2026 (a
   Reddit-marketing vendor; used only for its quotes of reddiquette; checked
   2026-10-14).
3. r/AutoModerator wiki, "can_do", mirror:
   https://lr.eu.psf.lt/r/AutoModerator/wiki/can_do (checked 2026-10-14).
4. r/AutoModerator wiki, "writing basic rules", mirror:
   https://redlib.groet-infra.nl/wiki/automoderator/writing-basic-rules
   (checked 2026-10-14).
5. GummySearch, r/AgentsOfAI, https://gummysearch.com/r/AgentsOfAI/
   (page last updated 2026-10-01).
6. r/AgentsOfAI wiki, mirror: https://r.datuan.dev/r/AgentsOfAI/wiki/index
   (checked 2026-10-14).
7. Threads read on 2026-10-13:
   a. https://www.reddit.com/r/ClaudeAI/comments/1x4q63a/fable_opus_sonnet_haiku_how_do_you_decide_which/
   b. https://www.reddit.com/r/AI_Agents/comments/1x4vf7g/multiagent_orchestration_with_claude_pro_google/
   c. https://www.reddit.com/r/LLMDevs/comments/1x2ry42/i_tested_dynamic_model_routing_for_an_agentic/
   d. https://www.reddit.com/r/LLMDevs/comments/1x486gs/how_to_keep_costs_down/
   e. https://www.reddit.com/r/ClaudeAI/comments/1x4x7dd/when_you_split_work_across_several_claude_code/
   f. https://www.reddit.com/r/LLMDevs/comments/1x4q76a/how_do_you_tell_whether_an_agent_change_made_it/
8. quirq on X, research thread on the Levanto Sage case study, 12 October
   2026: https://x.com/quirq_ai/status/2109663388024656080
