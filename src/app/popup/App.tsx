import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { controller } from "@/app/shared/controller";
import type { CantonIdentity } from "@/core/models/types";
import { jutisNameService } from "@/core/services/jutis-name-service";
import type { FriendConnection, FriendReadiness, FriendSearchResult } from "@/core/models/social-types";
import { formatDate, formatUsdReference, getUsdTrustLabel, getUsdTrustMessage, isReliableUsdReference, shortValue } from "@/lib/format";
import { getActivitySupportState, getAssetSupportState, getCantonIdentitySupportState } from "@/lib/support";
import { selectActivity, useJutisStore, type PopupScreen } from "@/state/use-jutis-store";
import { BrandMark, Chip, Divider, InputField, Metric, NavButton, PrimaryButton, SecondaryButton, SectionCard, SupportBadge } from "@/ui/components/kit";

function Header() {
  const preferences = useJutisStore((state) => state.preferences);
  const isCantonSelected = preferences?.selectedNetworkId === "canton-mainnet";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        backdropFilter: "blur(16px)",
        background: "rgba(26, 29, 35, 0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "28px 24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <BrandMark />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled
          style={{
            border: `1px solid ${isCantonSelected ? "rgba(220,232,122,0.2)" : "rgba(255,255,255,0.06)"}`,
            background: isCantonSelected ? "rgba(220,232,122,0.12)" : "rgba(255,255,255,0.04)",
            color: isCantonSelected ? "var(--accent)" : "var(--text-secondary)",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "default"
          }}
        >
          Canton
        </button>
      </div>
    </header>
  );
}

function ErrorBanner() {
  const error = useJutisStore((state) => state.error);
  const clearError = useJutisStore((state) => state.clearError);

  if (!error) {
    return null;
  }

  return (
    <div
      style={{
        margin: "16px 20px 0",
        padding: "12px 14px",
        borderRadius: 18,
        border: "1px solid rgba(255,125,125,0.18)",
        background: "rgba(255,125,125,0.08)",
        color: "var(--danger)",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 13
      }}
    >
      <span>{error}</span>
      <button
        onClick={clearError}
        style={{ border: 0, background: "transparent", color: "inherit", fontWeight: 700 }}
      >
        Close
      </button>
    </div>
  );
}

function getCantonFeatureEntry(featureId: "identity" | "balances" | "receive" | "send" | "activity" | "swap", cantonIdentity: CantonIdentity | null) {
  if (!cantonIdentity) {
    return null;
  }

  return controller.getCantonFeatureMatrix(cantonIdentity).find((feature) => feature.id === featureId) ?? null;
}

function WelcomeScreen() {
  const setScreen = useJutisStore((state) => state.setScreen);

  return (
    <div style={{ padding: 22, display: "grid", gap: 18 }}>
      <SectionCard>
        <div style={{ display: "grid", gap: 16 }}>
          <BrandMark />
          <div style={{ display: "grid", gap: 8 }}>
            <span className="eyebrow">Canton</span>
            <div className="display" style={{ fontSize: 44, lineHeight: 1 }}>
              Your Canton protocol wallet.
            </div>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Jutis provides Canton party identity management, transfer planning, and portfolio tracking through the Canton protocol. Live Canton ledger features are available once a party identity is linked.
            </p>
          </div>
          <PrimaryButton full onClick={() => setScreen("create")}>
            Create wallet
          </PrimaryButton>
          <SecondaryButton full onClick={() => setScreen("import")}>
            Import wallet
          </SecondaryButton>
        </div>
      </SectionCard>
      <SectionCard title="Canton readiness">
        <div style={{ display: "grid", gap: 10 }}>
          <Chip accent>Party-based identity</Chip>
          <Chip>Transfer planning surface</Chip>
          <Chip>Reference portfolio data</Chip>
        </div>
      </SectionCard>
    </div>
  );
}

function CreateWalletScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const createWallet = useJutisStore((state) => state.createWallet);
  const busy = useJutisStore((state) => state.busy);
  const setScreen = useJutisStore((state) => state.setScreen);
  const canSubmit = password.length >= 8 && password === confirmPassword;

  return (
    <div style={{ padding: 22, display: "grid", gap: 18 }}>
      <SectionCard title="Create wallet">
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Jutis encrypts your local secret at rest. Canton identity remains a separate party-linking concern and is not linked to a live topology by default.
          </p>
          <InputField label="Password" type="password" value={password} onChange={setPassword} />
          <InputField label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          <PrimaryButton full disabled={!canSubmit || busy} onClick={() => void createWallet(password)}>
            {busy ? "Creating..." : "Create vault"}
          </PrimaryButton>
          <SecondaryButton full onClick={() => setScreen("welcome")}>
            Back
          </SecondaryButton>
        </div>
      </SectionCard>
    </div>
  );
}

function ImportWalletScreen() {
  const [mode, setMode] = useState<"mnemonic" | "privateKey">("mnemonic");
  const [password, setPassword] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const importFromMnemonic = useJutisStore((state) => state.importFromMnemonic);
  const importFromPrivateKey = useJutisStore((state) => state.importFromPrivateKey);
  const busy = useJutisStore((state) => state.busy);
  const setScreen = useJutisStore((state) => state.setScreen);

  return (
    <div style={{ padding: 22, display: "grid", gap: 18 }}>
      <SectionCard title="Import wallet">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMode("mnemonic")} style={modeButtonStyle(mode === "mnemonic")}>
              Mnemonic
            </button>
            <button onClick={() => setMode("privateKey")} style={modeButtonStyle(mode === "privateKey")}>
              Private key
            </button>
          </div>
          <InputField label="Password" type="password" value={password} onChange={setPassword} />
          <InputField
            label={mode === "mnemonic" ? "Recovery phrase" : "Private key"}
            multiline
            value={secretValue}
            onChange={setSecretValue}
          />
          <PrimaryButton
            full
            disabled={password.length < 8 || !secretValue.trim() || busy}
            onClick={() =>
              mode === "mnemonic"
                ? void importFromMnemonic(password, secretValue)
                : void importFromPrivateKey(password, secretValue.trim() as `0x${string}`)
            }
          >
            {busy ? "Importing..." : "Import"}
          </PrimaryButton>
          <SecondaryButton full onClick={() => setScreen("welcome")}>
            Back
          </SecondaryButton>
        </div>
      </SectionCard>
    </div>
  );
}

function UnlockScreen() {
  const [password, setPassword] = useState("");
  const unlock = useJutisStore((state) => state.unlock);
  const busy = useJutisStore((state) => state.busy);

  return (
    <div style={{ padding: 22, display: "grid", gap: 18 }}>
      <SectionCard>
        <div style={{ display: "grid", gap: 16 }}>
          <BrandMark />
          <Metric
            label="Unlock"
            value={<div className="display" style={{ fontSize: 40 }}>Welcome back.</div>}
            note="Your vault stays encrypted until you unlock this session."
          />
          <InputField label="Password" type="password" value={password} onChange={setPassword} />
          <PrimaryButton full disabled={password.length < 8 || busy} onClick={() => void unlock(password)}>
            {busy ? "Unlocking..." : "Unlock wallet"}
          </PrimaryButton>
        </div>
      </SectionCard>
    </div>
  );
}

function HomeScreen() {
  const [qaOpen, setQaOpen] = useState(false);
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const snapshot = useJutisStore((state) => state.snapshot);
  const setOverlay = useJutisStore((state) => state.setOverlay);
  const setScreen = useJutisStore((state) => state.setScreen);
  const setSelectedActivity = useJutisStore((state) => state.setSelectedActivity);
  const setSelectedTokenId = useJutisStore((state) => state.setSelectedTokenId);
  const preferences = useJutisStore((state) => state.preferences);

  if (!snapshot || !preferences) {
    return null;
  }

  const selectedNetworkAssets = snapshot.assets.filter((asset) => asset.networkId === preferences.selectedNetworkId);
  const recentActivity = snapshot.activity.slice(0, 2);
  const totalUsdTrust = getUsdTrustLabel(snapshot.totalUsdReference);
  const isCantonSelected = preferences.selectedNetworkId === "canton-mainnet";
  const cantonBalances = getCantonFeatureEntry("balances", cantonIdentity);

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 18 }}>
      {/* Portfolio header */}
      <SectionCard>
        <div style={{ display: "grid", gap: 14 }}>
          {/* Address pill */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "var(--text-secondary)",
              background: "rgba(255,255,255,0.05)",
              padding: "5px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              {cantonIdentity?.partyId
                ? `${cantonIdentity.partyId.slice(0, 8)}...${cantonIdentity.partyId.slice(-4)}`
                : "No party linked"}
            </span>
          </div>
          {/* Balance */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ fontSize: 28, color: "var(--text-secondary)", marginRight: 2 }}>$</span>
              <span className="display" style={{ fontSize: 56, fontWeight: 600 }}>{formatUsdReference(snapshot.totalUsdReference)}</span>
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Chip accent>{totalUsdTrust} USD</Chip>
            </div>
          </div>
          {/* Quick Action Hub */}
          <div style={{
            background: "rgba(35,39,48,0.9)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 28,
            padding: 12
          }}>
            <button
              onClick={() => setQaOpen(!qaOpen)}
              style={{
                width: "100%",
                height: 56,
                background: "var(--accent)",
                border: 0,
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#11151c", fontWeight: 800, fontSize: 14 }}>
                ⚡ Quick Action
              </div>
              <span style={{ color: "#11151c", opacity: 0.5, fontSize: 18, transform: qaOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
            </button>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 8,
              overflow: "hidden",
              maxHeight: qaOpen ? 200 : 0,
              opacity: qaOpen ? 1 : 0,
              transition: "max-height 0.25s ease, opacity 0.2s ease"
            }}>
              <SecondaryButton full onClick={() => { setOverlay("send"); setQaOpen(false); }}>
                Send
              </SecondaryButton>
              <SecondaryButton full onClick={() => { setOverlay("receive"); setQaOpen(false); }}>
                Receive
              </SecondaryButton>
              <SecondaryButton full onClick={() => { setScreen("swap"); setQaOpen(false); }}>
                Swap
              </SecondaryButton>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Hub tiles */}
      <SectionCard title="Hub">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={() => setScreen("settings")}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 20,
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 6,
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ fontSize: 22 }}>💳</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Assets</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{selectedNetworkAssets.length} tokens</span>
          </button>
          <button
            onClick={() => setScreen("dapp-connect")}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 20,
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 6,
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ fontSize: 22 }}>🔍</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Discover</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Ecosystem</span>
          </button>
        </div>
      </SectionCard>

      {/* Holdings scroll */}
      {selectedNetworkAssets.length > 0 && (
        <SectionCard title="Holdings">
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {selectedNetworkAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => { setSelectedTokenId(asset.id); setScreen("token-details"); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.03)",
                  flexShrink: 0,
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: asset.isPrimary ? "rgba(220,232,122,0.15)" : "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16
                }}>
                  {asset.symbol === "CTN" ? "🔷" : asset.symbol === "ETH" ? "◇" : "●"}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{asset.amount} {asset.symbol}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formatUsdReference(asset.usdReference)}</div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <SectionCard title="Recent activity">
          <div style={{ display: "grid", gap: 2 }}>
            {recentActivity.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedActivity(item.id);
                  setOverlay("activity-detail");
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "var(--text-primary)",
                  padding: "12px 8px",
                  borderRadius: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ fontSize: 16 }}>{item.kind === "send" ? "↑" : item.kind === "receive" ? "↓" : "⇄"}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formatDate(item.createdAt)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: item.kind === "receive" ? "var(--accent)" : undefined }}>
                  {item.amount ?? item.status}
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function ActivityScreen() {
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const snapshot = useJutisStore((state) => state.snapshot);
  const setOverlay = useJutisStore((state) => state.setOverlay);
  const setSelectedActivity = useJutisStore((state) => state.setSelectedActivity);

  const activity = snapshot?.activity ?? [];

  // Sample activity items — used only when no live activity data is available.
  // These are local/sample UI data and are easy to remove when real activity exists.
  const SAMPLE_ACTIVITY = [
    {
      id: "sample-send-1",
      title: "Sent to 0x8a...2e1",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      amount: "- 50 USDC",
      kind: "send" as const,
      status: "confirmed" as const,
      networkId: "local" as const
    },
    {
      id: "sample-receive-1",
      title: "Received from Canton",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      amount: "+ 100 CTN",
      kind: "receive" as const,
      status: "confirmed" as const,
      networkId: "local" as const
    }
  ];

  const displayItems = activity.length > 0 ? activity : SAMPLE_ACTIVITY;
  const hasSample = activity.length === 0;

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 14 }}>
      <SectionCard>
        <div style={{ display: "grid", gap: 2 }}>
          {displayItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedActivity(item.id);
                setOverlay("activity-detail");
              }}
              style={{
                background: "transparent",
                border: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "var(--text-primary)",
                padding: "12px 8px",
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
                width: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {item.kind === "send" ? "↑" : item.kind === "receive" ? "↓" : "⇄"}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {item.kind === "send" ? "2 hours ago" : "5 hours ago"}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: item.kind === "receive" ? "var(--accent)" : undefined }}>
                {item.amount ?? item.status}
              </div>
            </button>
          ))}
        </div>
        {hasSample && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-secondary)", padding: "0 8px" }}>
            Sample activity — live data will appear when connected.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SwapScreen() {
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const swapRequest = useJutisStore((state) => state.swapRequest);
  const swapReadiness = useJutisStore((state) => state.swapReadiness);
  const swapRoutes = useJutisStore((state) => state.swapRoutes);
  const swapState = useJutisStore((state) => state.swapState);
  const loadSwapReadiness = useJutisStore((state) => state.loadSwapReadiness);
  const updateSwapRequest = useJutisStore((state) => state.updateSwapRequest);
  const requestSwapQuotes = useJutisStore((state) => state.requestSwapQuotes);
  const network = useMemo(
    () => controller.listNetworks().find((entry) => entry.id === swapRequest.networkId),
    [swapRequest.networkId]
  );
  const isCantonSwap = swapRequest.networkId === "canton-mainnet";
  const cantonSwap = getCantonFeatureEntry("swap", cantonIdentity);

  useEffect(() => {
    void loadSwapReadiness(swapRequest.networkId);
  }, [loadSwapReadiness, swapRequest.networkId]);

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 18 }}>
      <SectionCard title="Swap readiness">
        <div style={{ display: "grid", gap: 14 }}>
          <Metric
            label="Active network"
            value={<strong>{network?.name ?? swapRequest.networkId}</strong>}
            note={swapReadiness?.summary ?? "Checking swap readiness for this network."}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip accent={Boolean(swapReadiness?.publicClaimReady)}>
              {swapReadiness ? (swapReadiness.publicClaimReady ? "Public-ready" : "Not live") : "Checking"}
            </Chip>
            <Chip accent={Boolean(swapReadiness?.canExecute)}>
              {swapReadiness ? (swapReadiness.canExecute ? "Execution ready" : "Execution blocked") : "Readiness pending"}
            </Chip>
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Swap is intentionally fail-closed in this build unless a live provider and executable path are configured.
          </div>
          <PrimaryButton full disabled={!swapReadiness?.canRequestQuotes || swapState === "quoting"} onClick={() => void requestSwapQuotes()}>
            {swapReadiness?.canRequestQuotes
              ? swapState === "quoting"
                ? "Requesting live quotes..."
                : "Request live quotes"
              : "Live quotes unavailable"}
          </PrimaryButton>
        </div>
      </SectionCard>
      {isCantonSwap ? (
        <SectionCard title="Canton swap capability" action={<SupportBadge state={cantonSwap?.supportState ?? "unsupported"} />}>
          <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
            <div style={{ color: "var(--text-secondary)" }}>
              {cantonSwap?.summary ?? "Canton swap is not a live feature in this build."}
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              {cantonSwap?.blocker ?? "No live Canton quote provider or settlement path is configured."}
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              Jutis exposes Canton swap as a readiness surface only. It does not present fixture quotes as executable market integrations.
            </div>
          </div>
        </SectionCard>
      ) : null}
      {swapReadiness?.providers.map((provider) => (
        <SectionCard
          key={provider.providerId}
          title={provider.providerLabel}
          action={<Chip accent={provider.publicClaimReady}>{provider.quoteTruth}</Chip>}
        >
          <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Quote model</span>
              <strong>{provider.quoteTruth}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Execution</span>
              <strong>{provider.executionReadiness}</strong>
            </div>
            <div style={{ color: "var(--text-secondary)" }}>{provider.note}</div>
            {provider.blockers.map((blocker) => (
              <div key={blocker} style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {blocker}
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
      {swapReadiness && swapReadiness.blockers.length > 0 ? (
        <SectionCard title="Unsupported flows">
          <div style={{ display: "grid", gap: 10 }}>
            {swapReadiness.blockers.map((blocker) => (
              <div key={blocker} style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {blocker}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
      {swapReadiness?.canRequestQuotes ? (
        <SectionCard title="Live quote request">
          <div style={{ display: "grid", gap: 14 }}>
            <InputField label="From asset id" value={swapRequest.fromAssetId} onChange={(value) => updateSwapRequest({ fromAssetId: value })} />
            <InputField label="To asset id" value={swapRequest.toAssetId} onChange={(value) => updateSwapRequest({ toAssetId: value })} />
            <InputField label="Amount" value={swapRequest.amount} onChange={(value) => updateSwapRequest({ amount: value })} />
            <InputField
              label="Slippage bps"
              value={String(swapRequest.slippageBps)}
              onChange={(value) => updateSwapRequest({ slippageBps: Number(value || "0") })}
            />
          </div>
        </SectionCard>
      ) : null}
      {swapReadiness?.canRequestQuotes ? swapRoutes.map((route) => (
        <SectionCard key={route.id} title={route.providerLabel} action={<Chip accent={route.support !== "unsupported"}>{route.support}</Chip>}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Output</span>
              <strong>{route.outputAmount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Fee (USD)</span>
              <strong>{formatUsdReference(route.estimatedFeeUsdReference)}</strong>
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              {getUsdTrustLabel(route.estimatedFeeUsdReference)} · {getUsdTrustMessage(route.estimatedFeeUsdReference)}
            </div>
            {route.warnings.map((warning) => (
              <div key={warning} style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {warning}
              </div>
            ))}
            <Divider />
            <div style={{ display: "grid", gap: 8 }}>
              {route.steps.map((step) => (
                <div key={step.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>{step.label}</span>
                  <span style={{ color: step.status === "unsupported" ? "var(--danger)" : "var(--text-secondary)" }}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )) : null}
    </div>
  );
}

function SettingsScreen() {
  const preferences = useJutisStore((state) => state.preferences);
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const session = useJutisStore((state) => state.session);
  const updatePreferences = useJutisStore((state) => state.updatePreferences);
  const lock = useJutisStore((state) => state.lock);
  const setScreen = useJutisStore((state) => state.setScreen);

  if (!preferences) {
    return null;
  }

  const cantonIdentitySummary = cantonIdentity ? controller.getCantonIdentitySummary(cantonIdentity) : null;
  const cantonFeatures = cantonIdentity ? controller.getCantonFeatureMatrix(cantonIdentity) : [];

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 18 }}>
      <SectionCard title="Security">
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Auto-lock minutes</span>
            <input
              type="number"
              min={1}
              max={120}
              value={preferences.autoLockMinutes}
              onChange={(event) => void updatePreferences({ autoLockMinutes: Number(event.currentTarget.value || 15) })}
              style={numberInputStyle}
            />
          </label>
          <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Idle expiry is enforced centrally by the extension runtime. Closing the popup does not unlock the vault, but browser restart or timeout does.
          </div>
          <PrimaryButton full onClick={lock}>
            Lock now
          </PrimaryButton>
        </div>
      </SectionCard>
      <SectionCard title="Preferences">
        <div style={{ display: "grid", gap: 14 }}>
          <label style={toggleRowStyle}>
            <span>Developer mode</span>
            <input
              type="checkbox"
              checked={preferences.developerMode}
              onChange={(event) => void updatePreferences({ developerMode: event.currentTarget.checked })}
            />
          </label>
          <label style={toggleRowStyle}>
            <span>Show reference/demo Canton data</span>
            <input
              type="checkbox"
              checked={preferences.showMockData}
              onChange={(event) => void updatePreferences({ showMockData: event.currentTarget.checked })}
            />
          </label>
        </div>
      </SectionCard>
      <SectionCard
        title="Canton identity"
        action={
          cantonIdentity ? <SupportBadge state={getCantonIdentitySupportState(cantonIdentity)} /> : null
        }
      >
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div>Mode: {cantonIdentity?.authMode ?? "unlinked"}</div>
          <div>Party: {cantonIdentity?.partyId ? shortValue(cantonIdentity.partyId) : "Not linked"}</div>
          {cantonIdentitySummary?.notes.map((note) => (
            <div key={note} style={{ color: "var(--text-secondary)" }}>
              {note}
            </div>
          ))}
          {cantonFeatures.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {cantonFeatures.map((feature) => (
                <SupportBadge key={feature.id} state={feature.supportState} />
              ))}
            </div>
          ) : null}
          <div style={{ color: "var(--text-secondary)" }}>
            {cantonIdentity?.partyId
              ? "A Canton party is linked. Use \"Change party\" to update or remove it."
              : "Link a Canton party to use party-based receive and send flows."}
          </div>
          <SecondaryButton
            full
            onClick={() => setScreen("link-party")}
          >
            {cantonIdentity?.partyId ? "Change party" : "Link party"}
          </SecondaryButton>
        </div>
      </SectionCard>
      <SectionCard
        title="Canton environment"
        action={
          cantonIdentity ? (
            <SupportBadge state={getCantonIdentitySupportState(cantonIdentity)} />
          ) : null
        }
      >
        <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Configure Canton network endpoints (scan, validator, ledger) and run connectivity diagnostics.
            Changes here do not affect the linked party id.
          </div>
          {cantonIdentity?.validatorApiUrl || cantonIdentity?.ledgerApiUrl ? (
            <div style={{ fontSize: 12 }}>
              <div>Validator: {cantonIdentity.validatorApiUrl ? shortValue(cantonIdentity.validatorApiUrl) : "not set"}</div>
              <div>Ledger: {cantonIdentity.ledgerApiUrl ? shortValue(cantonIdentity.ledgerApiUrl) : "not set"}</div>
            </div>
          ) : null}
          <SecondaryButton full onClick={() => setScreen("environment")}>
            Configure environment
          </SecondaryButton>
        </div>
      </SectionCard>
      <SectionCard title="Session">
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div>Status: {session.status}</div>
          <div>Last activity: {session.lastActivityAt ? formatDate(session.lastActivityAt) : "Locked"}</div>
          <div>Expires: {session.expiresAt ? formatDate(session.expiresAt) : "Locked"}</div>
          <div style={{ color: "var(--text-secondary)" }}>
            The unlocked session is kept in trusted extension session storage and is cleared on lock, timeout, and browser restart.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function LinkPartyScreen() {
  const [partyIdInput, setPartyIdInput] = useState("");
  const [scanApiUrlInput, setScanApiUrlInput] = useState("");
  const [scanAuthTokenInput, setScanAuthTokenInput] = useState("");
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const linkParty = useJutisStore((state) => state.linkParty);
  const unlinkParty = useJutisStore((state) => state.unlinkParty);
  const setScreen = useJutisStore((state) => state.setScreen);
  const busy = useJutisStore((state) => state.busy);
  const error = useJutisStore((state) => state.error);
  const clearError = useJutisStore((state) => state.clearError);

  const hasLinkedParty = Boolean(cantonIdentity?.partyId);
  const hasScanApi = Boolean(cantonIdentity?.scanApiUrl);
  const hasAuthToken = Boolean(cantonIdentity?.scanAuthToken);

  function handleSave() {
    clearError();
    void linkParty(partyIdInput, scanApiUrlInput || undefined, scanAuthTokenInput || undefined);
  }

  function handleUnlink() {
    clearError();
    void unlinkParty();
  }

  return (
    <div style={{ padding: 22, display: "grid", gap: 18 }}>
      <SectionCard title="Link Canton party">
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
            A Canton party identifier links this wallet to a specific identity on the Canton network. Once linked, the party id is shown in receive and send flows.
          </p>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
            A scan API URL enables live holdings reads. Without it, demo balances are shown. If the endpoint requires authentication, provide a Bearer token.
          </p>
          {hasLinkedParty ? (
            <div style={{ display: "grid", gap: 8, padding: "12px 14px", borderRadius: 18, border: "1px solid rgba(220,232,122,0.2)", background: "rgba(220,232,122,0.06)" }}>
              <div style={{ fontSize: 13 }}>
                <strong>Party:</strong>{" "}
                <span style={{ color: "var(--accent)" }}>{cantonIdentity!.partyId}</span>
              </div>
              {hasScanApi ? (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <strong>Scan API:</strong> {cantonIdentity!.scanApiUrl}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Scan API: not configured — demo balances shown
                </div>
              )}
              {hasAuthToken ? (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <strong>Auth token:</strong> set (hidden)
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Auth token: not set
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Unlink to remove all identity data.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8, padding: "12px 14px", borderRadius: 18, border: "1px solid var(--border-soft)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                No party is currently linked. Enter a party id below to link it.
              </div>
            </div>
          )}
          {!hasLinkedParty && (
            <>
              <InputField
                label="Party identifier"
                value={partyIdInput}
                onChange={setPartyIdInput}
                placeholder="e.g. party::1234567890"
              />
              <InputField
                label="Scan API URL (optional)"
                value={scanApiUrlInput}
                onChange={setScanApiUrlInput}
                placeholder="e.g. https://canton-scan.example/participant/one"
              />
              <InputField
                label="Scan auth token (optional)"
                value={scanAuthTokenInput}
                onChange={setScanAuthTokenInput}
                placeholder="Bearer token if endpoint requires auth"
              />
            </>
          )}
          {error ? (
            <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,125,125,0.08)", border: "1px solid rgba(255,125,125,0.18)", color: "var(--danger)", fontSize: 13 }}>
              {error}
            </div>
          ) : null}
        </div>
      </SectionCard>
      <div style={{ display: "grid", gap: 10 }}>
        {!hasLinkedParty ? (
          <PrimaryButton
            full
            disabled={!partyIdInput.trim() || busy}
            onClick={handleSave}
          >
            {busy ? "Linking..." : "Link party"}
          </PrimaryButton>
        ) : (
          <SecondaryButton full disabled={busy} onClick={handleUnlink}>
            {busy ? "Unlinking..." : "Unlink party"}
          </SecondaryButton>
        )}
        <SecondaryButton full onClick={() => setScreen("settings")}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

function EnvironmentConfigScreen() {
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const cantonDiagnostics = useJutisStore((state) => state.cantonDiagnostics);
  const diagnoseEnvironment = useJutisStore((state) => state.diagnoseEnvironment);
  const updateCantonEnvironment = useJutisStore((state) => state.updateCantonEnvironment);
  const setScreen = useJutisStore((state) => state.setScreen);
  const busy = useJutisStore((state) => state.busy);
  const error = useJutisStore((state) => state.error);
  const clearError = useJutisStore((state) => state.clearError);

  const [profile, setProfile] = useState(cantonIdentity?.cantonEnvironmentProfile ?? "custom");
  const [scanUrlInput, setScanUrlInput] = useState(cantonIdentity?.scanApiUrl ?? "");
  const [validatorUrlInput, setValidatorUrlInput] = useState(cantonIdentity?.validatorApiUrl ?? "");
  const [validatorTokenInput, setValidatorTokenInput] = useState(cantonIdentity?.validatorAuthToken ?? "");
  const [ledgerUrlInput, setLedgerUrlInput] = useState(cantonIdentity?.ledgerApiUrl ?? "");
  const [ledgerTokenInput, setLedgerTokenInput] = useState(cantonIdentity?.ledgerAuthToken ?? "");

  async function handleSave() {
    clearError();
    await updateCantonEnvironment({
      scanApiUrl: scanUrlInput || undefined,
      validatorApiUrl: validatorUrlInput || undefined,
      ledgerApiUrl: ledgerUrlInput || undefined,
      validatorAuthToken: validatorTokenInput || undefined,
      ledgerAuthToken: ledgerTokenInput || undefined,
      cantonEnvironmentProfile: profile || undefined
    });
  }

  async function handleDiagnose() {
    clearError();
    await diagnoseEnvironment();
  }

  const readiness = cantonDiagnostics?.readiness ?? "unconfigured";

  return (
    <div style={{ padding: 22, display: "grid", gap: 18 }}>
      <SectionCard title="Canton environment">
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
            Configure Canton network endpoint URLs. Run diagnostics to verify connectivity.
            These endpoints are used for read-only operations only — send submission is separate.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13 }}>Environment readiness:</span>
            <SupportBadge state={readinessToSupportState(readiness)} />
            {cantonIdentity?.cantonEnvironmentProfile && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {cantonIdentity.cantonEnvironmentProfile}
              </span>
            )}
          </div>
          {cantonDiagnostics ? (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
              {cantonDiagnostics.summary}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              No diagnostics run yet. Click "Run diagnostics" to probe endpoints.
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Environment profile">
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Select the source of this environment configuration. This is a label only — it does not change probe behavior.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["local-dev", "operator-hosted", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: profile === p ? "1.5px solid rgba(220,232,122,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  background: profile === p ? "rgba(220,232,122,0.1)" : "rgba(255,255,255,0.03)",
                  color: profile === p ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Endpoint configuration">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <strong>Scan API</strong> — used for holdings reads
            </div>
            <InputField
              label="Scan API URL"
              value={scanUrlInput}
              onChange={setScanUrlInput}
              placeholder="https://canton-scan.example/api"
            />
            {cantonDiagnostics?.scan && (
              <ReachabilityBadge diagnostics={cantonDiagnostics.scan} label="scan" />
            )}
          </div>

          <Divider />

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <strong>Validator API</strong> — for send validation (future)
            </div>
            <InputField
              label="Validator API URL"
              value={validatorUrlInput}
              onChange={setValidatorUrlInput}
              placeholder="https://canton-validator.example/api"
            />
            <InputField
              label="Validator auth token (optional)"
              value={validatorTokenInput}
              onChange={setValidatorTokenInput}
              placeholder="Bearer token"
            />
            {cantonDiagnostics?.validator && (
              <ReachabilityBadge diagnostics={cantonDiagnostics.validator} label="validator" />
            )}
          </div>

          <Divider />

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <strong>Ledger API</strong> — for transaction submission (future)
            </div>
            <InputField
              label="Ledger API URL"
              value={ledgerUrlInput}
              onChange={setLedgerUrlInput}
              placeholder="https://canton-ledger.example/api"
            />
            <InputField
              label="Ledger auth token (optional)"
              value={ledgerTokenInput}
              onChange={setLedgerTokenInput}
              placeholder="Bearer token"
            />
            {cantonDiagnostics?.ledger && (
              <ReachabilityBadge diagnostics={cantonDiagnostics.ledger} label="ledger" />
            )}
          </div>
        </div>
      </SectionCard>

      {error ? (
        <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,125,125,0.08)", border: "1px solid rgba(255,125,125,0.18)", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        <PrimaryButton full onClick={handleSave} disabled={busy}>
          {busy ? "Saving..." : "Save environment"}
        </PrimaryButton>
        <SecondaryButton full onClick={handleDiagnose} disabled={busy}>
          {busy ? "Running..." : "Run diagnostics"}
        </SecondaryButton>
        <SecondaryButton full onClick={() => setScreen("settings")}>
          Back to settings
        </SecondaryButton>
      </div>
    </div>
  );
}

function ReachabilityBadge({ diagnostics, label }: { diagnostics: import("@/core/models/types").EndpointDiagnostics; label: string }) {
  const colorMap: Record<import("@/core/models/types").EndpointReachability, string> = {
    "not-configured": "var(--text-secondary)",
    "malformed": "var(--danger)",
    "unreachable": "var(--danger)",
    "unauthorized": "var(--warning, orange)",
    "invalid-response": "var(--warning, orange)",
    "reachable": "#4ade80"
  };
  return (
    <span style={{ color: colorMap[diagnostics.reachability], fontSize: 12 }}>
      {label}: {diagnostics.reachability}{diagnostics.detail ? ` — ${diagnostics.detail}` : ""}
    </span>
  );
}

function readinessToSupportState(r: import("@/core/models/types").CantonEnvironmentReadiness): import("@/core/models/types").ProductSupportState {
  switch (r) {
    case "read-only-verified": return "live";
    case "party-visible": return "live";
    case "dso-confirmed": return "partial";
    case "scan-confirmed": return "partial";
    case "validator-confirmed": return "partial";
    case "endpoint-configured": return "partial";
    case "unconfigured": return "reference-only";
    default: return "unsupported";
  }
}

function FriendScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<FriendConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<FriendReadiness | null>(null);

  useEffect(() => {
    void loadFriends();
  }, []);

  async function loadFriends() {
    setLoading(true);
    const [fl, rr] = await Promise.all([
      jutisNameService.listFriends(),
      jutisNameService.getReadiness()
    ]);
    setFriends(fl);
    setReadiness(rr);
    setLoading(false);
  }

  async function handleSearch() {
    if (!searchInput.trim()) return;
    setSearching(true);
    try {
      const results = await jutisNameService.searchFriends(searchInput);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFriend(result: FriendSearchResult) {
    await jutisNameService.addFriend({
      handle: result.handle,
      displayName: result.displayName
    });
    setSearchInput("");
    setSearchResults([]);
    await loadFriends();
  }

  async function handleRemoveFriend(handle: string) {
    await jutisNameService.removeFriend(handle);
    await loadFriends();
  }

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 16 }}>
      <SectionCard title="Friend search">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <InputField
                label="Search @username"
                value={searchInput}
                onChange={setSearchInput}
                placeholder="e.g. alice"
              />
            </div>
            <PrimaryButton
              onClick={() => void handleSearch()}
              disabled={!searchInput.trim() || searching}
            >
              {searching ? "..." : "Find"}
            </PrimaryButton>
          </div>
          {readiness && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SupportBadge state={readiness.canSearch ? "live" : "reference-only"} />
              {readiness.blockers.length > 0 && readiness.blockers.map((b) => (
                <span key={b} style={{ fontSize: 11, color: "var(--text-secondary)" }}>{b}</span>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {searchResults.length > 0 ? (
        <SectionCard title="Search results">
          <div style={{ display: "grid", gap: 8 }}>
            {searchResults.map((result) => (
              <div
                key={result.handle}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-soft)"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>@{result.handle}</div>
                  {result.displayName && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{result.displayName}</div>
                  )}
                  <SupportBadge state={result.state} />
                </div>
                <SecondaryButton
                  onClick={() => void handleAddFriend(result)}
                >
                  Add
                </SecondaryButton>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Friends">
        {loading ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
        ) : friends.length === 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              No friends added yet. Search for an @username above to get started.
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              Friend resolution is currently local-only. A Canton-backed name service will enable live lookups.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {friends.map((friend) => (
              <div
                key={friend.handle}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-soft)"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>@{friend.handle}</div>
                  {friend.displayName && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{friend.displayName}</div>
                  )}
                  <SupportBadge state={friend.state} />
                </div>
                <button
                  onClick={() => void handleRemoveFriend(friend.handle)}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "4px 8px"
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function OverlaySheet() {
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const overlay = useJutisStore((state) => state.overlay);
  const snapshot = useJutisStore((state) => state.snapshot);
  const preferences = useJutisStore((state) => state.preferences);
  const sendDraft = useJutisStore((state) => state.sendDraft);
  const sendPreview = useJutisStore((state) => state.sendPreview);
  const updateSendDraft = useJutisStore((state) => state.updateSendDraft);
  const previewSend = useJutisStore((state) => state.previewSend);
  const submitSend = useJutisStore((state) => state.submitSend);
  const busy = useJutisStore((state) => state.busy);
  const setOverlay = useJutisStore((state) => state.setOverlay);
  const activity = useJutisStore((state) => selectActivity(state.snapshot, state.selectedActivityId));

  if (!overlay || !snapshot || !preferences) {
    return null;
  }

  const activeAssets = snapshot.assets.filter((asset) => asset.networkId === sendDraft.networkId);
  const activeAccounts = snapshot.accounts.filter((account) => account.networkId === preferences.selectedNetworkId);
  const activeAccount = activeAccounts[0];
  const receiveValue = activeAccount?.address ?? activeAccount?.partyId ?? "";
  const isCantonReceive = preferences.selectedNetworkId === "canton-mainnet";
  const isCantonSend = sendDraft.networkId === "canton-mainnet";
  const cantonReceive = getCantonFeatureEntry("receive", cantonIdentity);
  const cantonSend = getCantonFeatureEntry("send", cantonIdentity);
  const cantonActivity = getCantonFeatureEntry("activity", cantonIdentity);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(8, 10, 14, 0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "stretch",
        padding: 10
      }}
    >
      <div
        style={{
          width: "100%",
          borderRadius: 28,
          border: "1px solid var(--border)",
          background: "rgba(26,29,35,0.98)",
          padding: 18,
          display: "grid",
          gap: 14
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow">
            {overlay === "send" ? "Send" : overlay === "receive" ? "Receive" : overlay === "connection-request" ? "App Connection" : "Activity detail"}
          </span>
          <button onClick={() => setOverlay(null)} style={{ border: 0, background: "transparent", color: "var(--text-secondary)" }}>
            Close
          </button>
        </div>
        {overlay === "send" ? (
          <>
            {isCantonSend ? (
              <SectionCard title="Canton transfer planning" action={<SupportBadge state={cantonSend?.supportState ?? "partial"} />}>
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {cantonSend?.summary ?? "Canton send is planning-only in this build."}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {cantonSend?.blocker ?? "Live Canton submission is not configured."}
                  </div>
                </div>
              </SectionCard>
            ) : null}
            <label style={{ display: "grid", gap: 8 }}>
              <span className="eyebrow">Asset</span>
              <select
                value={sendDraft.assetId}
                onChange={(event) => updateSendDraft({ assetId: event.currentTarget.value })}
                style={selectStyle}
              >
                {activeAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </label>
            <InputField
              label={isCantonSend ? "Recipient party" : "Recipient"}
              value={sendDraft.to}
              onChange={(value) => updateSendDraft({ to: value })}
            />
            <InputField label="Amount" value={sendDraft.amount} onChange={(value) => updateSendDraft({ amount: value })} />
            {!sendPreview ? (
              <PrimaryButton full onClick={() => void previewSend()}>
                {isCantonSend ? "Review transfer plan" : "Review transfer"}
              </PrimaryButton>
            ) : (
              <SectionCard title="Confirmation">
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Amount</span>
                    <strong>
                      {sendPreview.amount} {sendPreview.asset.symbol}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Destination</span>
                    <strong>{shortValue(sendPreview.to)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Amount (USD)</span>
                    <strong>{formatUsdReference(sendPreview.usdReference)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Fee</span>
                    <strong>{sendPreview.estimatedFeeNative ?? "--"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Fee (USD)</span>
                    <strong>{formatUsdReference(sendPreview.estimatedFeeUsdReference)}</strong>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {getUsdTrustLabel(sendPreview.usdReference)} · {getUsdTrustMessage(sendPreview.usdReference)}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {getUsdTrustLabel(sendPreview.estimatedFeeUsdReference)} · {getUsdTrustMessage(sendPreview.estimatedFeeUsdReference)}
                  </div>
                  {sendPreview.warnings.map((warning) => (
                    <div key={warning} style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      {warning}
                    </div>
                  ))}
                  {isCantonSend ? (
                    <PrimaryButton full disabled>
                      Live transfer unavailable
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton full disabled={busy} onClick={() => void submitSend()}>
                      {busy ? "Submitting..." : "Confirm transfer"}
                    </PrimaryButton>
                  )}
                </div>
              </SectionCard>
            )}
          </>
        ) : null}
        {overlay === "receive" && activeAccount ? (
          <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
            {isCantonReceive ? (
              <SectionCard title="Canton receive status" action={<SupportBadge state={cantonReceive?.supportState ?? "unsupported"} />}>
                <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {cantonReceive?.summary ?? "Canton receive is not live in this build."}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {cantonReceive?.blocker ?? "No live Canton party is linked."}
                  </div>
                  {activeAccount.partyId ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <strong>Reference party id</strong>
                      <span style={{ color: "var(--text-secondary)" }}>{activeAccount.partyId}</span>
                      <SecondaryButton
                        full
                        onClick={() => {
                          void navigator.clipboard.writeText(activeAccount.partyId ?? "");
                        }}
                      >
                        Copy reference id
                      </SecondaryButton>
                    </div>
                  ) : null}
                  <div style={{ color: "var(--text-secondary)" }}>
                    Canton receive uses party-based identity. This screen is informational until a verified live topology is linked.
                  </div>
                </div>
              </SectionCard>
            ) : receiveValue ? (
              <>
                <QRCodeSVG
                  value={receiveValue}
                  size={176}
                  fgColor="#dce87a"
                  bgColor="#1a1d23"
                />
                <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
                  <strong>{activeAccount.label}</strong>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {receiveValue}
                  </span>
                  <SecondaryButton
                    full
                    onClick={() => {
                      void navigator.clipboard.writeText(receiveValue);
                    }}
                  >
                    Copy
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <SectionCard title="Receive unavailable">
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  This profile does not have a live receive identifier yet. Link a real Canton party before sharing receive details.
                </div>
              </SectionCard>
            )}
          </div>
        ) : null}
        {overlay === "activity-detail" && activity ? (
          <div style={{ display: "grid", gap: 12 }}>
            {activity.networkId === "canton-mainnet" ? (
              <SectionCard title="Canton activity truthfulness" action={<SupportBadge state={getActivitySupportState(activity)} />}>
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {cantonActivity?.summary ?? "This Canton activity item is not a live account-history guarantee."}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {cantonActivity?.blocker ?? "Live Canton scan or participant-backed activity is not configured."}
                  </div>
                </div>
              </SectionCard>
            ) : null}
            <Metric label="Title" value={<strong>{activity.title}</strong>} />
            <Metric label="Status" value={activity.status} />
            <Metric label="Network" value={activity.networkId} />
            {activity.networkId === "canton-mainnet" ? (
              <Metric label="Support state" value={<SupportBadge state={getActivitySupportState(activity)} />} />
            ) : null}
            <Metric label="When" value={formatDate(activity.createdAt)} />
            {activity.updatedAt ? <Metric label="Last update" value={formatDate(activity.updatedAt)} /> : null}
            {activity.confirmedAt ? <Metric label="Confirmed at" value={formatDate(activity.confirmedAt)} /> : null}
            {typeof activity.confirmations === "number" ? (
              <Metric label="Confirmations" value={String(activity.confirmations)} />
            ) : null}
            {typeof activity.blockNumber === "number" ? <Metric label="Block" value={String(activity.blockNumber)} /> : null}
            <Metric label="Source" value={activity.source} />
            {activity.hash ? <Metric label="Hash" value={<span>{shortValue(activity.hash)}</span>} /> : null}
            {activity.usdReference ? (
              <Metric
                label="USD reference"
                value={<span>{formatUsdReference(activity.usdReference)}</span>}
                note={`${getUsdTrustLabel(activity.usdReference)} · ${getUsdTrustMessage(activity.usdReference)}`}
              />
            ) : null}
            {activity.from ? <Metric label="From" value={<span>{shortValue(activity.from)}</span>} /> : null}
            {activity.to ? <Metric label="To" value={<span>{shortValue(activity.to)}</span>} /> : null}
            {activity.subtitle ? <Metric label="Summary" value={<span>{activity.subtitle}</span>} /> : null}
            {activity.failureReason ? <Metric label="Failure reason" value={<span>{activity.failureReason}</span>} /> : null}
            {activity.detail ? <Metric label="Note" value={<span>{activity.detail}</span>} /> : null}
          </div>
        ) : null}
        {overlay === "connection-request" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 20,
                background: "rgba(35,39,48,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{ fontSize: 26 }}>🌐</span>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-display)" }}>App Connection</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  Canton DEX wants to access your wallet address and balance.
                </div>
              </div>
            </div>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              fontSize: 12,
              color: "var(--text-secondary)"
            }}>
              <span style={{ color: "var(--accent)" }}>🔒</span>
              <span>Only connect to applications you trust. This site will not be able to move your funds without your approval.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => setOverlay(null)}
                style={{
                  padding: "14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Reject
              </button>
              <button
                onClick={() => setOverlay(null)}
                style={{
                  padding: "14px",
                  borderRadius: 14,
                  border: 0,
                  background: "var(--accent)",
                  color: "#11151c",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Approve
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dapp Connect Screen — source: wallet_6 + wallet_4 overlay pattern
// ---------------------------------------------------------------------------
interface DappInfo {
  id: string;
  name: string;
  description: string;
  verified: boolean;
  accentColor: string;
  bgColor: string;
}

const SAMPLE_DAPPS: DappInfo[] = [
  { id: "canton-trade", name: "Canton Trade", description: "Primary decentralized exchange", verified: true, accentColor: "var(--accent)", bgColor: "rgba(220,232,122,0.15)" },
  { id: "global-ledger", name: "Global Ledger", description: "Asset tokenization & custody", verified: true, accentColor: "#60a5fa", bgColor: "rgba(96,165,250,0.12)" },
  { id: "canton-insure", name: "Canton Insure", description: "Protocol protection services", verified: true, accentColor: "#c084fc", bgColor: "rgba(192,132,252,0.12)" },
];

function DappConnectScreen() {
  const setOverlay = useJutisStore((state) => state.setOverlay);
  const setScreen = useJutisStore((state) => state.setScreen);

  function handleConnect(dapp: DappInfo) {
    // Store the pending connection and show the request overlay
    setOverlay("connection-request");
  }

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Ecosystem</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>Canton Navigator</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Connect to trusted network applications</p>
        </div>
      </SectionCard>

      <div style={{ display: "grid", gap: 12 }}>
        {SAMPLE_DAPPS.map((dapp) => (
          <SectionCard key={dapp.id}>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: dapp.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${dapp.accentColor}30`
                  }}>
                    <span style={{ fontSize: 22 }}>
                      {dapp.id === "canton-trade" ? "🏦" : dapp.id === "global-ledger" ? "📊" : "🛡️"}
                    </span>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{dapp.name}</span>
                      {dapp.verified && (
                        <span style={{ fontSize: 11, color: dapp.accentColor, fontWeight: 700 }}>✓ Verified</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{dapp.description}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleConnect(dapp)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  border: 0,
                  background: dapp.id === "canton-trade" ? "var(--accent)" : "rgba(255,255,255,0.06)",
                  color: dapp.id === "canton-trade" ? "#11151c" : "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                ⚡ Connect App
              </button>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--accent)" }}>🔒</span>
          Only connect to applications you trust. This site will not be able to move your funds without your approval.
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Token Details Screen — source: wallet_3 token card pattern
// ---------------------------------------------------------------------------
function TokenDetailsScreen() {
  const snapshot = useJutisStore((state) => state.snapshot);
  const preferences = useJutisStore((state) => state.preferences);
  const selectedTokenId = useJutisStore((state) => state.selectedTokenId);
  const setScreen = useJutisStore((state) => state.setScreen);
  const setOverlay = useJutisStore((state) => state.setOverlay);

  if (!snapshot || !preferences || !selectedTokenId) {
    return (
      <div style={{ padding: "18px 20px 96px" }}>
        <SectionCard>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No token selected. Go back to Home.</div>
          <div style={{ marginTop: 12 }}>
            <SecondaryButton full onClick={() => setScreen("home")}>
              Back to Home
            </SecondaryButton>
          </div>
        </SectionCard>
      </div>
    );
  }

  const token = snapshot.assets.find((a) => a.id === selectedTokenId);
  if (!token) {
    return (
      <div style={{ padding: "18px 20px 96px" }}>
        <SectionCard>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Token not found.</div>
          <div style={{ marginTop: 12 }}>
            <SecondaryButton full onClick={() => setScreen("home")}>
              Back to Home
            </SecondaryButton>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 16 }}>
      {/* Token header */}
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: token.isPrimary ? "rgba(220,232,122,0.15)" : "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24
          }}>
            {token.symbol === "CTN" ? "🔷" : token.symbol === "ETH" ? "◇" : "●"}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Token</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>{token.symbol}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{token.name}</div>
          </div>
        </div>
      </SectionCard>

      {/* Balance */}
      <SectionCard title="Balance">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Amount</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{token.amount} {token.symbol}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>USD value</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>{formatUsdReference(token.usdReference)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Network</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{token.networkId}</span>
          </div>
        </div>
      </SectionCard>

      {/* Actions */}
      <SectionCard title="Actions">
        <div style={{ display: "grid", gap: 8 }}>
          <SecondaryButton full onClick={() => setOverlay("send")}>
            Send {token.symbol}
          </SecondaryButton>
          <SecondaryButton full onClick={() => setOverlay("receive")}>
            Receive {token.symbol}
          </SecondaryButton>
        </div>
      </SectionCard>

      {/* Reference note */}
      <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", padding: "0 8px" }}>
        Balance is read from the selected Canton participant via the configured scan API. Amounts reflect on-chain holdings.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Register Screen — account creation via cloud/social
// ---------------------------------------------------------------------------
function RegisterScreen() {
  const setScreen = useJutisStore((state) => state.setScreen);

  return (
    <div style={{ padding: "18px 20px 96px", display: "grid", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
            <span style={{ fontSize: 28 }}>🔐</span>
            <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}>Create Account</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Create a Jutis account to sync your wallet and access cloud backup.
            </p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <button
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              Sign in with Google
            </button>
            <button
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              Sign in with Telegram
            </button>
          </div>
          <Divider />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 4px" }}>Prefer local-only?</p>
            <button
              onClick={() => setScreen("create")}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Create a local wallet →
            </button>
          </div>
        </div>
      </SectionCard>

      <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center" }}>
        By continuing, you agree to Jutis Terms of Service. Your data is encrypted locally.
      </div>
    </div>
  );
}

function BottomNav() {
  const screen = useJutisStore((state) => state.screen);
  const setScreen = useJutisStore((state) => state.setScreen);

  const NAV_ITEMS: Array<{ screen: PopupScreen; icon: string }> = [
    { screen: "home", icon: "🏠" },
    { screen: "activity", icon: "📋" },
    { screen: "swap", icon: "⇄" },
    { screen: "friend", icon: "👤" },
    { screen: "settings", icon: "⚙" },
  ];

  return (
    <footer
      style={{
        height: 64,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
        padding: "0 18px"
      }}
    >
      <nav
        style={{
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(35, 39, 48, 0.8)",
          backdropFilter: "blur(20px)",
          padding: "8px 24px",
          display: "flex",
          gap: 32,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}
      >
        {NAV_ITEMS.map(({ screen: s, icon }) => {
          const active = screen === s;
          return (
            <button
              key={s}
              onClick={() => setScreen(s)}
              style={{
                background: "transparent",
                border: 0,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
                position: "relative"
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, opacity: active ? 1 : 0.45 }}>
                {icon}
              </span>
              {active && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--accent)"
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </footer>
  );
}

export function PopupApp() {
  const bootstrapped = useJutisStore((state) => state.bootstrapped);
  const screen = useJutisStore((state) => state.screen);
  const bootstrap = useJutisStore((state) => state.bootstrap);
  const refresh = useJutisStore((state) => state.refresh);
  const touchSession = useJutisStore((state) => state.touchSession);
  const session = useJutisStore((state) => state.session);
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

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sendTouch();
      }
    };

    sendTouch();
    window.addEventListener("pointerdown", sendTouch);
    window.addEventListener("keydown", sendTouch);
    window.addEventListener("focus", sendTouch);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("pointerdown", sendTouch);
      window.removeEventListener("keydown", sendTouch);
      window.removeEventListener("focus", sendTouch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session.status, touchSession]);

  if (!bootstrapped) {
    return <div className="jutis-popup-root" style={{ display: "grid", placeItems: "center" }}>Loading...</div>;
  }

  return (
    <div className="jutis-popup-root">
      {screen === "home" || screen === "activity" || screen === "swap" || screen === "friend" || screen === "settings" || screen === "dapp-connect" || screen === "token-details" ? <Header /> : null}
      <ErrorBanner />
      {screen === "welcome" ? <WelcomeScreen /> : null}
      {screen === "create" ? <CreateWalletScreen /> : null}
      {screen === "import" ? <ImportWalletScreen /> : null}
      {screen === "unlock" ? <UnlockScreen /> : null}
      {screen === "home" ? <HomeScreen /> : null}
      {screen === "activity" ? <ActivityScreen /> : null}
      {screen === "swap" ? <SwapScreen /> : null}
      {screen === "settings" ? <SettingsScreen /> : null}
      {screen === "link-party" ? <LinkPartyScreen /> : null}
      {screen === "environment" ? <EnvironmentConfigScreen /> : null}
      {screen === "friend" ? <FriendScreen /> : null}
      {screen === "dapp-connect" ? <DappConnectScreen /> : null}
      {screen === "token-details" ? <TokenDetailsScreen /> : null}
      {screen === "register" ? <RegisterScreen /> : null}
      {screen === "home" || screen === "activity" || screen === "swap" || screen === "friend" || screen === "settings" || screen === "dapp-connect" || screen === "token-details" ? <BottomNav /> : null}
      <OverlaySheet />
    </div>
  );
}

const toggleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const numberInputStyle: CSSProperties = {
  width: 72,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "rgba(18,22,29,0.6)",
  color: "var(--text-primary)",
  padding: "10px 12px"
};

const selectStyle: CSSProperties = {
  width: "100%",
  borderRadius: 20,
  border: "1px solid var(--border)",
  background: "rgba(18,22,29,0.6)",
  color: "var(--text-primary)",
  padding: "14px 16px"
};

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 18,
    border: `1px solid ${active ? "rgba(220,232,122,0.2)" : "var(--border)"}`,
    background: active ? "rgba(220,232,122,0.12)" : "rgba(255,255,255,0.03)",
    color: active ? "var(--accent)" : "var(--text-secondary)"
  };
}
