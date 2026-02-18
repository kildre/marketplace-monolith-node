import { Request, Response } from 'express';
import { sequelize } from '../../service/sequelize';
import logger from "../../service/loggingService";

class DemoController {
  /**
   * Reset all demo data - clears requests, orders, cart items, and decisions
   * DEV/DEMO ONLY
   */
  async resetDemoData(req: Request, res: Response) {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'prod') {
        logger.warn('[DEMO] Reset attempted in production - BLOCKED');
        return res.status(403).json({
          error: 'Demo reset not allowed in production'
        });
      }

      logger.info('[DEMO] Resetting demo data...');

      // Delete user-generated transactional data only (in correct order respecting foreign keys)
      // NOTE: Notifications are seed data and should NOT be cleared
      await sequelize.query('DELETE FROM order_item');
      await sequelize.query('DELETE FROM cart_item');
      await sequelize.query('DELETE FROM decision');
      await sequelize.query('DELETE FROM marketplace_order');
      await sequelize.query('DELETE FROM use_case_request');

      logger.info('[DEMO] Demo data reset complete');

      return res.status(200).json({
        message: 'Demo data reset successfully - transactional data cleared, seed data preserved',
        cleared: [
          'order_item',
          'cart_item',
          'decision',
          'marketplace_order',
          'use_case_request'
        ],
        preserved: [
          'notification (seed data)',
          'notification_recipient (seed data)',
          'product (seed data)',
          'marketplace_user (seed data)'
        ]
      });
    } catch (error) {
      // Use console.log for better error visibility
      console.error('[DEMO] Error resetting demo data:');
      console.error('[DEMO] Error type:', typeof error);
      console.error('[DEMO] Error value:', error);
      console.error('[DEMO] Error JSON:', JSON.stringify(error, null, 2));

      // Log detailed error information
      if (error instanceof Error) {
        console.error('[DEMO] Error name:', error.name);
        console.error('[DEMO] Error message:', error.message);
        console.error('[DEMO] Error stack:', error.stack);
        // Check for Sequelize-specific error details
        const seqError = error as any;
        if (seqError.original) {
          console.error('[DEMO] Original error:', seqError.original);
        }
      }

      return res.status(500).json({
        error: 'Failed to reset demo data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default new DemoController();
