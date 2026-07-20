# GO storefront, kiosk and POS

GO is the ordering layer for live venues. It provides three channels over a shared commerce foundation.

## Customer storefront

Customers open a vendor link, browse the live catalogue, configure an item, choose fulfilment, check out and track the order.

## Self-service kiosk

The kiosk supports walk-up ordering without an app. A guest starts an order, selects available items, reviews the cart, provides the required details, pays using an enabled method and receives an order number.

If a kiosk is idle, start a new order before entering customer information. Do not continue another guest's open cart.

## Staff POS

GO POS is for approved site staff capturing walk-in, dine-in or takeaway orders. A cashier or Site Chief must:

1. sign in with the correct staff account;
2. confirm the assigned site;
3. open an available register and start a shift;
4. build the order using the shared product configuration;
5. confirm fulfilment and payment;
6. submit the order to the same operational queue used by other channels;
7. end the shift when handing over the register.

Kitchen staff use VendorOS KDS, not GO POS.

## Shared behaviour

Storefront, kiosk and POS use the same published catalogue, product configuration, pricing and availability rules for a site. A channel can present the information differently, but it must not invent a different price or sell an item that is unavailable for that same context.

## Related guides

- [GO troubleshooting](../support/go.md)
- [Roles and sites](roles-and-sites.md)
- [Order statuses](../support/order-statuses.md)
