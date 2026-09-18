import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../managed/counter/contract/index.js';
import { createPrivateState, witnesses, type QuietCountPrivateState } from '../src/witnesses.js';

// Fixed vectors are test fixtures, never deployment credentials.
const ALICE = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const BOB = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);

class Simulator {
  contract = new Contract<QuietCountPrivateState>(witnesses);
  context: CircuitContext<QuietCountPrivateState>;
  constructor(secret = ALICE) {
    const initial = this.contract.initialState(createConstructorContext(createPrivateState(secret), '0'.repeat(64)));
    this.context = createCircuitContext(
      sampleContractAddress(), initial.currentZswapLocalState,
      initial.currentContractState, initial.currentPrivateState,
    );
  }
  read() { return ledger(this.context.currentQueryContext.state); }
  switchSecret(secret: Uint8Array) { this.context.currentPrivateState = createPrivateState(secret); }
  increment() {
    const result = this.contract.impureCircuits.increment(this.context);
    this.context = result.context;
    return result.result;
  }
}

describe('QuietCount compiled Compact contract', () => {
  it('initializes a zero counter and a stable commitment', () => {
    const first = new Simulator();
    assert.equal(first.read().count, 0n);
    assert.deepEqual(first.read(), new Simulator().read());
    assert.equal(first.read().organizer.length, 32);
  });

  it('increments once per authorized invocation without changing ownership', () => {
    const simulation = new Simulator();
    const initialOrganizer = simulation.read().organizer;
    for (let expected = 1n; expected <= 5n; expected++) {
      simulation.increment();
      assert.equal(simulation.read().count, expected);
      assert.deepEqual(simulation.read().organizer, initialOrganizer);
    }
  });

  it('rejects an unauthorized witness before changing public state', () => {
    const simulation = new Simulator();
    simulation.increment();
    const before = simulation.read();
    simulation.switchSecret(BOB);
    assert.throws(() => simulation.increment(), /Only the authorized organizer/);
    assert.deepEqual(simulation.read(), before);
    simulation.switchSecret(ALICE);
    simulation.increment();
    assert.equal(simulation.read().count, 2n);
  });

  it('binds each deployment to its own secret commitment', () => {
    const aliceDeployment = new Simulator(ALICE);
    const bobDeployment = new Simulator(BOB);
    assert.notDeepEqual(aliceDeployment.read().organizer, bobDeployment.read().organizer);
    bobDeployment.switchSecret(ALICE);
    assert.throws(() => bobDeployment.increment(), /Only the authorized organizer/);
    assert.equal(aliceDeployment.read().count, 0n);
  });

  it('keeps the raw witness out of exported ledger fields and circuit results', () => {
    const simulation = new Simulator();
    const result = simulation.increment();
    const publicLedger = simulation.read();
    assert.deepEqual(Object.keys(publicLedger).sort(), ['count', 'organizer']);
    assert.notDeepEqual(publicLedger.organizer, ALICE);
    assert.deepEqual(result, []);
    assert.deepEqual(simulation.context.currentPrivateState.organizerSecret, ALICE);
    // This is a runtime boundary test, not a proof of traffic anonymity.
    const publicJson = JSON.stringify(publicLedger, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    assert.ok(!publicJson.includes('organizerSecret'));
    assert.ok(!publicJson.includes(Buffer.from(ALICE).toString('hex')));
  });

  it('copies private input and rejects invalid-length secrets', () => {
    const source = new Uint8Array(ALICE);
    const state = createPrivateState(source);
    source.fill(0);
    assert.deepEqual(state.organizerSecret, ALICE);
    assert.throws(() => createPrivateState(new Uint8Array(31)), /exactly 32 bytes/);
    assert.throws(() => createPrivateState(new Uint8Array(33)), /exactly 32 bytes/);
  });
});
