# DAO Governance System

A decentralized autonomous organization (DAO) implementation using Clarity for the Stacks blockchain ecosystem.

## Overview

This project implements a complete DAO governance system with voting mechanisms built on Clarity smart contracts. It provides an on-chain governance solution where token holders can create proposals, vote according to their token holdings, and execute successful proposals.

## Features

- **Governance Token**: SIP-010 compliant fungible token
- **Proposal System**: Create, vote on, and execute proposals
- **Democratic Voting**: Voting power proportional to token holdings
- **Quorum Requirements**: Minimum participation thresholds for valid decisions
- **Time-based Constraints**: Defined voting periods with clear start and end times

## Contract Structure

The DAO Governance System consists of the following components:

### Core Token Functions

- Token minting and management
- SIP-010 compliant interface
- Token transfers between accounts

### Governance Mechanisms

- Proposal creation with metadata (title, description, external links)
- Weighted voting based on token holdings
- Automatic vote tallying
- Execution permissions with quorum checks

## Development

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - The Clarity development environment
- [Node.js](https://nodejs.org/) - For running tests via Vitest

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dao-governance-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Clarinet (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   cargo install clarinet
   ```

## Testing

The project includes a comprehensive test suite using Vitest:

```bash
npm test
```

The tests cover:
- Token functionality
- Proposal creation
- Voting mechanisms
- Proposal execution
- Read-only functions

## Usage

### Deploying the Contract

1. Initialize a new Clarinet project (if starting from scratch):
   ```bash
   clarinet new dao-governance
   cd dao-governance
   ```

2. Copy the contract code into a new Clarity file:
   ```bash
   cp /path/to/dao-governance.clar contracts/
   ```

3. Deploy to a local development chain:
   ```bash
   clarinet console
   ```

### Interacting with the Contract

#### Creating a Proposal

```clarity
(contract-call? .dao-governance create-proposal "Proposal Title" "This is a description of the proposal" "https://example.com/proposal-details")
```

#### Voting on a Proposal

```clarity
;; Vote Yes on proposal #0
(contract-call? .dao-governance vote u0 true)

;; Vote No on proposal #0
(contract-call? .dao-governance vote u0 false)
```

#### Executing a Proposal

```clarity
(contract-call? .dao-governance execute-proposal u0)
```

#### Checking Proposal Status

```clarity
(contract-call? .dao-governance get-proposal u0)
(contract-call? .dao-governance has-proposal-passed u0)
```

## Implementation Details

### Error Codes

- `ERR-NOT-AUTHORIZED (u100)`: Caller is not authorized for the operation
- `ERR-PROPOSAL-DOES-NOT-EXIST (u101)`: Referenced proposal does not exist
- `ERR-PROPOSAL-EXPIRED (u102)`: Voting period has ended or not yet started
- `ERR-ALREADY-VOTED (u103)`: The address has already voted on this proposal
- `ERR-INSUFFICIENT-TOKENS (u104)`: The address does not have enough tokens
- `ERR-QUORUM-NOT-REACHED (u105)`: Proposal did not reach minimum participation
- `ERR-PROPOSAL-NOT-ENDED (u106)`: Voting period is still active
- `ERR-ZERO-AMOUNT (u107)`: Attempted operation with zero tokens

### Configuration Parameters

- `token-name`: Name of the governance token
- `token-symbol`: Symbol of the governance token
- `quorum-percentage`: Minimum participation required (default: 51%)
- `voting-period`: Duration of voting in blocks (default: 144 blocks ≈ 1 day)

## Extending the Project

The DAO Governance System can be extended in several ways:

1. **Treasury Management**: Add functions to manage a shared treasury
2. **Delegation**: Allow token holders to delegate their voting power
3. **Proposal Types**: Create different categories of proposals with specific execution paths
4. **Time-locks**: Add delay periods between proposal passing and execution
5. **Multiple Signature Requirements**: Add requirements for specific addresses to approve certain proposals

## Security Considerations

When deploying this contract:

- Carefully consider the token distribution to avoid centralization
- Ensure quorum requirements match your community size
- Consider implementing time-locks for security-critical operations
- Thoroughly test all functions before mainnet deployment

## License

[MIT License](LICENSE)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request