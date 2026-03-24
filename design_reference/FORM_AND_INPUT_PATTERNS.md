# Form & Input Patterns
*Input fields, selects, toggles, and form layout.*

---

## InputField Component

**Jutis usage:** `<InputField label="..." value={...} onChange={...} />`

Renders a labeled text input with consistent styling.

**Props:**
```tsx
interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
  multiline?: boolean;
  placeholder?: string;
}
```

**Internal styling:**
```tsx
{
  width: "100%",
  borderRadius: 20,
  border: "1px solid var(--border)",
  background: "rgba(18,22,29,0.6)",
  color: "var(--text-primary)",
  padding: "14px 16px",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s"
}
// Focus: border-color → accent
```

---

## Select (Native)

Used for asset selection in Send overlay.

```tsx
{
  width: "100%",
  borderRadius: 20,
  border: "1px solid var(--border)",
  background: "rgba(18,22,29,0.6)",
  color: "var(--text-primary)",
  padding: "14px 16px",
  fontSize: 14
}
```

---

## Toggle / Checkbox

Inline toggle in settings/preferences.

```tsx
<label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <span>Auto-lock minutes</span>
  <input type="checkbox" />
</label>
```

Styled via CSS custom properties or inline base styles.

---

## Number Input

Used for auto-lock minutes, slippage bps.

```tsx
{
  width: 72,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "rgba(18,22,29,0.6)",
  color: "var(--text-primary)",
  padding: "10px 12px",
  fontSize: 13
}
```

---

## Search Input

Used in FriendScreen search.

```tsx
<div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
  <div style={{ flex: 1 }}>
    <InputField label="Search @username" ... />
  </div>
  <PrimaryButton>Find</PrimaryButton>
</div>
```

---

## Mode Button Group

Used in ImportWalletScreen (Mnemonic / Private key tabs).

```tsx
<div style={{ display: "flex", gap: 8 }}>
  {["mnemonic", "privateKey"].map(mode => (
    <button
      key={mode}
      onClick={() => setMode(mode)}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 18,
        border: mode === active
          ? "1.5px solid rgba(220,232,122,0.2)"
          : "1px solid var(--border)",
        background: mode === active
          ? "rgba(220,232,122,0.12)"
          : "rgba(255,255,255,0.03)",
        color: mode === active ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  ))}
</div>
```

---

## Form Spacing

| Pattern | Spacing |
|---|---|
| Label → Input | 8px (`gap: 8`) |
| Input → Button | 14px |
| Form fields (vertical stack) | 14px |
| SectionCard padding | 16–20px |

---

## Button Height Standards

| Button Type | Height | Radius |
|---|---|---|
| PrimaryButton (large) | 56px | 20px |
| PrimaryButton (medium) | 48px | 16px |
| SecondaryButton | auto (padding-driven) | 14–18px |
| Icon-only nav button | 40px | — |
