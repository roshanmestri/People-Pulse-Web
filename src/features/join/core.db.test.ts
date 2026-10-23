import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";

import { decideRequest, leaveActivity, requestToJoin } from "./core";

// Real-database concurrency test: many people race for a few spots at the same instant.
// Without the row lock in core.ts, several of these would succeed and overbook the plan.

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const DOMAIN = "race.test.local";
const SPOTS = 3;
const RACERS = 10;

let hostId = "";
let racers: string[] = [];

async function makeActivity(joinMode: "REQUEST" | "OPEN") {
  const category = await db.category.findFirstOrThrow();
  const activity = await db.activity.create({
    data: {
      hostId,
      categoryId: category.id,
      title: `Race test (${joinMode})`,
      description: "Concurrency test plan",
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60_000),
      durationMinutes: 60,
      minPeople: 1,
      maxPeople: SPOTS,
      joinMode,
      status: "OPEN",
      venueName: "Test ground",
      areaName: "Kothrud, Pune",
      latitude: 18.5074,
      longitude: 73.8077,
    },
  });
  return activity.id;
}

const statusOf = async (id: string) =>
  (await db.activity.findUniqueOrThrow({ where: { id } })).status;
const approved = (activityId: string) =>
  db.joinRequest.count({ where: { activityId, status: "APPROVED" } });

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  hostId = (
    await db.user.create({
      data: { name: "Race Host", email: `host@${DOMAIN}`, emailVerified: true },
    })
  ).id;
  racers = await Promise.all(
    Array.from(
      { length: RACERS },
      async (_, i) =>
        (
          await db.user.create({
            data: { name: `Racer ${i}`, email: `racer${i}@${DOMAIN}`, emailVerified: true },
          })
        ).id,
    ),
  );
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } }); // cascades to plans + requests
  await db.$disconnect();
});

describe("capacity under concurrency (FR-5.4)", () => {
  it(`${RACERS} people tapping "I'm in" on an open plan with ${SPOTS} spots → exactly ${SPOTS} get in`, async () => {
    const activityId = await makeActivity("OPEN");
    const results = await Promise.all(
      racers.map((userId) => requestToJoin(db, { activityId, userId, message: null })),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(SPOTS);
    expect(results.filter((r) => !r.ok && r.code === "FULL")).toHaveLength(RACERS - SPOTS);
    expect(await approved(activityId)).toBe(SPOTS);
    expect(await statusOf(activityId)).toBe("FULL");
  });

  it(`host approving ${RACERS} pending requests at once → only ${SPOTS} approved`, async () => {
    const activityId = await makeActivity("REQUEST");
    const requests = await Promise.all(
      racers.map((userId) => requestToJoin(db, { activityId, userId, message: "pick me" })),
    );
    expect(requests.every((r) => r.ok && r.status === "PENDING")).toBe(true);

    const pending = await db.joinRequest.findMany({ where: { activityId } });
    const decisions = await Promise.all(
      pending.map((r) => decideRequest(db, { requestId: r.id, hostId, decision: "approve" })),
    );
    expect(decisions.filter((d) => d.ok)).toHaveLength(SPOTS);
    expect(await approved(activityId)).toBe(SPOTS);
    expect(await statusOf(activityId)).toBe("FULL");
  });

  it("leaving frees a spot and re-opens the plan", async () => {
    const activityId = await makeActivity("OPEN");
    for (const userId of racers.slice(0, SPOTS))
      await requestToJoin(db, { activityId, userId, message: null });
    expect(await statusOf(activityId)).toBe("FULL");

    expect((await leaveActivity(db, { activityId, userId: racers[0]! })).ok).toBe(true);
    expect(await statusOf(activityId)).toBe("OPEN");
    // …and someone else can take it.
    expect(
      (await requestToJoin(db, { activityId, userId: racers[SPOTS]!, message: null })).ok,
    ).toBe(true);
    expect(await statusOf(activityId)).toBe("FULL");
  });

  it("the host can't join their own plan, and a declined person can't ask again", async () => {
    const activityId = await makeActivity("REQUEST");
    expect(await requestToJoin(db, { activityId, userId: hostId, message: null })).toMatchObject({
      ok: false,
      code: "IS_HOST",
    });

    await requestToJoin(db, { activityId, userId: racers[0]!, message: null });
    const req = await db.joinRequest.findFirstOrThrow({
      where: { activityId, userId: racers[0]! },
    });
    await decideRequest(db, { requestId: req.id, hostId, decision: "reject" });
    expect(
      await requestToJoin(db, { activityId, userId: racers[0]!, message: null }),
    ).toMatchObject({ ok: false, code: "DECLINED" });
  });

  it("a non-host can't approve requests", async () => {
    const activityId = await makeActivity("REQUEST");
    await requestToJoin(db, { activityId, userId: racers[1]!, message: null });
    const req = await db.joinRequest.findFirstOrThrow({ where: { activityId } });
    expect(
      await decideRequest(db, { requestId: req.id, hostId: racers[2]!, decision: "approve" }),
    ).toMatchObject({
      ok: false,
      code: "NOT_HOST",
    });
  });
});
