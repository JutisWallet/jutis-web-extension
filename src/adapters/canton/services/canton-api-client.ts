/**
 * CantonApiClient
 * Extension ↔ Jutis Backend arasındaki tek iletişim katmanı.
 */

/// <reference types="vite/client" />

const BACKEND_URL = (import.meta.env.VITE_JUTIS_BACKEND_URL as string) || 'https://api.jutis.xyz';

export interface ApiBalance {
  party: string;
  balance?: string;
  currency?: string;
  contracts?: unknown;
  source: string;
}

export interface ApiActivity {
  party: string;
  transactions: unknown[];
  source: string;
}

export interface ApiSubmitResult {
  status: string;
  message?: string;
  data?: unknown;
}

export class CantonApiClient {
  private token: string | null = null;

  async authenticate(partyId: string): Promise<string> {
    const res = await fetch(`${BACKEND_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId }),
    });
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
    const data = await res.json() as { token: string };
    this.token = data.token;
    return this.token;
  }

  private async getHeaders(partyId?: string): Promise<Record<string, string>> {
    if (!this.token && partyId) await this.authenticate(partyId);
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async getBalance(partyId: string): Promise<ApiBalance> {
    const headers = await this.getHeaders(partyId);
    const res = await fetch(`${BACKEND_URL}/canton/balance`, { headers });
    if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
    return res.json() as Promise<ApiBalance>;
  }

  async getActivity(partyId: string): Promise<ApiActivity> {
    const headers = await this.getHeaders(partyId);
    const res = await fetch(`${BACKEND_URL}/canton/activity`, { headers });
    if (!res.ok) throw new Error(`Activity fetch failed: ${res.status}`);
    return res.json() as Promise<ApiActivity>;
  }

  async submitTransaction(partyId: string, payload: unknown): Promise<ApiSubmitResult> {
    const headers = await this.getHeaders(partyId);
    const res = await fetch(`${BACKEND_URL}/canton/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
    return res.json() as Promise<ApiSubmitResult>;
  }

  clearToken(): void {
    this.token = null;
  }
}

export const cantonApiClient = new CantonApiClient();
