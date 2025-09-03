import { Router } from 'express';
import { 
    createPaymentIntent, 
    confirmPayment, 
    refundPayment, 
    handleWebhook 
} from '../Controllers/Payment.controller.js';
import { verifyJWT } from '../middlewares/Authentication.middleware.js';

const router = Router();

// Payment intent creation (protected route)
router.route('/create-intent').post(verifyJWT, createPaymentIntent);

// Confirm payment status (protected route)
router.route('/confirm').post(verifyJWT, confirmPayment);

// Process refund (protected route - admin/provider only)
router.route('/refund').post(verifyJWT, refundPayment);

// Webhook endpoint (public - Stripe will call this)
router.route('/webhook').post(handleWebhook);

export default router;
