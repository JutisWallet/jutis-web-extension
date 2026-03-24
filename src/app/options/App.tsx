import { useEffect, useRef } from "react";

import { controller } from "@/app/shared/controller";
import { formatUsdReference, getUsdTrustLabel, getUsdTrustMessage, isReliableUsdReference } from "@/lib/format";
import { getCantonIdentitySupportState } from "@/lib/support";
import { useJutisStore } from "@/state/use-jutis-store";
import { BrandMark, Chip, Metric, SectionCard, SupportBadge } from "@/ui/components/kit";

export function OptionsApp() {
  const bootstrap = useJutisStore((state) => state.bootstrap);
  const refresh = useJutisStore((state) => state.refresh);
  const touchSession = useJutisStore((state) => state.touchSession);
  const session = useJutisStore((state) => state.session);
  const snapshot = useJutisStore((state) => state.snapshot);
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const lastTouchAtRef = useRef(0);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (session.status === "unlocked") {
      void refresh();
    }
  }, [refresh, session.status]);

  useEffect(() => {
    if (session.status !== "unlocked") {
      return;
    }

    const sendTouch = () => {
      const now = Date.now();
      if (now - lastTouchAtRef.current < 30_000) {
        return;
      }

      lastTouchAtRef.current = now;
      void touchSession();
    };

    sendTouch();
    window.addEventListener("pointerdown", sendTouch);
    window.addEventListener("keydown", sendTouch);
    window.addEventListener("focus", sendTouch);

    return () => {
      window.removeEventListener("pointerdown", sendTouch);
      window.removeEventListener("keydown", sendTouch);
      window.removeEventListener("focus", sendTouch);
    };
  }, [session.status, touchSession]);

  const supportNotes = snapshot ? controller.getSupportNotes("canton-mainnet").concat(controller.getSupportNotes("base-mainnet")) : [];
  const cantonIdentitySummary = cantonIdentity ? controller.getCantonIdentitySummary(cantonIdentity) : null;
  const cantonFeatures = cantonIdentity ? controller.getCantonFeatureMatrix(cantonIdentity) : [];
  const cantonBalances = cantonFeatures.find((feature) => feature.id === "balances") ?? null;

  return (
    <div className="jutis-options-root">
      <div
        className="panel"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          minHeight: 720,
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          overflow: "hidden"
        }}
      >
        <aside style={{ padding: 28, borderRight: "1px solid var(--border)", display: "grid", gap: 24 }}>
          <BrandMark />
          <Metric
            label={snapshot && isReliableUsdReference(snapshot.totalUsdReference) ? "Workspace" : "Workspace USD reference"}
            value={<div className="display" style={{ fontSize: 44 }}>{formatUsdReference(snapshot?.totalUsdReference)}</div>}
            note={[
              "Split-pane management surface derived from the wide Carbon reference.",
              snapshot ? getUsdTrustMessage(snapshot.totalUsdReference) : undefined
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <SectionCard title="Networks">
            <div style={{ display: "grid", gap: 10 }}>
              {controller.listNetworks().map((network) => (
                <div
                  key={network.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 18,
                    border: "1px solid var(--border-soft)",
                    background: "rgba(255,255,255,0.03)"
                  }}
                >
                  <Chip accent={network.id === "canton-mainnet"}>{network.name}</Chip>
                  {network.id === "canton-mainnet" ? (
                    <SupportBadge state={cantonBalances?.supportState ?? "reference-only"} />
                  ) : (
                    <SupportBadge state="partial" />
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard
            title="Canton linkage"
            action={cantonIdentity ? <SupportBadge state={getCantonIdentitySupportState(cantonIdentity)} /> : null}
          >
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>Mode: {cantonIdentity?.authMode ?? "unlinked"}</div>
              <div>Party: {cantonIdentity?.partyId ?? "Not linked"}</div>
              <div>Session: {session.status}</div>
              {cantonIdentitySummary?.notes.map((note) => (
                <div key={note} style={{ color: "var(--text-secondary)" }}>
                  {note}
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
        <main style={{ padding: 28, display: "grid", gap: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="display" style={{ fontSize: 34 }}>Jutis product workspace</div>
              <p style={{ color: "var(--text-secondary)", marginBottom: 0 }}>
                Product-grade extension foundation with explicit Canton and Base adapter boundaries.
              </p>
            </div>
            <Chip accent>Production-minded scaffold</Chip>
          </div>
          <SectionCard title="Portfolio summary">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {(snapshot?.byNetwork ?? []).map((entry) => (
                <div
                  key={entry.networkId}
                  style={{
                    borderRadius: 22,
                    border: "1px solid var(--border)",
                    padding: 16,
                    background: "rgba(255,255,255,0.03)"
                  }}
                >
                  <div className="eyebrow">{entry.networkId}</div>
                  <div style={{ marginTop: 10 }}>
                    <SupportBadge state={entry.networkId === "canton-mainnet" ? (cantonBalances?.supportState ?? "reference-only") : "partial"} />
                  </div>
                  <div className="display" style={{ fontSize: 28, marginTop: 10 }}>
                    {formatUsdReference(entry.totalUsdReference)}
                  </div>
                  <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 12 }}>
                    {entry.networkId === "canton-mainnet"
                      ? cantonBalances?.summary ?? "Reference/demo holdings only."
                      : "Base portfolio can be live, but still depends on RPC and local wallet activity."}
                  </div>
                  <div style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>
                    {getUsdTrustLabel(entry.totalUsdReference)} · {getUsdTrustMessage(entry.totalUsdReference)}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          {cantonFeatures.length > 0 ? (
            <SectionCard title="Canton capability states">
              <div style={{ display: "grid", gap: 12 }}>
                {cantonFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    style={{
                      display: "grid",
                      gap: 6,
                      padding: "14px 16px",
                      borderRadius: 20,
                      border: "1px solid var(--border-soft)",
                      background: "rgba(255,255,255,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <strong>{feature.label}</strong>
                      <SupportBadge state={feature.supportState} />
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{feature.summary}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Blocker: {feature.blocker}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
          <SectionCard title="Adapter notes">
            <div style={{ display: "grid", gap: 10 }}>
              {supportNotes.map((note) => (
                <div key={note} style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  {note}
                </div>
              ))}
            </div>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}
