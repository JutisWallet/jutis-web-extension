# Copy & Density Rules
*Text tone, label density, and word choice guidelines.*

---

## Tone Principles

1. **Minimal.** No verbose explanations. Each sentence earns its place.
2. **Informational over promotional.** Describe what something IS, not what it WILL BE.
3. **Honest about capability.** Never imply live functionality when it's scaffold/mock.
4. **Product, not demo.** Copy should feel like a real wallet, not a design presentation.

---

## Label Density

**Eyebrow / category label:** `10–11px`, `uppercase`, `tracking-widest`, `font-weight: 700`, `color: text-secondary`
```tsx
<span style={{
  fontSize: 11,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontWeight: 700
}}>Ecosystem</span>
```

**Section title:** `14px`, `font-weight: 700`
**Card heading:** `14px`, `font-weight: 700`
**Body text:** `13px`, `color: text-secondary`
**Helper/note text:** `12px`, `color: text-secondary`
**Mono (addresses, amounts):** `10–11px`, `font-family: monospace`

---

## Word Choice Guidelines

| Instead of | Use | Reason |
|---|---|---|
| "Canton Network" (verbose) | "Canton" | Shorter, consistent with nav pill |
| "Create a new wallet" | "Create wallet" | Cleaner, direct |
| "Notification has been set up successfully!" | "Notification registered." | Fewer words, same meaning |
| "Sample data — this is not real" | "Sample activity — live data will appear when connected." | Actionable, honest |
| "Live transfer unavailable in this build" | "Live transfer unavailable" | Condensed |
| "You have successfully connected your wallet" | (use none — just close overlay) | No redundant confirmation |

---

## Screen Titles

| Screen | Title | Source |
|---|---|---|
| Home | (no title — header only) | wallet_1 |
| Activity | "Recent Activity" (section label) | wallet_1 |
| Swap | (no title — readiness card) | wallet_1 |
| Friend | "Friend search" / "Friends" (card titles) | new |
| Settings | "Security", "Preferences", "Canton identity" (card titles) | existing |
| Dapp Connect | "Canton Navigator" | wallet_6 |
| Token Details | (no explicit title — token name is the anchor) | wallet_3 |

---

## Never Use These Phrases

- "demo mode" or "demo data" in a way that sounds like a feature
- "This is a placeholder" — use "Sample data" instead
- "Coming soon" — if not implemented, don't mention it
- "Web 3 wallet with Canton integration" — just say "Canton wallet" or "Jutis"

---

## Amount & Balance Copy

- Use `$` prefix for USD values: `$3,482.20`
- Signed amounts: `+ 100 CTN` / `- 50 USDC`
- Balance label: "Total Balance" (eyebrow) + `$X,XXX.XX` (large display)
- USD reference note: use `getUsdTrustLabel()` + `getUsdTrustMessage()` — do not hardcode trust labels

---

## Canton Copy Rules

- Canton-specific features: use Canton name + honest readiness note
- "Canton" as adjective: "Canton transfer", "Canton party", "Canton network"
- Readiness summaries: sourced from `CantonFeatureMatrix[].summary` — do not rewrite
- Blockers: from `CantonFeatureMatrix[].blocker` — do not paraphrase

---

## Notification Copy (Agent/Telegram)

- "I'll notify you on @username when funds arrive."
- "Sample activity — live data will appear when connected." (disclaimer)
- "Live notifications require real event detection to be implemented." (honest capability)

---

## Privacy & Security Copy

- Short and direct: "Only connect to apps you trust."
- No legal disclaimers in the extension (→ Terms of Service link if needed)
- When asking for sensitive input (password, phrase): brief helper text only

---

## Label Conventions

| Pattern | Example |
|---|---|
| Section eyebrow | `text-transform: uppercase`, `tracking-widest` |
| Metric label | `color: text-secondary`, `font-size: 13` |
| Metric value | `font-weight: 700`, `font-size: 14–15` |
| Note/helper | `font-size: 12`, `color: text-secondary` |
| Button label | `font-weight: 700`, `font-size: 13–14` |
| Nav label | `11px`, `uppercase`, `tracking-tighter` |
