const fs = require('fs');
const path = require('path');

function parseEnvLine(line) {
  // Supports: KEY=VALUE (optionally quoted), ignores comments.
  // Example: INITIAL_ADMIN_PASSWORD="RideCare@2026"
  const trimmed = String(line).trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;

  const key = trimmed.slice(0, eqIndex).trim();
  if (!key) return null;

  let value = trimmed.slice(eqIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadEnv({ envPath } = {}) {
  const resolvedPath = envPath || path.join(__dirname, '..', '.env');
  if (!fs.existsSync(resolvedPath)) return;

  const content = fs.readFileSync(resolvedPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;

    // Don’t override existing process.env values.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

module.exports = loadEnv;
