# Tiwari Ji Daily Needs

A beginner-friendly quick-commerce grocery store starter.

## Requirements
- Node.js 18 or newer
- npm
- A modern browser

## Run locally
1. Extract this ZIP.
2. Open the extracted folder in VS Code.
3. Open Terminal > New Terminal.
4. Run `npm install`
5. Copy `.env.example` to `.env`.
6. Set a private `ADMIN_PASSWORD` in `.env`.
7. Run `npm start`
8. Open http://localhost:3000

The first run creates `data.json` with sample grocery products. Products and orders are stored in this local JSON file for the demo.

## Features included
- Responsive grocery storefront
- Product search and category filters
- Shopping cart with quantity controls
- Checkout with customer name, phone and address
- Browser GPS permission and coordinates capture
- Cash on Delivery orders saved by backend
- Order status lookup API
- Admin order and product APIs protected by `x-admin-password`
- Razorpay order creation and signature verification API scaffolding

## Online payments
Online payment is intentionally disabled until you configure Razorpay credentials:
- Create a Razorpay account and use test keys first.
- Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.
- The server includes create-order and signature-verification endpoints.
- A production checkout must also create the store order only after verified payment, handle webhooks, and use HTTPS. Do not use live keys until thoroughly tested.

## Location
The browser asks the customer for permission. The app saves latitude/longitude with the order when permission is granted. Location is optional; customers can type their delivery address. For production, add a map UI and a maps provider key if you need address autocomplete, routing or live driver tracking. This starter does not continuously track a customer.

## Admin API examples
Set `ADMIN_PASSWORD` in `.env`, then send it as the `x-admin-password` header.
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/TJD_ORDER_ID` with JSON `{ "status": "Out for Delivery" }`
- `POST /api/admin/products` with product JSON
- `DELETE /api/admin/products/PRODUCT_ID`

## Cloud deployment
This starter can be deployed to an AWS EC2 instance or another Node.js host. For production:
1. Use MongoDB Atlas or a managed database instead of the demo JSON file.
2. Store secrets in AWS Systems Manager Parameter Store or Secrets Manager.
3. Put the app behind HTTPS using a reverse proxy or load balancer.
4. Add persistent storage or a managed database; do not rely on an ephemeral server disk.
5. Configure backups, logs, monitoring, rate limiting, validation, and proper customer/admin authentication.
6. Set `PORT` and secrets in the hosting environment.

## Important production gaps
This is a runnable starter/demo, not yet a production-ready commerce platform. Before accepting real customers/payments, add customer accounts, admin UI, stock reservation, verified online-payment-to-order workflow, Razorpay webhooks, delivery partner tracking, privacy policy, terms, refund/cancellation handling, and security review.
