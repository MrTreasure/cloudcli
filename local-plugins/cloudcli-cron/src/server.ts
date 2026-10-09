import { startHttpServer } from "./server/http.js";
import { SchedulerService } from "./server/scheduler.js";

const scheduler = new SchedulerService();

async function main(): Promise<void> {
  const server = await startHttpServer(scheduler);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("无法确定服务器端口");
  }

  setInterval(() => {
    void scheduler.tickWithoutDispatcher();
  }, 30_000).unref();

  process.stdout.write(`${JSON.stringify({ ready: true, port: address.port })}\n`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
