import type { PropsWithChildren, ReactNode } from "react";

import type { ProductSupportState } from "@/core/models/types";

export function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 6, height: 22, borderRadius: 999, background: "var(--accent)" }} />
      <span
        style={{
          fontSize: 14,
          fontStyle: "italic",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        Jutis
      </span>
    </div>
  );
}

export function Chip(props: PropsWithChildren<{ accent?: boolean }>) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        background: props.accent ? "rgba(220, 232, 122, 0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${props.accent ? "rgba(220, 232, 122, 0.18)" : "var(--border-soft)"}`,
        color: props.accent ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 600
      }}
    >
      {props.children}
    </div>
  );
}

export function SupportBadge(props: { state: ProductSupportState }) {
  const palette = getSupportPalette(props.state);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em"
      }}
    >
      {props.state}
    </div>
  );
}

export function PrimaryButton(props: PropsWithChildren<{ onClick?: () => void; disabled?: boolean; full?: boolean }>) {
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        width: props.full ? "100%" : undefined,
        background: "var(--accent)",
        color: "#11151c",
        border: 0,
        padding: "16px 18px",
        borderRadius: 24,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: props.disabled ? 0.55 : 1,
        transform: "translateZ(0)"
      }}
    >
      {props.children}
    </button>
  );
}

export function SecondaryButton(props: PropsWithChildren<{ onClick?: () => void; disabled?: boolean; full?: boolean }>) {
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        width: props.full ? "100%" : undefined,
        background: "rgba(255,255,255,0.04)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        padding: "14px 16px",
        borderRadius: 22,
        fontWeight: 700,
        opacity: props.disabled ? 0.55 : 1
      }}
    >
      {props.children}
    </button>
  );
}

export function SectionCard(props: PropsWithChildren<{ title?: string; action?: ReactNode }>) {
  return (
    <section
      style={{
        background: "rgba(35,39,48,0.82)",
        border: "1px solid var(--border)",
        borderRadius: 28,
        padding: 20
      }}
    >
      {props.title ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="eyebrow">{props.title}</span>
          {props.action}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function InputField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  const sharedStyle = {
    width: "100%",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "rgba(18, 22, 29, 0.6)",
    color: "var(--text-primary)",
    padding: "14px 16px"
  } as const;

  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span className="eyebrow">{props.label}</span>
      {props.multiline ? (
        <textarea
          rows={4}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          style={sharedStyle}
        />
      ) : (
        <input
          type={props.type ?? "text"}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          style={sharedStyle}
        />
      )}
    </label>
  );
}

export function Metric(props: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span className="eyebrow">{props.label}</span>
      <div>{props.value}</div>
      {props.note ? <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{props.note}</span> : null}
    </div>
  );
}

export function NavButton(props: PropsWithChildren<{ active?: boolean; onClick?: () => void }>) {
  return (
    <button
      onClick={props.onClick}
      style={{
        background: "transparent",
        border: 0,
        color: props.active ? "var(--accent)" : "var(--text-secondary)",
        display: "grid",
        gap: 4,
        justifyItems: "center",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em"
      }}
    >
      {props.children}
    </button>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: "var(--border-soft)", width: "100%" }} />;
}

function getSupportPalette(state: ProductSupportState): { background: string; border: string; color: string } {
  switch (state) {
    case "live":
      return {
        background: "rgba(220, 232, 122, 0.12)",
        border: "rgba(220, 232, 122, 0.18)",
        color: "var(--accent)"
      };
    case "partial":
      return {
        background: "rgba(138, 180, 255, 0.12)",
        border: "rgba(138, 180, 255, 0.18)",
        color: "#9fc0ff"
      };
    case "reference-only":
      return {
        background: "rgba(245, 193, 103, 0.12)",
        border: "rgba(245, 193, 103, 0.18)",
        color: "#f5c167"
      };
    case "unsupported":
      return {
        background: "rgba(255, 125, 125, 0.08)",
        border: "rgba(255, 125, 125, 0.18)",
        color: "var(--danger)"
      };
  }
}
