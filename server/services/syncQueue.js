import { Queue, Worker } from "bullmq";
import { executeRepositorySync, processWebhookEvent } from "./syncService.js";
import { servicesConfig } from "../config/services.js";
import { logInfo, logError } from "../utils/logger.js";

let syncQueue = null;
let webhookQueue = null;
let syncWorker = null;
let webhookWorker = null;

/**
 * Initializes BullMQ queues and workers optimized for low command usage on free Redis tiers.
 * - Long stalledInterval (60s) to minimize polling commands
 * - Small max count for completed/failed jobs to prevent memory bloat
 * - Concurrency: 1
 */
function initQueues() {
  const { redisUrl, redisHost, redisPort, redisPassword } = servicesConfig;
  const isRedisConfigured = Boolean(redisUrl || (redisHost && redisHost !== "127.0.0.1") || process.env.NODE_ENV === "production");

  if (!isRedisConfigured) {
    return;
  }

  try {
    const connection = redisUrl
      ? { url: redisUrl, maxRetriesPerRequest: null }
      : {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: null,
        };

    const defaultQueueOpts = {
      connection,
      defaultJobOptions: {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
      },
    };

    syncQueue = new Queue("repo-sync-queue", defaultQueueOpts);
    webhookQueue = new Queue("webhook-queue", defaultQueueOpts);

    const workerOpts = {
      connection,
      concurrency: 1,
      lockDuration: 30000,
      stalledInterval: 60000, // Low polling frequency for free Redis tiers
      drainDelay: 10,
    };

    syncWorker = new Worker(
      "repo-sync-queue",
      async (job) => {
        logInfo("[BULLMQ] Processing sync job", { jobId: job.id, syncId: job.data.syncId });
        await executeRepositorySync(job.data.syncId);
      },
      workerOpts
    );

    webhookWorker = new Worker(
      "webhook-queue",
      async (job) => {
        logInfo("[BULLMQ] Processing webhook job", {
          jobId: job.id,
          deliveryId: job.data.deliveryId,
        });
        await processWebhookEvent(job.data);
      },
      workerOpts
    );

    syncWorker.on("error", (err) => {
      logError("[BULLMQ] Sync worker error", { message: err.message });
    });

    webhookWorker.on("error", (err) => {
      logError("[BULLMQ] Webhook worker error", { message: err.message });
    });

    logInfo("[BULLMQ] Free-tier optimized BullMQ queues initialized");
  } catch (err) {
    logError("[BULLMQ] Failed to initialize queues (fallback to in-memory)", {
      message: err.message,
    });
  }
}

// Attempt initialization
try {
  initQueues();
} catch (_) {}

/**
 * Enqueues a repository synchronization job for background processing.
 *
 * @param {string} syncId Mongoose ObjectId of RepositorySync record.
 */
export async function enqueueSyncJob(syncId) {
  logInfo("Enqueued background repository sync job", { syncId });

  if (syncQueue) {
    try {
      await syncQueue.add("sync", { syncId });
      return;
    } catch (queueErr) {
      logError("[BULLMQ] Enqueue sync failed, using in-process fallback", { message: queueErr.message });
    }
  }

  // Fallback: Execute asynchronously in background event loop
  setImmediate(async () => {
    try {
      await executeRepositorySync(syncId);
      logInfo("Background repository sync job completed successfully", { syncId });
    } catch (err) {
      logError("Background repository sync job failed", { syncId, errorMessage: err.message });
    }
  });
}

/**
 * Enqueues an incoming GitHub webhook event for background incremental processing.
 *
 * @param {Object} webhookData Webhook event payload and delivery identifier.
 */
export async function enqueueWebhookJob(webhookData) {
  logInfo("Enqueued background webhook processing job", {
    event: webhookData.event,
    deliveryId: webhookData.deliveryId,
  });

  if (webhookQueue) {
    try {
      await webhookQueue.add("webhook", webhookData);
      return;
    } catch (queueErr) {
      logError("[BULLMQ] Enqueue webhook failed, using in-process fallback", { message: queueErr.message });
    }
  }

  // Fallback: Execute asynchronously in background event loop
  setImmediate(async () => {
    try {
      await processWebhookEvent(webhookData);
      logInfo("Background webhook job completed successfully", {
        deliveryId: webhookData.deliveryId,
      });
    } catch (err) {
      logError("Background webhook job processing failed", {
        deliveryId: webhookData.deliveryId,
        errorMessage: err.message,
      });
    }
  });
}
