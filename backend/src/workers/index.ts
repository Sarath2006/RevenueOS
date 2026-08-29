/**
 * ============================================================
 * RevenueOS — Worker Bootstrap
 * ============================================================
 *
 * Starts all background workers.
 * ============================================================
 */


/**
 * AI
 */
import "./ai.worker";


/**
 * Recovery
 */
import "./recovery.worker";


/**
 * Notifications
 */
import "./notification.worker";


/**
 * Analytics
 */
import "./analytics.worker";


/**
 * Razorpay synchronization
 */
import "./sync.worker";


console.log(
  "RevenueOS workers started",
);