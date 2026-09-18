# QuietCount

> Publish an activity count on Midnight while proving organizer authority without publishing the organizer's secret.

Built for **Rise In — New Moon to Full, Level 1**. This is a small, testable contract foundation for a privacy-conscious community activity dashboard.

## Contract Address

Deployment is pending. This repository does not yet claim a successful Preview or Preprod deployment. The deployment command writes the real address and timestamp to `docs/deployment.json` after chain confirmation. Level 1 will only be submitted after that evidence exists.

## What This Does

An organizer creates a counter. The contract stores a public commitment derived from a random 32-byte organizer secret. Every `increment()` call must prove knowledge of the matching secret; a caller with a different secret is rejected before the count changes. Each accepted call adds exactly one to the public total.

The contract does not collect participant names, emails, attendance records, or medical information. It proves that an authorized organizer updated a count. It does **not** prove that the count represents distinct people or real-world attendance.

## Privacy Model

| Boundary | Data and behavior |
| --- | --- |
| **Public** | `count`, the domain-separated `organizer` commitment, the contract address, and transaction metadata. |
| **Private** | The random organizer secret, supplied by `organizerSecret()` from local private state. Wallet recovery material is also local and ignored by Git. |
| **Proved** | The caller knows a secret whose commitment matches the registered organizer. |
| **Deliberately disclosed** | Only the derived commitment at contract construction. `disclose()` permits that value to cross into public ledger state. |
| **Never returned** | The exported increment circuit returns `[]`; it does not return the witness. |

Private witnesses are inputs to local execution and proof generation. They are not blockchain storage. `disclose()` is an explicit compiler acknowledgement, not a network transport: the commitment becomes public because it is written to the ledger. Test vectors are synthetic and are never used as deployment credentials.

There is one organizer per deployment. Anyone obtaining its secret can increment. This prototype has no secret rotation, independent attendance verification, or claim of network-level anonymity. Use a fresh high-entropy secret and keep the ignored credential files backed up privately.

## Initial Idea

Community workshops and student clubs often publish participation numbers while keeping an unnecessary spreadsheet of names, contact details, and attendance histories. QuietCount starts with an accountable aggregate: an organizer proves authority to update a public activity count without publishing its authorization secret or any participant record. A later version could introduce event-specific membership commitments and one-use participation proofs, then give organizers a dashboard that reveals totals while participants choose whether to share evidence of attendance. This Level 1 contract establishes the authorization and disclosure boundary; unique-person counting and anonymous attendance verification remain future work.

## Tech Stack

- Midnight Preview / Preprod, Compact language 0.23, compiler **0.31.1**.
- Node.js **22**, TypeScript, Midnight.js **4.1.1**, Compact runtime **0.16.0**.
- Midnight wallet SDK **1.2.0** and Docker proof server **8.1.0**.
- Node's test runner through `tsx`; tests execute the actual compiled contract.
- GitHub Actions on Linux compiles circuits, generates keys, typechecks, and tests.

## Prerequisites

Use Linux, macOS, or Ubuntu under WSL2 on Windows. The Compact compiler has no native Windows binary. Install Node.js 22, Git, Docker with Compose v2, and the official Compact toolchain. A Preview faucet supplies test tokens; no purchase or mainnet funds are needed.

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
export PATH="$HOME/.compact/bin:$PATH"
compact update 0.31.1
compact --version
compact compile --version
```

## Setup

```bash
git clone https://github.com/AyushPaul26/quietcount-midnight.git
cd quietcount-midnight
nvm use                         # if using nvm; .nvmrc selects Node 22
npm ci
npm run compile:hello            # toolchain smoke-test contract
npm run compile                  # contracts/counter.compact -> managed/counter
npm run build                    # typecheck; failures are not suppressed
npm test
```

`managed/` contains compiler-generated JavaScript/types, circuit IR, and proving/verification keys. These keys are public circuit artifacts, **not** wallet private keys. Do not manually edit generated code. The validation workflow records the real compile and test logs under `docs/evidence/` after a successful run.

## Run Tests

```bash
npm run compile
npm test
```

The tests cover deterministic initialization, repeated state transitions, rejection of an incorrect witness without a ledger change, separation between organizers, the public/private output boundary, and invalid secret length. They check runtime behavior and disclosure boundaries; they do not establish traffic anonymity or real-world attendance.

## Deploy to Preview

```bash
npm run proof-server:start
npm run deploy -- --hello-world  # optional toolchain smoke deployment
npm run deploy                  # deploys the custom QuietCount contract
npm run network preview
```

The script prints only the public wallet address and faucet link, then waits for test tokens. If the faucet requires a CAPTCHA or sign-in, complete that step yourself. The wallet registers its test NIGHT for DUST generation and the script submits the deployment once resources are available. A confirmed deployment writes `docs/deployment.json`; the separate smoke contract uses `docs/deployment-hello-world.json`.

Keep `.midnight-state.json`, `.quietcount-secrets.json`, `.midnight-wallet-state/`, and `quietcount-state/` private. They are excluded by `.gitignore`. Recovery phrases and organizer secrets must not be added to screenshots, commits, issues, or logs. The proof-server port is bound to localhost.

## Screenshots and Evidence

Compile and deployment screenshots will be added after the actual operations succeed. Current work is incomplete until both screenshots and the confirmed custom contract address are present. No screenshot or address is simulated.

## Project Structure

```text
contracts/counter.compact       Custom private-witness contract
contracts/hello-world.compact   Upstream toolchain smoke contract
managed/                       Real compiler output after validation
src/witnesses.ts                Private-state adapter
src/secrets.ts                  Random local organizer secret and storage password
src/deploy.ts                   Preview/Preprod deployment and public evidence
src/network.ts                 Network selection and local wallet identity
src/wallet.ts                  SDK wallet integration
tests/counter.test.ts           Compiled-contract behavior/privacy tests
.github/workflows/validate.yml  Linux compilation, typecheck, tests, artifacts
docs/                          Deployment evidence and requirements tracking
```

The frontend is intentionally reserved for Level 2; this Level 1 deliverable is the contract, deployment, and reproducible evidence.

## Sources and License

The wallet/deployment infrastructure is adapted from [Midnight's create-mn-app](https://github.com/midnightntwrk/create-mn-app), pinned to the 0.5.1 template. See `NOTICE` and `LICENSE` for Apache-2.0 attribution. The QuietCount contract and tests are specific to this project.

References: [toolchain installation](https://docs.midnight.network/getting-started/installation), [official counter example](https://github.com/midnightntwrk/example-counter), and [private-witness example](https://github.com/midnightntwrk/example-bboard).
