import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe, syncSubscription } from '@/lib/stripe';

// Stripe calls this whenever a subscription starts, changes, renews, fails or ends.
// The signature check proves the message really came from Stripe.
export async function POST(request: NextRequest) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  const sig = request.headers.get('stripe-signature');
  if (!secret || !sig) return new Response('Not configured', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), sig, secret);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === 'subscription' && s.subscription) {
          const id = typeof s.subscription === 'string' ? s.subscription : s.subscription.id;
          await syncSubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (e) {
    console.error('[stripe] webhook failed', event.type, (e as Error).message);
    return new Response('Try again', { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
