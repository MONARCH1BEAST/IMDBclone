import { telemetry as defaultTelemetry } from "../../telemetry";

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.provider = options.provider;
    this.url = options.url;
    this.body = options.body;
    this.retryAfterMs = options.retryAfterMs;
    this.code = options.code;
  }
}

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryableError(error) {
  if (!error) {
    return false;
  }

  if (error.name === "AbortError") {
    return false;
  }

  if (error.status) {
    return retryableStatuses.has(error.status);
  }

  return true;
}

export function sleep(ms, signal) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("The request was aborted.", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
    }
  });
}

export class TokenBucket {
  constructor({
    capacity = 20,
    refillRatePerSecond = 10,
    nowFn = Date.now,
    sleepFn = sleep,
  } = {}) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.nowFn = nowFn;
    this.sleepFn = sleepFn;
    this.tokens = capacity;
    this.lastRefill = nowFn();
  }

  refill() {
    const current = this.nowFn();
    const elapsedSeconds = Math.max(0, current - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.refillRatePerSecond
    );
    this.lastRefill = current;
  }

  async removeToken(signal) {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      const waitMs = Math.ceil(
        ((1 - this.tokens) / this.refillRatePerSecond) * 1000
      );
      await this.sleepFn(waitMs, signal);
    }
  }
}

export class CircuitBreaker {
  constructor({
    failureThreshold = 5,
    cooldownMs = 30 * 1000,
    nowFn = Date.now,
  } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.nowFn = nowFn;
    this.state = "closed";
    this.failureCount = 0;
    this.nextAttemptAt = 0;
  }

  beforeRequest() {
    if (this.state !== "open") {
      return;
    }

    if (this.nowFn() >= this.nextAttemptAt) {
      this.state = "half-open";
      return;
    }

    throw new ApiError("Circuit breaker is open.", {
      status: 503,
      code: "CIRCUIT_OPEN",
    });
  }

  recordSuccess() {
    this.state = "closed";
    this.failureCount = 0;
    this.nextAttemptAt = 0;
  }

  recordFailure(error) {
    if (!isRetryableError(error)) {
      return;
    }

    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.state = "open";
      this.nextAttemptAt = this.nowFn() + this.cooldownMs;
      console.warn(`[Circuit Breaker] Circuit opened after ${this.failureCount} failures.`);
    }
  }
}

function retryDelay(error, attempt, baseDelayMs, maxDelayMs) {
  if (error.retryAfterMs) {
    return error.retryAfterMs;
  }

  const exponentialDelay = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
  return Math.min(maxDelayMs, exponentialDelay + jitter);
}

function parseRetryAfter(header) {
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

async function responseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  try {
    return await response.text();
  } catch (error) {
    return null;
  }
}

export class ResilientHttpClient {
  constructor({
    fetchImpl,
    tokenBucket = new TokenBucket(),
    circuitBreaker = new CircuitBreaker(),
    maxRetries = 2,
    baseDelayMs = 300,
    maxDelayMs = 3000,
    telemetry = defaultTelemetry,
  } = {}) {
    const defaultFetch =
      typeof window !== "undefined" && window.fetch
        ? window.fetch.bind(window)
        : undefined;
    this.fetchImpl = fetchImpl || defaultFetch;

    if (!this.fetchImpl) {
      throw new Error("A fetch implementation is required.");
    }

    this.tokenBucket = tokenBucket;
    this.circuitBreaker = circuitBreaker;
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.telemetry = telemetry;
  }

  async request(url, options = {}) {
    const method = options.method || "GET";
    const provider = options.provider;
    const startedAt = Date.now();
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        this.circuitBreaker.beforeRequest();
        await this.tokenBucket.removeToken(options.signal);

        if (process.env.NODE_ENV === 'development') {
        try {
          console.debug('[HTTP CLIENT] fetching', String(url));
        } catch (e) {}
      }
      const response = await this.fetchImpl(url, options);
        if (!response.ok) {
          const body = await responseBody(response);
          throw new ApiError(`Request failed with ${response.status}.`, {
            status: response.status,
            provider,
            url,
            body,
            retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
          });
        }

        const data =
          options.parseJson === false ? await response.text() : await response.json();
        this.circuitBreaker.recordSuccess();
        this.telemetry.recordRequest({
          url: String(url),
          method,
          provider,
          status: response.status,
          durationMs: Date.now() - startedAt,
          attempt: attempt + 1,
        });
        return data;
      } catch (error) {
        const isNetworkError = !error.status && error.name !== "AbortError";
        const isServerError = error.status >= 500;

        if (
          error.code !== "CIRCUIT_OPEN" &&
          (isNetworkError || isServerError)
        ) {
          this.circuitBreaker.recordFailure(error);
        }

        const shouldRetry =
          attempt < this.maxRetries &&
          isRetryableError(error) &&
          error.code !== "CIRCUIT_OPEN";

        if (!shouldRetry) {
          this.telemetry.recordError({
            url: String(url),
            method,
            provider,
            durationMs: Date.now() - startedAt,
            attempt: attempt + 1,
            error,
          });
          throw error;
        }

        await sleep(
          retryDelay(error, attempt, this.baseDelayMs, this.maxDelayMs),
          options.signal
        );
        attempt += 1;
      }
    }
  }
}

export function createHttpClient(options = {}) {
  return new ResilientHttpClient({
    tokenBucket: new TokenBucket({
      capacity: Number(process.env.REACT_APP_RATE_LIMIT_CAPACITY || 30),
      refillRatePerSecond: Number(
        process.env.REACT_APP_RATE_LIMIT_REFILL_PER_SECOND || 8
      ),
    }),
    circuitBreaker: new CircuitBreaker({
      failureThreshold: Number(
        process.env.REACT_APP_CIRCUIT_FAILURE_THRESHOLD || 5
      ),
      cooldownMs: Number(process.env.REACT_APP_CIRCUIT_COOLDOWN_MS || 30000),
    }),
    ...options,
  });
}
