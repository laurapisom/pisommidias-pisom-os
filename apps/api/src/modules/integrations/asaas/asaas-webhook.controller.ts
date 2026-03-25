import { Controller, Post, Body, Param, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from '../integrations.service';

/**
 * Public endpoint for Asaas webhook callbacks.
 * No auth guard — Asaas sends webhooks directly.
 * Idempotency: duplicate events are ignored via upsert on payment.id.
 *
 * Configure in Asaas:
 *   URL: https://<domain>/api/webhooks/asaas/<organizationId>
 *   Events: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
 *           PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_DELETED, PAYMENT_RESTORED
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(private integrationsService: IntegrationsService) {}

  @Post('asaas/:organizationId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Asaas payment webhook' })
  async handleWebhook(
    @Param('organizationId') organizationId: string,
    @Body() body: any,
  ) {
    const event = body?.event;
    const payment = body?.payment;

    if (!event || !payment?.id) {
      this.logger.warn(`Invalid webhook payload: event=${event}, payment.id=${payment?.id}`);
      return { received: true };
    }

    // Only handle payment-related events
    const paymentEvents = [
      'PAYMENT_CREATED',
      'PAYMENT_UPDATED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_OVERDUE',
      'PAYMENT_REFUNDED',
      'PAYMENT_DELETED',
      'PAYMENT_RESTORED',
      'PAYMENT_REFUND_IN_PROGRESS',
      'PAYMENT_CHARGEBACK_REQUESTED',
      'PAYMENT_CHARGEBACK_DISPUTE',
      'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
      'PAYMENT_DUNNING_RECEIVED',
      'PAYMENT_DUNNING_REQUESTED',
      'PAYMENT_BANK_SLIP_VIEWED',
      'PAYMENT_CHECKOUT_VIEWED',
    ];

    if (!paymentEvents.includes(event)) {
      this.logger.log(`Ignoring non-payment event: ${event}`);
      return { received: true };
    }

    try {
      await this.integrationsService.handleAsaasWebhook(organizationId, event, payment);
    } catch (err) {
      // Log but always return 200 to prevent Asaas from retrying indefinitely
      this.logger.error(`Webhook processing failed for ${event} payment ${payment.id}: ${err.message}`);
    }

    return { received: true };
  }
}
