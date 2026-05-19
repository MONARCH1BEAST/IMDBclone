import {
  ApiError,
  CircuitBreaker,
  ResilientHttpClient,
  TokenBucket,
} from "./httpClient";

const noopTelemetry = {
  recordRequest: jest.fn(),
  recordError: jest.fn(),
};

function response(status, body, headers = {}) {
  const headerMap = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key) => headerMap.get(key.toLowerCase()) || null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function testBucket() {
  return new TokenBucket({
    capacity: 100,
    refillRatePerSecond: 100,
    sleepFn: jest.fn(() => Promise.resolve()),
  });
}

test("retries 429 bursts with backoff before returning the successful response", async () => {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(response(429, { error: "slow down" }, { "retry-after": "0" }))
    .mockResolvedValueOnce(response(429, { error: "still slow" }, { "retry-after": "0" }))
    .mockResolvedValueOnce(response(200, { ok: true }));

  const client = new ResilientHttpClient({
    fetchImpl,
    tokenBucket: testBucket(),
    circuitBreaker: new CircuitBreaker({ failureThreshold: 10 }),
    maxRetries: 3,
    baseDelayMs: 0,
    telemetry: noopTelemetry,
  });

  await expect(client.request("https://example.test/movies")).resolves.toEqual({
    ok: true,
  });
  expect(fetchImpl).toHaveBeenCalledTimes(3);
});

test("opens the circuit after repeated 5xx failures", async () => {
  const fetchImpl = jest.fn().mockResolvedValue(response(503, { error: "down" }));
  const breaker = new CircuitBreaker({
    failureThreshold: 2,
    cooldownMs: 60_000,
  });
  const client = new ResilientHttpClient({
    fetchImpl,
    tokenBucket: testBucket(),
    circuitBreaker: breaker,
    maxRetries: 0,
    baseDelayMs: 0,
    telemetry: noopTelemetry,
  });

  await expect(client.request("https://example.test/a")).rejects.toBeInstanceOf(
    ApiError
  );
  await expect(client.request("https://example.test/b")).rejects.toBeInstanceOf(
    ApiError
  );
  await expect(client.request("https://example.test/c")).rejects.toMatchObject({
    code: "CIRCUIT_OPEN",
  });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});
