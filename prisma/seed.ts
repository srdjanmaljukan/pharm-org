import { PrismaClient } from "../lib/generated/prisma";
import { hashSync } from "bcrypt-ts-edge";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Pokretanje seed skripte...\n");

  // ── 1. Kreiraj korisnika (apoteku) ──────────────────────────────────────────
  const email    = "apoteka@email.com";   // ← promijeni po potrebi
  const password = "apoteka123";          // ← promijeni po potrebi

  const existingUser = await prisma.user.findFirst({ where: { email } });

  let user;
  if (existingUser) {
    console.log(`ℹ️  Korisnik '${email}' već postoji, preskačem kreiranje.`);
    user = existingUser;
  } else {
    user = await prisma.user.create({
      data: {
        name:     "Apoteka",
        email,
        password: hashSync(password, 10),
      },
    });
    console.log(`✅ Korisnik kreiran: ${email}`);
  }

  // ── 2. Kreiraj admin radnika ─────────────────────────────────────────────────
  const adminName = "Admin";   // ← promijeni na svoje ime
  const adminPin  = "1234";    // ← promijeni na željeni PIN (4–6 cifara)

  const existingAdmin = await prisma.worker.findFirst({
    where: { userId: user.id, role: "ADMIN" },
  });

  if (existingAdmin) {
    console.log(`ℹ️  Admin radnik već postoji, preskačem kreiranje.`);
  } else {
    await prisma.worker.create({
      data: {
        name:   adminName,
        pin:    hashSync(adminPin, 10),
        role:   "ADMIN",
        userId: user.id,
      },
    });
    console.log(`✅ Admin radnik kreiran: '${adminName}' sa PIN-om '${adminPin}'`);
  }

  console.log("\n🎉 Seed završen!");
  console.log("─────────────────────────────────────");
  console.log(`  Email:    ${email}`);
  console.log(`  Lozinka:  ${password}`);
  console.log(`  Admin PIN: ${adminPin}`);
  console.log("─────────────────────────────────────");
  console.log("Zapamti ove podatke i odmah ih promijeni u aplikaciji!\n");
}

main()
  .catch((e) => {
    console.error("❌ Greška u seed skripti:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });