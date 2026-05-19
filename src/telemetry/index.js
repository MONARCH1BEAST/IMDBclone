const traces = [];
const maxTraceCount = 200;

const endpoint = () => process.env.REACT_APP_TELEMETRY_ENDPOINT;

function safeBeacon(payload) {
  const target = endpoint();
  if (!target || typeof navigator === "undefined") {
    return;
  }

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(target, body);
    return;
  }

  fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function pushTrace(event) {
  traces.push({
    ...event,
    timestamp: new Date().toISOString(),
  });

  if (traces.length > maxTraceCount) {
    traces.shift();
  }
}

export const telemetry = {
  recordRequest(event) {
    const payload = {
      type: "request",
      ...event,
    };
    pushTrace(payload);
    safeBeacon(payload);
  },

  recordError(event) {
    const payload = {
      type: "error",
      ...event,
      message: event.error?.message || event.message,
      status: event.error?.status || event.status,
    };
    pushTrace(payload);
    safeBeacon(payload);
  },

  recordWebVital(metric) {
    const payload = {
      type: "web-vital",
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    };
    pushTrace(payload);
    safeBeacon(payload);
  },

  getTraces() {
    return [...traces];
  },

  clear() {
    traces.length = 0;
  },
};
