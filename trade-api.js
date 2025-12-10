/**
 * Trade API Endpoint - Validates and saves trades
 * Backend implementation example (Node.js + Express)
 */

const TradeValidator = require('./trade-validator.js');
const validator = new TradeValidator();

/**
 * POST /api/trades/save
 * Validates and saves a trade to database
 */
async function saveTrade(req, res) {
  try {
    const { trade, userId } = req.body;

    // Validate required fields
    if (!trade || !userId) {
      return res.status(400).json({ error: 'Missing trade or userId' });
    }

    // Get user's account history from database
    const accountHistory = await db.getTrades(userId);

    // Validate trade against loss limit
    const isValid = validator.validateTrade(trade, accountHistory);

    if (!isValid) {
      // REJECT: User has hit 2-loss limit
      return res.status(403).json({
        error: 'Trade rejected: Maximum consecutive losses reached (2)',
        consecutiveLosses: validator.countConsecutiveLosses(accountHistory),
        maxAllowed: 2,
        message: 'Please wait for a winning trade before taking another loss'
      });
    }

    // ACCEPT: Save trade to database
    const savedTrade = await db.saveTrade(userId, {
      ...trade,
      timestamp: new Date(),
      status: 'completed'
    });

    // Get updated stats
    const updatedHistory = await db.getTrades(userId);
    const stats = {
      winCount: validator.getWinCount(updatedHistory),
      lossCount: validator.getLossCount(updatedHistory),
      winRate: validator.getWinRate(updatedHistory),
      consecutiveLosses: validator.countConsecutiveLosses(updatedHistory)
    };

    res.json({
      success: true,
      trade: savedTrade,
      stats: stats
    });

  } catch (error) {
    console.error('Error saving trade:', error);
    res.status(500).json({ error: 'Failed to save trade' });
  }
}

/**
 * GET /api/trades/stats/:userId
 * Get user's trading statistics
 */
async function getTradeStats(req, res) {
  try {
    const { userId } = req.params;
    const tradeHistory = await db.getTrades(userId);

    const stats = {
      totalTrades: tradeHistory.length,
      winCount: validator.getWinCount(tradeHistory),
      lossCount: validator.getLossCount(tradeHistory),
      winRate: validator.getWinRate(tradeHistory),
      consecutiveLosses: validator.countConsecutiveLosses(tradeHistory),
      canTakeLosses: validator.countConsecutiveLosses(tradeHistory) < 2
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
}

module.exports = {
  saveTrade,
  getTradeStats
};
