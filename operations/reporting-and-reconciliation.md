# Reporting and reconciliation

The reporting workspace is intended for authorised administrators and finance users. Cashiers need a simple shift summary, not unrestricted access to organisation-wide financial data.

## Choose a period

Use an explicit site, channel and date range for end-of-day, weekly or monthly review. The period should use the operating site's time zone.

## Review totals

Compare:

- submitted and completed orders;
- gross order value;
- payments grouped by channel;
- cash expected from the POS;
- electronic payments and safe provider references;
- refunds and reversals;
- cancelled or unpaid orders;
- fees, subsidy or programme contributions where applicable;
- the expected net settlement.

## Export for finance

Export CSV when line-by-line matching is needed. A useful export includes the order reference, transaction reference, site, channel, timestamps, order status, payment status, gross amount, refund amount and expected net amount.

Finance may add its own received, missing, variance and investigation labels in Excel. Those local labels should not silently change Patatte's source transaction record.

## Resolve differences

1. Confirm that both systems use the same period and time zone.
2. Match by payment or order reference, not customer name alone.
3. Separate pending settlements from missing payments.
4. Record refunds and reversals against the original transaction.
5. Escalate unexplained variances with the export and safe references.
