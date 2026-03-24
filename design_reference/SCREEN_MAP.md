# Screen Map
*All screens in the Jutis wallet, their source reference, and navigation entry points.*

---

## Screen Inventory

### Onboarding Flow
| Screen | Route | Source | Entry |
|---|---|---|---|
| Welcome | `welcome` | wallet_1 | No vault |
| Create Wallet | `create` | wallet_1 | Welcome → "Create wallet" |
| Import Wallet | `import` | wallet_1 | Welcome → "Import wallet" |
| Register | `register` | (new) | Welcome → "Sign in with Google/Telegram" |

### Main Wallet
| Screen | Route | Source | Entry |
|---|---|---|---|
| Home / Portfolio | `home` | wallet_1/2/3 | Bottom nav (🏠) |
| Activity | `activity` | wallet_1/2 | Bottom nav (📋) |
| Swap | `swap` | wallet_1/2 | Bottom nav (⇄) |
| Friends | `friend` | (new) | Bottom nav (👤) |
| Settings | `settings` | (existing) | Bottom nav (⚙) |

### Sub-Screens
| Screen | Route | Source | Entry |
|---|---|---|---|
| Link Party | `link-party` | (existing) | Settings → "Link party" |
| Environment Config | `environment` | (existing) | Settings → "Configure environment" |
| Dapp Connect | `dapp-connect` | wallet_6 | Hub → "Discover" tile |
| Token Details | `token-details` | wallet_3 | Home → tap token in Holdings |

### Overlays (bottom sheets)
| Overlay | Trigger | Source |
|---|---|---|
| Send | Home → Quick Action → Send | (existing) |
| Receive | Home → Quick Action → Receive | (existing) |
| Activity Detail | Activity item tap | (existing) |
| Connection Request | Dapp Connect → "Connect App" | wallet_4 |

---

## Navigation Tree

```
welcome / create / import / unlock
         ↓ (after unlock)
    home ←→ activity ←→ swap ←→ friend ←→ settings
                          ↓
                    link-party / environment
                          ↓
                       dapp-connect
                          ↓
                    connection-request (overlay)
```

---

## Screen Hierarchy

**Level 0** — No nav, no header: welcome, create, import, unlock, register
**Level 1** — Header + BottomNav: home, activity, swap, friend, settings, dapp-connect, token-details
**Level 2** — Overlays (bottom sheets): send, receive, activity-detail, connection-request

---

## Screen Sizing Rules

- All screens: full width, scrollable, `padding: 18px 20px 96px` (bottom accounts for BottomNav 64px + 32px breathing room)
- SectionCards stack vertically with `gap: 14–18px`
- No horizontal page transitions — all navigation is vertical stack or overlay
