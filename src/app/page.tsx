import { connection } from "next/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

// Temporary M0 health check: proves browser → Next.js server → Prisma → Postgres/PostGIS.
async function DbStatus() {
  await connection(); // read the DB per request, not at build time
  const version = await db.$queryRaw<{ version: string }[]>`SELECT postgis_lib_version() AS version`
    .then(([row]) => row.version)
    .catch(() => null);

  if (!version) {
    return <Badge variant="destructive">Database unreachable — run `docker compose up -d`</Badge>;
  }
  return <Badge variant="secondary">Database connected · PostGIS {version}</Badge>;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Gathr</h1>
      <p className="text-lg text-muted-foreground">Find your people, nearby.</p>
      <div>
        <Button>Explore activities</Button>
      </div>
      <Suspense fallback={<Badge variant="outline">Checking database…</Badge>}>
        <DbStatus />
      </Suspense>
    </main>
  );
}
