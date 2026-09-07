// Run after :app:assembleDebug :app:processReleaseMainManifest.
// After building with -Pg3TelemetryEnabled=false, pass --release-disabled.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const app = path.resolve(import.meta.dirname, '..');
const android = path.join(app, 'android/app');
const releaseEnabled = !process.argv.includes('--release-disabled');
const variants = [['debug', false], ['release', releaseEnabled]];
if (process.argv.includes('--qa')) variants.push(['telemetryQa', true]);
for (const [variant, enabled] of variants) {
  const task = `process${variant[0].toUpperCase()}${variant.slice(1)}MainManifest`;
  const manifest = fs.readFileSync(path.join(android, 'build/intermediates/merged_manifest', variant, task, 'AndroidManifest.xml'), 'utf8');
  for (const key of ['firebase_crashlytics_collection_enabled', 'firebase_performance_collection_enabled']) {
    const tag = [...manifest.matchAll(/<meta-data\b[^>]*\/>/gs)].map(match => match[0]).find(tag => tag.includes(`android:name="${key}"`));
    assert.ok(tag?.includes(`android:value="${enabled}"`), `${variant}: ${key} must be ${enabled}`);
  }
  assert.ok(manifest.includes('com.g3.scouting.G3MessagingService'), `${variant}: preserve FCM service`);
  console.log(`PASS ${variant} merged manifest: telemetry ${enabled}, FCM preserved`);
}

if (process.argv.includes('--qa')) {
  for (const [variant, enabled] of [['release', false], ['telemetryQa', true]]) {
    const config = fs.readFileSync(path.join(android, 'build/generated/source/buildConfig', variant, 'com/g3/scouting/BuildConfig.java'), 'utf8');
    assert.ok(config.includes(`CRASHLYTICS_TEST_BUILD = ${enabled};`), `${variant}: test control must be ${enabled}`);
  }
  console.log('PASS generated build flags: crash control enabled only in telemetryQa');
}

const dist = path.join(app, 'dist');
const packaged = path.join(android, 'src/main/assets/public');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let count = 0;
function compare(relative = '') {
  for (const entry of fs.readdirSync(path.join(dist, relative), { withFileTypes: true })) {
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) compare(file);
    else {
      assert.equal(hash(path.join(packaged, file)), hash(path.join(dist, file)), `Android asset differs: ${file}`);
      count++;
    }
  }
}
compare();
console.log(`PASS all ${count} web build files match Android assets`);
console.log('Local artifact checks only: Spark billing and live event delivery require Firebase console evidence.');
