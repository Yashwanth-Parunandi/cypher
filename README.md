# Cypher — Blockchain Certificate Issuance and Verification

Cypher is my web application for issuing, managing, and verifying digital certificates. It combines a modern React interface with Firebase, IPFS storage, and an Ethereum smart contract. Certificate details are stored as metadata on IPFS, while the certificate's content identifier (CID) and validity state are recorded on-chain.

The goal is to make credentials easier to share and independently verify, without putting the full certificate document on the blockchain.

## What the application does

- Supports student/recipient, issuer, and admin account roles.
- Lets authorized users prepare certificates using reusable visual templates.
- Stores certificate metadata on IPFS through Pinata.
- Records issuance and revocation state through the CertVault smart contract.
- Provides issuer and recipient dashboards, certificate details, previews, and PDF downloads.
- Offers a public certificate validation page that does not require the verifier to sign in.

## Technologies

| Technology | Purpose |
| --- | --- |
| React, TypeScript, Vite | Frontend application, type-safe code, and development/build tooling |
| React Router | Page navigation and protected application routes |
| Tailwind CSS and shadcn/ui | Styling and reusable interface components |
| Firebase Authentication | Account registration and sign-in |
| Cloud Firestore | User profiles and searchable certificate catalog records |
| Express | Local API proxy for Pinata uploads |
| Pinata and IPFS | Pinned, content-addressed certificate metadata |
| Solidity and Ethereum Sepolia | Certificate issuance, validation, and revocation records |
| ethers.js and MetaMask | Wallet connection and smart-contract interaction |

## Architecture and certificate lifecycle

```text
Issuer / recipient / verifier
               |
               v
       React + TypeScript
         /      |       \
        /       |        \ MetaMask + ethers.js
       v        v                  |
 Firebase   Express API             v
 Auth +     Pinata proxy       CertVault contract
 Firestore      |              Ethereum Sepolia
                v
             Pinata / IPFS
           Certificate JSON + CID
```

When issuing a certificate, the application prepares its metadata and uploads it to Pinata/IPFS. The returned CID is submitted to the CertVault contract using the connected wallet. Firestore stores a catalog record for the application dashboards. During validation, the app checks the blockchain record and retrieves certificate details from Firestore or IPFS.

## Project structure

```text
server/
  index.cjs                 Express API and Pinata upload proxy
src/
  components/               Shared layout, certificate preview, templates, UI
  config/                   Firebase, network, and contract configuration
  contexts/                 Shared authentication state
  contracts/                CertVault Solidity source and ABI
  pages/                    Dashboard, issuance, validation, login, and details
  services/                 Authentication, Firestore, IPFS, wallet, and chain logic
  types/                    TypeScript user and certificate models
  utils/                    PDF download helpers
```

Key implementation files include:

- `src/pages/GenerateCertificate.tsx` — issuer form and wallet-authorized issuance flow.
- `src/pages/Dashboard.tsx` — role-specific certificate catalog.
- `src/pages/ValidateCertificate.tsx` — public certificate validation interface.
- `src/services/certificateService.ts` — certificate creation, Firestore lookup, and validation orchestration.
- `src/services/ipfsService.ts` — IPFS upload and metadata retrieval.
- `src/services/transactionService.ts` — Ethereum transaction and contract-read operations.
- `src/contracts/CertVault.sol` — on-chain issue, validate, and revoke rules.
- `server/index.cjs` — Express endpoint that proxies JSON uploads to Pinata.

## Run locally

### Requirements

- Node.js and npm
- A Firebase project with Authentication and Cloud Firestore enabled
- A Pinata account and API credentials
- MetaMask
- A deployed CertVault contract and an RPC endpoint for the configured network

### Configure environment

From the project directory, create a local environment file from the example:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set your own Firebase configuration, deployed contract address, RPC endpoint, chain ID, and server-side Pinata credentials. The app defaults to Ethereum Sepolia when no chain ID is specified. The Sepolia chain ID is `0xaa36a7` (decimal `11155111`).

Keep `.env` private: it is excluded by `.gitignore`. Do not put Pinata secret credentials in variables prefixed with `VITE_`, because Vite exposes those variables to browser code. Use `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` for the Express proxy.

### Install and start

```powershell
npm install
npm.cmd run dev:full
```

In PowerShell, use `npm.cmd` if the `npm` command is blocked by the local script execution policy. The combined development command starts:

- Vite frontend at `http://localhost:8080`
- Express API at `http://localhost:4000`

Keep the terminal open while using the app. Press **Ctrl+C** to stop the processes.

You can also run each process separately in its own terminal:

```powershell
npm.cmd run dev
npm.cmd run dev:server
```

## Improvements and current behavior

- Role-aware routes distinguish recipient access from issuer/admin screens.
- The wallet/network flow supports switching MetaMask to the configured chain; the contract separately enforces its own authorization.
- Issuer catalog lookup searches certificate ownership fields and also uses the issuer's saved certificate index, helping records remain discoverable when a field-based lookup is insufficient.
- Firestore catalog load failures can be shown to the user rather than always appearing as an empty issuer catalog.
- Pinata uploads can go through the local Express proxy so secret credentials do not need to be sent from the browser.
- Certificate metadata stays off-chain, while the contract records a CID and status for verification and revocation.

## Important configuration and limitations

- **Wallet authorization:** the application role and the smart-contract role are independent. `CertVault.issueCertificate` is restricted to admin-authorized wallet addresses. An account marked as an issuer in the app still needs an authorized wallet to mint on-chain.
- **Network and deployment:** Sepolia is a test network. A working deployment requires a valid contract address, compatible RPC endpoint, Firebase project, Pinata credentials, and test ETH for transactions.
- **External dependencies:** IPFS gateways, Pinata, Firebase, the RPC endpoint, and MetaMask must be available for their respective features.
- **Existing catalog data:** certificates previously stored under a different Firebase project, account ID, or schema may need migration or manual recovery; changing the lookup logic cannot move data between projects.
- **Production deployment:** deploy the Express API separately and configure its URL and allowed origins for production. The local `localhost:4000` API is for local development.

## Build and lint

```powershell
npm.cmd run build
npm.cmd run lint
```

## Security notes

- Never commit `.env` or paste secret values into public issues or documentation.
- Keep Pinata secret credentials on the server; do not expose them through `VITE_` variables.
- Use test wallets and test assets on Sepolia during development.
- Do not treat frontend role checks as a substitute for smart-contract authorization.
