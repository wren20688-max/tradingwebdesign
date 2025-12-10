/**
 * Trade Validator - Enforces 2-loss maximum on real accounts
 * This must run on your backend/server before saving trades
 */

class TradeValidator {
  constructor() {
    this.maxConsecutiveLosses = 2;
  }

  /**
   * Validate trade before saving to database
   * Returns true if trade should be saved, false if it violates loss limit
   */
  validateTrade(trade, userAccountHistory) {
    // Only enforce for real/marketer accounts, not demo
    if (trade.accountType === 'demo' || trade.isDemoAccount) {
      return true; // Demo trades always allowed
    }

    // Check consecutive losses in user's history
    const consecutiveLosses = this.countConsecutiveLosses(userAccountHistory);

    // If already at 2 losses, reject loss trades
    if (consecutiveLosses >= this.maxConsecutiveLosses && trade.profit < 0) {
      console.warn(`⚠️ Trade rejected: Account already has ${consecutiveLosses} consecutive losses (max: ${this.maxConsecutiveLosses})`);
      return false; // REJECT this loss trade
    }

    return true; // ACCEPT trade
  }

  /**
   * Count consecutive losses from most recent trades
   */
  countConsecutiveLosses(tradeHistory) {
    if (!tradeHistory || tradeHistory.length === 0) {
      return 0;
    }

    let count = 0;
    // Check from most recent backwards
    for (let i = tradeHistory.length - 1; i >= 0; i--) {
      if (tradeHistory[i].profit < 0) {
        count++;
      } else {
        break; // Stop counting when we hit a win
      }
    }
    return count;
  }

  /**
   * Get loss count for account
   */
  getLossCount(tradeHistory) {
    return tradeHistory.filter(t => t.profit < 0).length;
  }

  /**
   * Get win count for account
   */
  getWinCount(tradeHistory) {
    return tradeHistory.filter(t => t.profit > 0).length;
  }

  /**
   * Get win rate percentage
   */
  getWinRate(tradeHistory) {
    if (tradeHistory.length === 0) return 0;
    const wins = this.getWinCount(tradeHistory);
    return ((wins / tradeHistory.length) * 100).toFixed(2);
  }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradeValidator;
}
