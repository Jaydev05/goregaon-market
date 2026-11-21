// Capacitor needs webDir (dist) to contain an index.html; the real UI loads from server.url.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
if (!existsSync("dist/index.html")) {
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/index.html", '<!doctype html><meta charset="utf-8"><title>Goregaon Market</title><p>Loading…</p>');
}
