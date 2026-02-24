import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCT_CATALOG: Array<{ name: string; price: number }> = [
  { name: "Growth Insights", price: 49 },
  { name: "Revenue Pulse", price: 79 },
  { name: "Conversion Lens", price: 59 },
  { name: "Audience Mapper", price: 39 },
  { name: "Funnel Explorer", price: 69 },
  { name: "Cohort Studio", price: 89 },
  { name: "Retention Radar", price: 99 },
  { name: "Forecast Engine", price: 129 },
  { name: "Executive Snapshot", price: 149 },
  { name: "Attribution Pro", price: 109 },
  { name: "Campaign Monitor", price: 65 },
  { name: "Event Tracker", price: 45 },
  { name: "Ops Dashboard", price: 75 },
  { name: "Sales Intelligence", price: 135 },
  { name: "Product Telemetry", price: 95 },
  { name: "Usage Studio", price: 55 },
];

const ORDER_STATUSES = [
  { status: "completed", weight: 82 },
  { status: "refunded", weight: 12 },
  { status: "pending", weight: 6 },
] as const;

const EVENT_NAMES = [
  { eventName: "page_view", weight: 76 },
  { eventName: "dashboard_view", weight: 10 },
  { eventName: "filter_applied", weight: 6 },
  { eventName: "chart_exported", weight: 3 },
  { eventName: "order_created", weight: 3 },
  { eventName: "product_created", weight: 2 },
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends { weight: number }>(items: readonly T[]) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function randomRecentDate(days = 30) {
  const now = Date.now();
  const ms = randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(now - ms);
}

function decimalToNumber(value: Prisma.Decimal) {
  return value.toNumber();
}

async function main() {
  console.log("Seeding analytics dataset...");

  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.product.deleteMany({}),
  ]);

  const createdProducts = await Promise.all(
    PRODUCT_CATALOG.map((product) =>
      prisma.product.create({
        data: {
          name: product.name,
          price: new Prisma.Decimal(product.price),
          isActive: true,
        },
      })
    )
  );

  const orderTarget = randomInt(560, 820);
  const orderRows: Array<{
    id: string;
    productId: string;
    amount: Prisma.Decimal;
    status: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < orderTarget; i += 1) {
    const product = createdProducts[randomInt(0, createdProducts.length - 1)];
    const picked = pickWeighted(ORDER_STATUSES);
    const productPrice = decimalToNumber(product.price);
    const variance = randomInt(-8, 18);
    const amount = Math.max(9, productPrice + variance);

    orderRows.push({
      id: `seed-order-${i + 1}`,
      productId: product.id,
      amount: new Prisma.Decimal(amount),
      status: picked.status,
      createdAt: randomRecentDate(30),
    });
  }

  await prisma.order.createMany({ data: orderRows });

  const eventTarget = randomInt(4500, 7800);
  const userPool = Array.from({ length: 380 }, (_, idx) => `user_${String(idx + 1).padStart(4, "0")}`);
  const eventRows: Array<{
    id: string;
    eventName: string;
    productId: string | null;
    orderId: string | null;
    userId: string | null;
    metadata: Prisma.InputJsonValue | undefined;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < eventTarget; i += 1) {
    const event = pickWeighted(EVENT_NAMES);
    const product = createdProducts[randomInt(0, createdProducts.length - 1)];
    const order = orderRows[randomInt(0, orderRows.length - 1)];
    const userId = Math.random() < 0.9 ? userPool[randomInt(0, userPool.length - 1)] : null;

    const metadata: Prisma.InputJsonValue = {
      source: ["dashboard", "api", "bulk-import"][randomInt(0, 2)],
      plan: ["starter", "growth", "pro", "enterprise"][randomInt(0, 3)],
    };

    eventRows.push({
      id: `seed-event-${i + 1}`,
      eventName: event.eventName,
      productId: Math.random() < 0.72 ? product.id : null,
      orderId: event.eventName === "order_created" || Math.random() < 0.28 ? order.id : null,
      userId,
      metadata,
      createdAt: randomRecentDate(30),
    });
  }

  await prisma.analyticsEvent.createMany({ data: eventRows });

  console.log(
    `Analytics seed complete: ${createdProducts.length} products, ${orderRows.length} orders, ${eventRows.length} events`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
