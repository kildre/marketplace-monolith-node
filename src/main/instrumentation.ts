import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTLP_ENDPOINT;

let sdk: NodeSDK | null = null;

if (otlpEndpoint) {
  console.log(`[OTEL] Initializing OpenTelemetry with endpoint: ${otlpEndpoint}`);
  
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'advana-marketplace-monolith',
      [ATTR_SERVICE_VERSION]: process.env.VERSION || '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: `grpc://${otlpEndpoint}`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation to reduce noise
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log('[OTEL] OpenTelemetry instrumentation started');

  // Graceful shutdown
  const shutdown = async () => {
    if (sdk) {
      await sdk.shutdown();
      console.log('[OTEL] OpenTelemetry shut down');
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  console.log('[OTEL] OTLP_ENDPOINT not set, skipping OpenTelemetry instrumentation');
}

export { sdk };