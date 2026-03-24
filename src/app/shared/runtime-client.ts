import type { RuntimeFailure, RuntimeRequest, RuntimeResponse } from "@/app/shared/runtime-types";

export class RuntimeClientError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "RuntimeClientError";
  }
}

function isExtensionRuntimeAvailable(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id && chrome.runtime.sendMessage);
}

function throwRuntimeFailure(failure: RuntimeFailure): never {
  throw new RuntimeClientError(failure.error, failure.code);
}

export async function sendRuntimeRequest<T>(request: RuntimeRequest): Promise<T> {
  if (!isExtensionRuntimeAvailable()) {
    const { executeRuntimeRequest } = await import("@/app/shared/runtime-dispatcher");
    return executeRuntimeRequest(request) as Promise<T>;
  }

  const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse<T> | undefined;

  if (!response) {
    throw new RuntimeClientError("The extension runtime did not return a response.");
  }

  if (!response.ok) {
    throwRuntimeFailure(response);
  }

  return response.data;
}
