# BrewLite architecture diagram

```mermaid
flowchart LR
    Customer[Customer browser]
    Web[Next.js web app<br/>apps/web]
    API[NestJS API<br/>apps/api]
    Prisma[Prisma ORM]
    DB[(PostgreSQL)]
    Payment[VNPay Sandbox URL plus signed server-side IPN]

    Customer -->|HTTP| Web
    Web -->|REST API| API
    API --> Prisma
    Prisma --> DB
    API -->|Signed checkout URL| Payment
    Payment -->|Signed IPN for verification| API
```

The browser return from VNPay is not trusted to change `Payment`/`Order` into PAID. Only validated signed IPN can settle a payment. For runtime and the GHCR/Render topology, see [deployment.md](../deployment.md) and [deployment.svg](deployment.svg).
