import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interface
class ClarityContract {
  state: any = {
    tokenBalances: new Map(),
    proposals: new Map(),
    votes: new Map(),
    tokenName: "DAO-TOKEN",
    tokenSymbol: "DAO",
    tokenDecimals: 6,
    tokenSupply: 0,
    proposalCount: 0,
    quorumPercentage: 51,
    votingPeriod: 144,
  };
  
  blockHeight: number = 100;

  // SIP-010 functions
  getName() {
    return { ok: this.state.tokenName };
  }

  getSymbol() {
    return { ok: this.state.tokenSymbol };
  }

  getDecimals() {
    return { ok: this.state.tokenDecimals };
  }

  getBalance(account: string) {
    return { ok: this.state.tokenBalances.get(account) || 0 };
  }

  getTotalSupply() {
    return { ok: this.state.tokenSupply };
  }

  transfer(amount: number, sender: string, recipient: string) {
    const senderBalance = this.state.tokenBalances.get(sender) || 0;
    
    if (sender !== this.txSender) {
      return { err: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    if (amount > senderBalance) {
      return { err: 104 }; // ERR-INSUFFICIENT-TOKENS
    }
    
    if (amount <= 0) {
      return { err: 107 }; // ERR-ZERO-AMOUNT
    }
    
    this.state.tokenBalances.set(sender, senderBalance - amount);
    
    const recipientBalance = this.state.tokenBalances.get(recipient) || 0;
    this.state.tokenBalances.set(recipient, recipientBalance + amount);
    
    return { ok: true };
  }

  // DAO functions
  mint(recipient: string, amount: number) {
    if (amount <= 0) {
      return { err: 107 }; // ERR-ZERO-AMOUNT
    }
    
    const currentBalance = this.state.tokenBalances.get(recipient) || 0;
    this.state.tokenBalances.set(recipient, currentBalance + amount);
    this.state.tokenSupply += amount;
    
    return { ok: true };
  }

  createProposal(title: string, description: string, link: string) {
    const creatorBalance = this.state.tokenBalances.get(this.txSender) || 0;
    
    if (creatorBalance <= 0) {
      return { err: 104 }; // ERR-INSUFFICIENT-TOKENS 
    }
    
    const proposalId = this.state.proposalCount;
    
    this.state.proposals.set(proposalId, {
      creator: this.txSender,
      title,
      description,
      link,
      startBlockHeight: this.blockHeight,
      endBlockHeight: this.blockHeight + this.state.votingPeriod,
      yesVotes: 0,
      noVotes: 0,
      executed: false
    });
    
    this.state.proposalCount++;
    
    return { ok: proposalId };
  }

  vote(proposalId: number, voteValue: boolean) {
    const proposal = this.state.proposals.get(proposalId);
    
    if (!proposal) {
      return { err: 101 }; // ERR-PROPOSAL-DOES-NOT-EXIST
    }
    
    if (proposal.startBlockHeight > this.blockHeight || 
        this.blockHeight >= proposal.endBlockHeight) {
      return { err: 102 }; // ERR-PROPOSAL-EXPIRED
    }
    
    const voterBalance = this.state.tokenBalances.get(this.txSender) || 0;
    
    if (voterBalance <= 0) {
      return { err: 104 }; // ERR-INSUFFICIENT-TOKENS
    }
    
    const voteKey = `${proposalId}-${this.txSender}`;
    
    if (this.state.votes.has(voteKey)) {
      return { err: 103 }; // ERR-ALREADY-VOTED
    }
    
    this.state.votes.set(voteKey, {
      voted: true,
      vote: voteValue,
      weight: voterBalance
    });
    
    if (voteValue) {
      proposal.yesVotes += voterBalance;
    } else {
      proposal.noVotes += voterBalance;
    }
    
    this.state.proposals.set(proposalId, proposal);
    
    return { ok: true };
  }

  executeProposal(proposalId: number) {
    const proposal = this.state.proposals.get(proposalId);
    
    if (!proposal) {
      return { err: 101 }; // ERR-PROPOSAL-DOES-NOT-EXIST
    }
    
    if (this.blockHeight < proposal.endBlockHeight) {
      return { err: 106 }; // ERR-PROPOSAL-NOT-ENDED
    }
    
    if (proposal.executed) {
      return { err: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const quorumThreshold = (this.state.tokenSupply * this.state.quorumPercentage) / 100;
    
    if (totalVotes < quorumThreshold) {
      return { err: 105 }; // ERR-QUORUM-NOT-REACHED
    }
    
    proposal.executed = true;
    this.state.proposals.set(proposalId, proposal);
    
    if (proposal.yesVotes > proposal.noVotes) {
      return { ok: { some: true } };
    } else {
      return { ok: { some: false } };
    }
  }

  getProposal(proposalId: number) {
    return this.state.proposals.get(proposalId);
  }

  getVote(proposalId: number, voter: string) {
    const voteKey = `${proposalId}-${voter}`;
    return this.state.votes.get(voteKey);
  }

  hasProposalPassed(proposalId: number) {
    const proposal = this.state.proposals.get(proposalId);
    
    if (!proposal) {
      return { err: 101 }; // ERR-PROPOSAL-DOES-NOT-EXIST
    }
    
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const quorumThreshold = (this.state.tokenSupply * this.state.quorumPercentage) / 100;
    
    if (this.blockHeight >= proposal.endBlockHeight && 
        totalVotes >= quorumThreshold && 
        proposal.yesVotes > proposal.noVotes) {
      return { ok: true };
    } else {
      return { ok: false };
    }
  }

  getProposalCount() {
    return this.state.proposalCount;
  }

  // Mock transaction sender
  txSender: string = 'account1';
  setTxSender(sender: string) {
    this.txSender = sender;
  }

  // Mock block height progression
  advanceBlocks(blocks: number) {
    this.blockHeight += blocks;
  }
}

describe('DAO Governance System', () => {
  let contract: ClarityContract;
  
  beforeEach(() => {
    contract = new ClarityContract();
    
    // Setup some test accounts with tokens
    contract.setTxSender('deployer');
    contract.mint('account1', 1000);
    contract.mint('account2', 2000);
    contract.mint('account3', 3000);
    contract.mint('account4', 4000);
  });
  
  describe('Token Functions', () => {
    it('should return correct token metadata', () => {
      expect(contract.getName()).toEqual({ ok: "DAO-TOKEN" });
      expect(contract.getSymbol()).toEqual({ ok: "DAO" });
      expect(contract.getDecimals()).toEqual({ ok: 6 });
    });
    
    it('should return correct balances', () => {
      expect(contract.getBalance('account1')).toEqual({ ok: 1000 });
      expect(contract.getBalance('account2')).toEqual({ ok: 2000 });
      expect(contract.getTotalSupply()).toEqual({ ok: 10000 }); // Sum of all accounts
    });
    
    it('should transfer tokens correctly', () => {
      contract.setTxSender('account1');
      contract.transfer(500, 'account1', 'account5');
      
      expect(contract.getBalance('account1')).toEqual({ ok: 500 });
      expect(contract.getBalance('account5')).toEqual({ ok: 500 });
    });
    
    it('should prevent unauthorized transfers', () => {
      contract.setTxSender('account1');
      const result = contract.transfer(500, 'account2', 'account1');
      
      expect(result).toEqual({ err: 100 }); // ERR-NOT-AUTHORIZED
      expect(contract.getBalance('account1')).toEqual({ ok: 1000 });
      expect(contract.getBalance('account2')).toEqual({ ok: 2000 });
    });
    
    it('should prevent transfers exceeding balance', () => {
      contract.setTxSender('account1');
      const result = contract.transfer(1500, 'account1', 'account2');
      
      expect(result).toEqual({ err: 104 }); // ERR-INSUFFICIENT-TOKENS
      expect(contract.getBalance('account1')).toEqual({ ok: 1000 });
      expect(contract.getBalance('account2')).toEqual({ ok: 2000 });
    });
  });
  
  describe('Proposal Creation', () => {
    it('should create a proposal successfully', () => {
      contract.setTxSender('account1');
      const result = contract.createProposal(
        'Test Proposal', 
        'This is a test proposal', 
        'https://example.com/proposal'
      );
      
      expect(result).toEqual({ ok: 0 });
      
      const proposal = contract.getProposal(0);
      expect(proposal).toBeDefined();
      expect(proposal.title).toBe('Test Proposal');
      expect(proposal.yesVotes).toBe(0);
      expect(proposal.noVotes).toBe(0);
      expect(proposal.executed).toBe(false);
    });
    
    it('should reject proposal creation from non-token holders', () => {
      contract.setTxSender('account5'); // Has no tokens
      const result = contract.createProposal(
        'Invalid Proposal', 
        'This proposal should not be created', 
        'https://example.com/invalid'
      );
      
      expect(result).toEqual({ err: 104 }); // ERR-INSUFFICIENT-TOKENS
      expect(contract.getProposalCount()).toBe(0);
    });
  });
  
  describe('Voting Mechanism', () => {
    beforeEach(() => {
      // Create a test proposal
      contract.setTxSender('account1');
      contract.createProposal(
        'Test Proposal', 
        'This is a test proposal', 
        'https://example.com/proposal'
      );
    });
    
    it('should allow token holders to vote', () => {
      contract.setTxSender('account2');
      const result = contract.vote(0, true); // Vote yes
      
      expect(result).toEqual({ ok: true });
      
      const proposal = contract.getProposal(0);
      expect(proposal.yesVotes).toBe(2000); // account2 has 2000 tokens
      expect(proposal.noVotes).toBe(0);
      
      const voteInfo = contract.getVote(0, 'account2');
      expect(voteInfo).toBeDefined();
      expect(voteInfo.vote).toBe(true);
      expect(voteInfo.weight).toBe(2000);
    });
    
    it('should prevent double voting', () => {
      contract.setTxSender('account2');
      contract.vote(0, true);
      
      const result = contract.vote(0, false);
      expect(result).toEqual({ err: 103 }); // ERR-ALREADY-VOTED
      
      const proposal = contract.getProposal(0);
      expect(proposal.yesVotes).toBe(2000);
      expect(proposal.noVotes).toBe(0);
    });
    
    it('should prevent voting after voting period', () => {
      // Advance past end of voting period
      contract.advanceBlocks(contract.state.votingPeriod + 1);
      
      contract.setTxSender('account2');
      const result = contract.vote(0, true);
      
      expect(result).toEqual({ err: 102 }); // ERR-PROPOSAL-EXPIRED
    });
    
    it('should track votes correctly for multiple voters', () => {
      // Vote yes with account2
      contract.setTxSender('account2');
      contract.vote(0, true);
      
      // Vote no with account3
      contract.setTxSender('account3');
      contract.vote(0, false);
      
      // Vote yes with account4
      contract.setTxSender('account4');
      contract.vote(0, true);
      
      const proposal = contract.getProposal(0);
      expect(proposal.yesVotes).toBe(6000); // 2000 + 4000
      expect(proposal.noVotes).toBe(3000);
    });
  });
  
  describe('Proposal Execution', () => {
    beforeEach(() => {
      // Create a test proposal
      contract.setTxSender('account1');
      contract.createProposal(
        'Test Proposal', 
        'This is a test proposal', 
        'https://example.com/proposal'
      );
      
      // Cast some votes
      contract.setTxSender('account1');
      contract.vote(0, true); // 1000 yes
      
      contract.setTxSender('account2');
      contract.vote(0, true); // 2000 yes
      
      contract.setTxSender('account3');
      contract.vote(0, false); // 3000 no
    });
    
    it('should prevent execution before voting period ends', () => {
      contract.setTxSender('account1');
      const result = contract.executeProposal(0);
      
      expect(result).toEqual({ err: 106 }); // ERR-PROPOSAL-NOT-ENDED
    });
    
    it('should execute a passed proposal correctly', () => {
      // Account4 votes yes to make proposal pass
      contract.setTxSender('account4');
      contract.vote(0, true); // 4000 yes
      
      // Advance past end of voting period
      contract.advanceBlocks(contract.state.votingPeriod + 1);
      
      contract.setTxSender('account1');
      const result = contract.executeProposal(0);
      
      expect(result).toEqual({ ok: { some: true } }); // Proposal passed
      
      const proposal = contract.getProposal(0);
      expect(proposal.executed).toBe(true);
    });
    
    it('should execute a failed proposal correctly', () => {
      // Advance past end of voting period
      contract.advanceBlocks(contract.state.votingPeriod + 1);
      
      contract.setTxSender('account1');
      const result = contract.executeProposal(0);
      
      expect(result).toEqual({ ok: { some: false } }); // Proposal failed (3000 no > 3000 yes)
      
      const proposal = contract.getProposal(0);
      expect(proposal.executed).toBe(true);
    });
    
    it('should prevent execution if quorum not reached', () => {
      // Reset test scenario with lower participation
      contract = new ClarityContract();
      
      // Setup with many tokens but little participation
      contract.mint('account1', 1000);
      contract.mint('account2', 1000);
      contract.mint('inactive', 100000); // Most tokens held by inactive members
      
      // Create proposal
      contract.setTxSender('account1');
      contract.createProposal('Low Participation', 'Test', 'link');
      
      // Only account1 votes
      contract.vote(0, true); // 1000 yes
      
      // Advance past end of voting period
      contract.advanceBlocks(contract.state.votingPeriod + 1);
      
      // Try to execute
      const result = contract.executeProposal(0);
      
      expect(result).toEqual({ err: 105 }); // ERR-QUORUM-NOT-REACHED
    });
    
    it('should prevent executing a proposal twice', () => {
      // Make proposal pass
      contract.setTxSender('account4');
      contract.vote(0, true);
      
      // Advance past end of voting period
      contract.advanceBlocks(contract.state.votingPeriod + 1);
      
      // Execute first time
      contract.setTxSender('account1');
      contract.executeProposal(0);
      
      // Try to execute again
      const result = contract.executeProposal(0);
      
      expect(result).toEqual({ err: 100 }); // ERR-NOT-AUTHORIZED
    });
  });
  
  describe('Read-only Functions', () => {
    beforeEach(() => {
      // Create a test proposal
      contract.setTxSender('account1');
      contract.createProposal(
        'Test Proposal', 
        'This is a test proposal', 
        'https://example.com/proposal'
      );
      
      // Cast some votes
      contract.setTxSender('account4');
      contract.vote(0, true); // 4000 yes
    });
    
    it('should correctly report if a proposal has passed', () => {
      // Before voting period ends
      expect(contract.hasProposalPassed(0)).toEqual({ ok: false });
      
      // Advance past end of voting period
      contract.advanceBlocks(contract.state.votingPeriod + 1);
      
      expect(contract.hasProposalPassed(0)).toEqual({ ok: true });
    });
    
    it('should correctly report proposal count', () => {
      expect(contract.getProposalCount()).toBe(1);
      
      // Create another proposal
      contract.setTxSender('account2');
      contract.createProposal('Second Proposal', 'Description', 'link');
      
      expect(contract.getProposalCount()).toBe(2);
    });
    
    it('should correctly use vi mock functions', () => {
      // Example of using vi for mocking
      const mockFn = vi.fn(() => 'mocked result');
      expect(mockFn()).toBe('mocked result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Example with spying on contract method
      const spy = vi.spyOn(contract, 'getProposalCount');
      contract.getProposalCount();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});