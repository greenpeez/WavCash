#!/usr/bin/env tsx
/**
 * One-time script to register the Telegram webhook URL.
 *
 * Usage:
 *   npx tsx scripts/setup-telegram-webhook.ts https://your-app.vercel.app
 *
 * For local dev with ngrok:
 *   1. Run: ngrok http 3001
 *   2. Copy the https://xxxx.ngrok-free.app URL
 *   3. Run: npx tsx scripts/setup-telegram-webhook.ts https://xxxx.ngrok-free.app
 *
 * Requires these env vars in .env.local:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const appUrl = process.argv[2];

  if (!appUrl) {
    console.error("Usage: npx tsx scripts/setup-telegram-webhook.ts <APP_URL>");
    console.error("Example: npx tsx scripts/setup-telegram-webhook.ts https://xxxx.ngrok-free.app");
    process.exit(1);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not set in .env.local");
    process.exit(1);
  }
  if (!secret) {
    console.error("TELEGRAM_WEBHOOK_SECRET not set in .env.local");
    process.exit(1);
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  console.log(`\nRegistering webhook...`);
  console.log(`  URL: ${webhookUrl}`);

  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
      }),
    }
  );

  const data = await res.json();

  if (!data.ok) {
    console.error("\n❌ Failed to set webhook:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\n✅ Webhook registered successfully!\n");

  // Verify by fetching current webhook info
  const infoRes = await fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`
  );
  const info = await infoRes.json();

  if (info.ok) {
    const w = info.result;
    console.log("Webhook info:");
    console.log(`  URL:             ${w.url}`);
    console.log(`  Has secret:      ${w.has_custom_certificate ?? false}`);
    console.log(`  Pending updates: ${w.pending_update_count}`);
    console.log(`  Last error:      ${w.last_error_message ?? "none"}`);
  }

  // Register bot commands so Telegram shows autocomplete
  console.log("\nRegistering bot commands...");
  const cmdsRes = await fetch(
    `https://api.telegram.org/bot${token}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "pending",    description: "Tickets waiting for a first reply" },
          { command: "resolved",   description: "Recently resolved tickets" },
          { command: "archived",   description: "Archived tickets" },
          { command: "mine",       description: "Tickets assigned to you" },
          { command: "transcript", description: "Full conversation history (use in topic)" },
        ],
      }),
    }
  );
  const cmdsData = await cmdsRes.json();
  if (cmdsData.ok) {
    console.log("✅ Bot commands registered (/pending /resolved /archived /mine /transcript)");
  } else {
    console.warn("⚠️  Failed to register commands:", cmdsData.description);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
