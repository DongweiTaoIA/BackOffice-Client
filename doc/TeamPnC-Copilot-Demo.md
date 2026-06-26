# Team PnC Copilot — Demo Script

> Audience: BackOffice team · Target length: ~5 minutes · Format: live walkthrough of the chat panel
> Prerequisites: backend running · sample dealer `BC006642` · contracts `AQG003717530` and `BWRCA0119465` loaded

---

## 1. Opening (~20 sec)

> "Today I want to show you the **Team PnC Copilot** — the AI assistant we built into the BackOffice portal, sitting right there in the chat panel on the right.
> The goal is simple: give our admin team an **AI-powered helper** that makes their daily tasks **faster, easier, and more accurate**."

---

## 2. A quick honest note (~20 sec)

> "One thing up front: I **don't have access to the OpenAI API key** — and right now OpenAI is the only model approved for us to use.
> So for this demo, I'm running a **small language model locally** on my machine. That means the answers are simpler and a few capabilities are limited — **but the concept is exactly the same**.
> The moment we plug into OpenAI, the assistant becomes far more powerful, while the experience you're about to see stays the same."

---

## 3. What it does for admins (~15 sec)

> "Instead of jumping between systems, screens, and IT tickets, the admin just **types a question in plain English — or French** — and the assistant **understands the intent, calls the right API, brings the answer back into the portal, and suggests the next step**."

---

## 4. Scenario 1 — Can this dealer sell this program? (~50 sec)

> "Our business owners gave us a few real use cases. Let's start with the most common one:
> *'Can this dealer sell this program?'*
> Today, answering that means logging into Unifi, clicking through menus, and cross-checking. Watch what it looks like here."

**Type:** `Can BC006642 sell EW Retail Wearable Parts?`

> "Notice what just happened.
> The assistant **understood the question**, **called our real eligibility API** behind the scenes, and brought the answer back in **plain language** — right inside the chat.
>
> But it doesn't stop at the answer. It also **suggests the next step**:
> - If the dealer **can** sell the program → you'll see a **'Deactivate'** button, in case you need to turn it off.
> - If the dealer **cannot** sell it → you'll see an **'Activate Product'** button, so you can grant access on the spot.
>
> The admin just **clicks the button right here in the chat** — no jumping to another screen, no copying IDs, no IT ticket. The whole task finishes inside one conversation."

> **"One question, one answer, one click — job done."**

---

## 5. Scenario 2 — Is this contract eligible for cancellation? (~50 sec)

> "Here's a second use case our business owners asked for: checking whether a contract can be cancelled."

**Type:** `Is Contract AQG003717530 eligible for cancellation?`
*(Backup: `Is Contract BWRCA0119465 eligible for cancellation?`)*

> "Same pattern as before — natural language in, real API call behind the scenes, clear answer back.
>
> This time there are **two possible outcomes**:
> - If the contract is **not eligible**, the assistant says *'No'* and **explains the reason** — for example, it's already cancelled, expired, or outside the cancellation window. The admin gets the *why* immediately, no digging required.
> - If the contract **is eligible**, the assistant says *'Yes'* and asks: *'Do you want to cancel it now?'* with a **'Cancel Contract'** button right there in the chat."

**Click 'Cancel Contract'** *(or just type `yes`)*

> "The **cancellation page opens automatically** in the main panel, **pre-filled with the contract** — so the admin lands exactly where they need to be to finish the job. From question to action in a single conversation."

---

## 6. Scenario 3 — Chat as a universal search box (~30 sec)

> "The chat panel is also a **smart search box**. Instead of clicking through menus, the admin can just ask for whatever they're looking for — a contract, a dealer, anything — and the assistant takes them straight there."

**Try a few:**
- `search contract AQG003717530`
- `find dealer BC006624`
- `find dealers in Quebec`

> "For each one, the AI figures out **what kind of item** you're after, **calls the right API**, and **opens the matching page** directly in the main panel — already filtered, already loaded.
>
> No more guessing which menu, which filter, which screen. **One chat box, anything you need, one step away.**"

> **"Type what you need — land where you need to be."**

---

## 7. Why this matters — from copilot to real agents (~40 sec)

> "What you've seen today is just the **starting point**.
>
> Right now the assistant is a **copilot** — it answers questions, calls APIs, and suggests the next step while a human stays in the driver's seat.
>
> But every new skill we add to this chat box is laying the foundation for something bigger: **real AI agents** that can take a whole job and run it end-to-end.
>
> Think about tasks like:
> - *'Reconcile yesterday's payment batch and flag the failures.'*
> - *'Onboard this new dealer — set up the operator, assign the role, send the welcome email.'*
> - *'Find every contract expiring next month and prepare the renewal package.'*
>
> These are jobs that take an admin **hours** today. With agents, the admin just describes the **goal** — the agent does the work, reports back, and **asks for approval** before anything critical.
>
> The copilot we're shipping now is how we get there. Same chat box, same trust model, same UI — just **more capable every release**."

---

## 8. Closing line (~5 sec)

> **"Today, a copilot. Tomorrow, a teammate."**

---

## Delivery tips

- **Pause after the honest note** — owning the constraint up front builds trust before the demo, not after.
- After clicking a suggestion chip, **wait one beat** and say *"…and that's it — the change is applied."*
- If the local model stumbles on a question, fall back to: *"This is where a full-size model would shine — same flow, sharper understanding."*
- Total runtime: ~4 min of narration + ~1 min of clicks, pauses, and questions = comfortable 5 min.

