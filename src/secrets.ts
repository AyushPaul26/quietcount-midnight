import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createPrivateState } from './witnesses';

const FILE = '.quietcount-secrets.json';
type LocalSecrets = { organizerSecret: string; storagePassword: string };

function loadSecrets(): LocalSecrets {
  if (!existsSync(FILE)) {
    const generated: LocalSecrets = {
      organizerSecret: randomBytes(32).toString('hex'),
      storagePassword: randomBytes(32).toString('base64url'),
    };
    writeFileSync(FILE, JSON.stringify(generated, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  const stored = JSON.parse(readFileSync(FILE, 'utf8')) as LocalSecrets;
  if (!/^[a-f0-9]{64}$/.test(stored.organizerSecret) || stored.storagePassword?.length < 16) {
    throw new Error('Invalid local QuietCount secrets. Restore your private backup; do not regenerate for an existing contract.');
  }
  return stored;
}

export function loadOrganizerState() {
  return createPrivateState(Buffer.from(loadSecrets().organizerSecret, 'hex'));
}

export function loadStoragePassword() { return loadSecrets().storagePassword; }
