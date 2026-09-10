This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Stripe prenumeratos

Mokėjimų skiltis naudoja Stripe Checkout su mėnesinėmis EUR prenumeratomis. Produkcijoje naudokite domeną `https://getreview.lt`. Į Vercel Environment Variables pridėkite:

```env
NEXT_PUBLIC_APP_URL=https://getreview.lt
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe Dashboard sukurkite webhook endpointą `https://getreview.lt/api/stripe/webhook` ir įjunkite įvykius `checkout.session.completed`, `customer.subscription.updated` bei `customer.subscription.deleted`. `STRIPE_SECRET_KEY` ir `STRIPE_WEBHOOK_SECRET` niekada nedėkite į kliento kodą.

### Vienkartinių produktų parduotuvė

Supabase SQL Editor’yje vieną kartą paleiskite `supabase/migration-store.sql`. Tai sukuria produktų ir užsakymų lenteles bei `store-products` nuotraukų bucket’ą. Po migracijos admin pusėje atsiras „Parduotuvė“ tab’as; aktyvūs produktai automatiškai rodomi landing puslapio apačioje. Stripe Checkout vienkartiniams pirkimams paprašo pristatymo adreso, o apmokėti užsakymai išsaugomi `store_orders` lentelėje.

### Domeno prijungimas

1. Vercel projekte atidarykite **Settings → Domains** ir pridėkite `getreview.lt` bei `www.getreview.lt`.
2. Domeno DNS valdyme įrašykite Vercel parodytus A/CNAME įrašus. Rekomenduojama pagrindiniu domenu pasirinkti `getreview.lt`, o `www` nukreipti į jį.
3. Vercel Environment Variables nustatykite `NEXT_PUBLIC_APP_URL=https://getreview.lt` ir atlikite Redeploy.
4. Supabase **Authentication → URL Configuration** skiltyje nustatykite Site URL į `https://getreview.lt` ir įtraukite `https://getreview.lt/**` į Redirect URLs.
5. Stripe webhook URL naudokite `https://getreview.lt/api/stripe/webhook`; po domeno prijungimo patikrinkite Stripe Dashboard webhook testą.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
