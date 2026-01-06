import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const serviceName = process.env.OTEL_SERVICE_NAME ?? "smart-schedule-backend";
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

// Stable semantic key (avoids semantic-conventions churn)
const SERVICE_NAME_KEY = "service.name";

const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? `${otlpEndpoint}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? `${otlpEndpoint}/v1/metrics`,
});

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [SERVICE_NAME_KEY]: serviceName,
    }),
    traceExporter,
    metricReaders: [
        new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: 10_000,
        }),
    ],
    instrumentations: [getNodeAutoInstrumentations()],
});

// Works for both: start(): void  OR  start(): Promise<void>
try {
    const startResult: unknown = (sdk as unknown as { start: () => unknown }).start();
    if (
        startResult &&
        typeof startResult === "object" &&
        "catch" in startResult &&
        typeof (startResult as { catch: unknown }).catch === "function"
    ) {
        (startResult as Promise<void>).catch((err: unknown) => {
            console.error("Failed to start OpenTelemetry SDK", err);
        });
    }
} catch (err: unknown) {
    console.error("Failed to start OpenTelemetry SDK", err);
}

async function shutdown() {
    try {
        await sdk.shutdown();
    } finally {
        process.exit(0);
    }
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
