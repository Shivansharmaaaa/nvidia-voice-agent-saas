import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
    } else {
      this.logger.warn('Stripe secret key not configured');
    }
  }

  async createCustomer(name: string, organizationId: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const customer = await this.stripe.customers.create({
      name,
      metadata: {
        organizationId,
      },
    });

    return customer.id;
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId?: string,
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (paymentMethodId) {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    const subscription = await this.stripe.subscriptions.create(subscriptionData);

    return subscription.id;
  }

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItem = subscription.items.data[0];

    await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    return subscriptionId;
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    if (cancelAtPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
