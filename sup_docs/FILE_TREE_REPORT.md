# Jutis Extension — File Tree Report

## Project Tree (Important Files Only)

```
web-extension-jutis/
│
├── public/                          # Static assets + manifest source for build
│   ├── manifest.json               # MV3 manifest (INCOMPLETE — no icons, no CSP)
│   └── assets/                     # EMPTY / DOES NOT EXIST — icons must go here
│
├── src/
│   ├── app/
│   │   ├── popup/
│   │   │   ├── main.tsx           # Popup React entry point
│   │   │   └── App.tsx            # Popup root component (~1131 lines)
│   │   ├── options/
│   │   │   ├── main.tsx           # Options React entry point
│   │   │   └── App.tsx            # Options root component (~208 lines)
│   │   ├── background/
│   │   │   └── index.ts           # Service worker entry (alarms, message routing)
│   │   └── shared/
│   │       ├── controller.ts      # Exports singleton JutisController
│   │       ├── runtime-client.ts  # Popup-side chrome.runtime.sendMessage wrapper
│   │       ├── runtime-dispatcher.ts # Background-side message executor
│   │       └── runtime-types.ts   # Shared RuntimeRequest/Response types
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   └── kit.tsx            # BrandMark, Chip, SupportBadge, Button, Input, etc.
│   │   └── styles/
│   │       └── global.css         # Global stylesheet
│   │
│   ├── core/
│   │   ├── models/
│   │   │   ├── types.ts           # Shared TypeScript types
│   │   │   └── fixtures.ts        # BUILT_IN_NETWORKS, demo assets, demo activity
│   │   ├── orchestration/
│   │   │   └── jutis-controller.ts # Main controller (wallet adapters, swap, vault)
│   │   └── services/
│   │       ├── vault-service.ts   # Vault creation/import/unlock
│   │       ├── session-service.ts # Session management + auto-lock
│   │       ├── network-registry.ts # Network registry
│   │       ├── errors.ts          # WalletError class
│   │       └── usd-reference-service.ts # USD pricing aggregator
│   │
│   ├── adapters/
│   │   ├── base/
│   │   │   ├── base-wallet-adapter.ts  # Base EVM wallet adapter
│   │   │   └── services/
│   │   │       ├── base-activity-indexer.ts
│   │   │       ├── base-transaction-service.ts
│   │   │       ├── base-transaction-lifecycle-service.ts
│   │   │       └── base-swap-adapter.ts
│   │   └── canton/
│   │       ├── canton-wallet-adapter.ts
│   │       └── services/
│   │           ├── canton-activity-indexer.ts
│   │           ├── canton-transfer-service.ts
│   │           ├── canton-swap-adapter.ts
│   │           └── canton-reference-data-service.ts
│   │
│   ├── swap/
│   │   ├── swap-state-machine.ts  # Swap lifecycle state machine
│   │   ├── swap-provider-registry.ts
│   │   └── quote-engine.ts        # Quote gathering + readiness evaluation
│   │
│   ├── storage/
│   │   ├── extension-storage.ts   # chrome.storage wrapper
│   │   └── vault-repository.ts    # Persistent vault + preferences + journal I/O
│   │
│   ├── security/
│   │   └── crypto.ts             # Crypto utilities
│   │
│   ├── lib/
│   │   ├── format.ts             # Formatting helpers (dates, USD, addresses)
│   │   └── support.ts            # Support state helpers
│   │
│   └── state/
│       └── use-jutis-store.ts    # Zustand store (full app state)
│
├── dist/                          # Build output (load THIS in developer mode)
│   ├── manifest.json             # Same as public/manifest.json
│   ├── popup.html                # WRONG SCRIPT REF — loads /assets/options.js
│   ├── options.html              # WRONG SCRIPT REF — loads /assets/popup.js
│   └── assets/
│       ├── background.js         # Compiled service worker
│       ├── popup.js              # Compiled popup bundle
│       ├── options.js           # Compiled options bundle
│       ├── controller.js         # Compiled controller
│       ├── global.js             # Compiled shared modules
│       ├── runtime-dispatcher.js # Compiled dispatcher
│       └── global.css           # Compiled stylesheet
│
├── docs/                          # Architecture + research documentation
│   ├── design-audit.md
│   ├── canton-research.md
│   ├── canton-wallet-architecture.md
│   ├── canton-capability-matrix.md
│   ├── base-research.md
│   ├── base-wallet-architecture.md
│   ├── base-activity-and-reconciliation.md
│   ├── product-baseline.md
│   ├── feature-matrix.md
│   ├── swap-architecture.md
│   ├── swap-readiness.md
│   ├── security-model.md
│   ├── session-security-review.md
│   ├── pricing-integrity.md
│   ├── testing-strategy.md
│   ├── extension-runtime-audit.md
│   ├── extension-publish-and-test-guide.md
│   ├── final-delivery-report.md
│   ├── gap-closure-plan.md
│   └── architecture-cleanup-report.md
│
├── tests/                         # Vitest unit tests
│   ├── vault-service.test.ts
│   ├── base-wallet-adapter.test.ts
│   ├── base-transaction-lifecycle-service.test.ts
│   ├── canton-capability-gating.test.ts
│   └── setup.ts
│
├── designed_source/               # Reference UI designs (Carbon-based)
│   └── carbon_main_wallet_*/
│
├── node_modules/
│
├── popup.html                    # Dev popup entry (source, correct refs)
├── options.html                  # Dev options entry (source, correct refs)
├── index.html                    # Dev root entry (points to popup, NOT extension page)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── eslint.config.js
├── README.md
└── START_COMMANDS.md
```

---

## Missing Expected Extension Files

### Required for MV3 Loading (P0)

| Missing File | Notes |
|---|---|
| **Extension icons** | No `icon-16.png`, `icon-48.png`, `icon-128.png` or equivalent in `public/` or `public/assets/` |
| **`public/assets/` directory** | Does not exist — icons must live somewhere |

### Standard MV3 Optional (P2/P3)

| Missing File | Notes |
|---|---|
| **`_locales/` folder** | No i18n support. Required for Chrome Web Store |
| **`content_scripts`** | None defined — no page injection capability |
| **`sidepanel`** | None defined |
| **`devtools`** | None defined |
| **`offscreen`** | None defined |
| **`web_accessible_resources`** | None defined |

### Build Output Issue

| Issue | File | Expected | Actual |
|---|---|---|---|
| Script swap | `dist/popup.html` | `/assets/popup.js` | `/assets/options.js` |
| Script swap | `dist/options.html` | `/assets/options.js` | `/assets/popup.js` |

---

*Generated from direct filesystem inspection. node_modules excluded.*
