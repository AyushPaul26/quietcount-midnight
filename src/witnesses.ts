import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger, Witnesses } from '../managed/counter/contract/index.js';

export type QuietCountPrivateState = { readonly organizerSecret: Uint8Array };

export function createPrivateState(secret: Uint8Array): QuietCountPrivateState {
  if (secret.length !== 32) throw new Error('Organizer secret must contain exactly 32 bytes');
  return { organizerSecret: new Uint8Array(secret) };
}

export const witnesses: Witnesses<QuietCountPrivateState> = {
  organizerSecret: ({ privateState }: WitnessContext<Ledger, QuietCountPrivateState>) => {
    if (privateState.organizerSecret.length !== 32) {
      throw new Error('Organizer secret must contain exactly 32 bytes');
    }
    return [privateState, new Uint8Array(privateState.organizerSecret)];
  },
};
