import Stripe from 'stripe';
import { asynchandler } from '../utils/Asynchandler.js';
import { Apierror } from '../utils/Apierror.js';
import { Apiresponse } from '../utils/Apiresponse.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = asynchandler(async (req, res) => {
    const { amount, currency = 'usd', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
        throw new ApiError(400, 'Valid amount is required');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Amount should already be in cents from frontend
            currency,
            metadata: {
                userId: req.user._id.toString(),
                ...metadata
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.status(200).json(
            new Apiresponse(200, {
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id
            }, 'Payment intent created successfully')
        );
    } catch (error) {
        console.error('Stripe error:', error);
        throw new Apierror(500, 'Payment intent creation failed');
    }
});

const confirmPayment = asynchandler(async (req, res) => {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
        throw new Apierror(400, 'Payment intent ID is required');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

        res.status(200).json(
            new Apiresponse(200, {
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency
            }, 'Payment status retrieved successfully')
        );
    } catch (error) {
        console.error('Stripe error:', error);
        throw new ApiError(500, 'Failed to retrieve payment status');
    }
});

const refundPayment = asynchandler(async (req, res) => {
    const { payment_intent_id, amount, reason = 'requested_by_customer' } = req.body;

    if (!payment_intent_id) {
        throw new Apierror(400, 'Payment intent ID is required');
    }

    try {
        const refundData = {
            payment_intent: payment_intent_id,
            reason
        };

        if (amount) {
            refundData.amount = Math.round(amount * 100); // Convert to cents
        }

        const refund = await stripe.refunds.create(refundData);

        res.status(200).json(
            new Apiresponse(200, {
                refund_id: refund.id,
                status: refund.status,
                amount: refund.amount / 100,
                currency: refund.currency
            }, 'Refund processed successfully')
        );
    } catch (error) {
        console.error('Stripe refund error:', error);
        throw new Apierror(500, 'Refund processing failed');
    }
});

const handleWebhook = asynchandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful:', paymentIntent.id);
            // Update order status or perform other actions
            break;
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('PaymentIntent failed:', failedPayment.id);
            // Handle failed payment
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json(new Apiresponse(200, {}, 'Webhook handled successfully'));
});

export {
    createPaymentIntent,
    confirmPayment,
    refundPayment,
    handleWebhook
};
