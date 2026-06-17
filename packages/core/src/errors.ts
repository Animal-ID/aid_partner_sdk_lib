/** Base class for every error thrown by the SDK. */
export class AnimalIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnimalIdError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Misconfiguration (missing fetch/crypto, bad options) — thrown before any request. */
export class AnimalIdConfigError extends AnimalIdError {
  constructor(message: string) {
    super(message);
    this.name = 'AnimalIdConfigError';
  }
}

/** Transport-level failure (DNS, connection reset, abort/timeout). */
export class AnimalIdNetworkError extends AnimalIdError {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AnimalIdNetworkError';
    this.cause = cause;
  }
}

/** Non-2xx HTTP response. Inspect `status` and `payload` for details. */
export class AnimalIdApiError extends AnimalIdError {
  readonly status: number;
  /** Parsed response body (object or raw text). */
  readonly payload: unknown;
  readonly requestId?: string;

  constructor(message: string, status: number, payload?: unknown, requestId?: string) {
    super(message);
    this.name = 'AnimalIdApiError';
    this.status = status;
    this.payload = payload;
    this.requestId = requestId;
  }
}

/** 422 — request validation failed. */
export class AnimalIdValidationError extends AnimalIdApiError {
  constructor(message: string, status: number, payload?: unknown, requestId?: string) {
    super(message, status, payload, requestId);
    this.name = 'AnimalIdValidationError';
  }
}
