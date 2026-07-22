// Gula PMS - Standalone CLI Global Catalog Seeding Script
import { createRequire } from "module";
import fileUrl from "url";
import path from "path";

const require = createRequire(import.meta.url);
const fs = require("fs");
const JSONStream = require("JSONStream");

const GLOBAL_PHARMACY_ID = "SYSTEM_GLOBAL";
const BATCH_SIZE = 1000;

// Resolve DB path directly to backend/prisma/dev.db
const currentDir = path.dirname(fileUrl.fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");
const dbPath = path.resolve(rootDir, "backend/prisma/dev.db").replace(/\\/g, "/");

// Load PrismaClient from backend/node_modules or root fallback
let PrismaClient;
try {
  const backendPrismaPath = path.resolve(rootDir, "backend/node_modules/@prisma/client");
  PrismaClient = require(backendPrismaPath).PrismaClient;
} catch (e) {
  PrismaClient = require("@prisma/client").PrismaClient;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

async function main() {
  console.log("==================================================");
  console.log("🚀 Starting Standalone Medicine Database Seeder...");
  console.log("==================================================");
  console.log(`📂 Target Database: ${dbPath}`);

  // 1. Resolve drugs.json file path
  const candidatePaths = [
    path.resolve(rootDir, "backend/data/drugs.json"),
    path.resolve(rootDir, "data/drugs.json"),
    path.resolve(rootDir, "prisma/drugs.json"),
    path.resolve(rootDir, "backend/prisma/drugs.json"),
    path.resolve(rootDir, "drugs.json"),
  ];

  let filePath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error("❌ ERROR: Could not locate drugs.json in any expected directory!");
    console.error("Checked locations:");
    candidatePaths.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  console.log(`📄 Found Data File: ${filePath}`);

  // 2. Ensure mandatory SYSTEM_GLOBAL tenant exists in Pharmacy table
  console.log(`⚙️  Verifying global tenant '${GLOBAL_PHARMACY_ID}' in Pharmacy table...`);
  await prisma.pharmacy.upsert({
    where: { id: GLOBAL_PHARMACY_ID },
    update: {},
    create: {
      id: GLOBAL_PHARMACY_ID,
      name: "System Global Catalog",
      location: "System",
    },
  });
  console.log(`✅ Global tenant initialized.`);

  // 3. Pre-load existing barcodes to prevent duplicate barcode constraints
  console.log("🔍 Pre-loading existing barcodes to optimize batch insertion...");
  const existingMedicines = await prisma.medicine.findMany({
    select: { barcode: true },
    where: { barcode: { not: null } },
  });
  const seenBarcodes = new Set();
  existingMedicines.forEach((m) => {
    if (m.barcode) seenBarcodes.add(m.barcode);
  });
  console.log(`📊 Loaded ${seenBarcodes.size.toLocaleString()} existing barcodes.`);

  // 4. Determine JSON structure (results wrapper vs direct array)
  const headerSample = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).substring(0, 1000);
  const hasResultsWrapper = headerSample.includes('"results"');
  const parsePattern = hasResultsWrapper ? "results.*" : "*";

  console.log(`⏳ Streaming JSON stream using pattern '${parsePattern}' (Chunk Size: ${BATCH_SIZE.toLocaleString()})...`);
  console.log("--------------------------------------------------");

  let chunk = [];
  let totalRead = 0;
  let totalInserted = 0;
  let lastLoggedProgress = 0;
  const startTime = Date.now();

  const fileStream = fs.createReadStream(filePath);
  const jsonStream = JSONStream.parse(parsePattern);

  const stream = fileStream.pipe(jsonStream);

  stream.on("data", async (drug) => {
    if (!drug) return;

    totalRead++;

    const tradeName = (
      drug.brand_name ||
      drug.tradeName ||
      drug.trade_name ||
      drug.generic_name ||
      "Unknown Medicine"
    ).trim();

    const genericName = (drug.generic_name || drug.genericName || "").trim() || null;

    let scientificName = (drug.scientificName || drug.scientific_name || "").trim() || null;
    if (!scientificName && Array.isArray(drug.active_ingredients)) {
      scientificName = drug.active_ingredients
        .map((a) => (a.name || a.strength ? `${a.name || ""} ${a.strength || ""}`.trim() : ""))
        .filter(Boolean)
        .join(", ") || null;
    }
    if (!scientificName) {
      scientificName = genericName;
    }

    const category = (
      drug.category ||
      drug.product_type ||
      (Array.isArray(drug.route) ? drug.route[0] : drug.route) ||
      ""
    ).trim() || null;

    let barcode = (drug.barcode || drug.product_ndc || "").trim() || null;
    if (!barcode && Array.isArray(drug.packaging) && drug.packaging.length > 0) {
      barcode = (drug.packaging[0].package_ndc || "").trim() || null;
    }

    const manufacturer = (drug.manufacturer || drug.labeler_name || "").trim() || null;
    const dosageForm = (drug.dosageForm || drug.dosage_form || "").trim() || null;
    const nationalCode = (drug.nationalCode || drug.national_code || "").trim() || null;
    const country = (drug.country || "").trim() || null;

    // Filter in-memory duplicates
    if (barcode) {
      if (seenBarcodes.has(barcode)) {
        return;
      }
      seenBarcodes.add(barcode);
    }

    chunk.push({
      tradeName: tradeName.substring(0, 255),
      genericName: genericName ? genericName.substring(0, 255) : null,
      scientificName: scientificName ? scientificName.substring(0, 255) : null,
      category: category ? category.substring(0, 100) : null,
      barcode: barcode ? barcode.substring(0, 100) : null,
      manufacturer: manufacturer ? manufacturer.substring(0, 255) : null,
      dosageForm: dosageForm ? dosageForm.substring(0, 100) : null,
      nationalCode: nationalCode ? nationalCode.substring(0, 100) : null,
      country: country ? country.substring(0, 100) : null,
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      totalStock: 0,
      isGlobal: true,
      pharmacyId: GLOBAL_PHARMACY_ID,
    });

    if (chunk.length >= BATCH_SIZE) {
      stream.pause();
      const currentChunk = [...chunk];
      chunk = [];

      try {
        const result = await prisma.medicine.createMany({
          data: currentChunk,
          skipDuplicates: true,
        });
        totalInserted += result.count;

        if (totalInserted - lastLoggedProgress >= 5000 || totalInserted === result.count) {
          console.log(`📦 Injected ${totalInserted.toLocaleString()} records... (Processed: ${totalRead.toLocaleString()})`);
          lastLoggedProgress = totalInserted;
        }
      } catch (err) {
        console.error(`⚠️ Chunk insertion error at record ${totalRead}:`, err.message || err);
      } finally {
        stream.resume();
      }
    }
  });

  stream.on("end", async () => {
    if (chunk.length > 0) {
      try {
        const result = await prisma.medicine.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        totalInserted += result.count;
      } catch (err) {
        console.error("⚠️ Final chunk insertion error:", err.message || err);
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log("--------------------------------------------------");
    console.log("🎉 Seeding Completed Successfully!");
    console.log(`📈 Total Records Read: ${totalRead.toLocaleString()}`);
    console.log(`💾 Total Records Inserted: ${totalInserted.toLocaleString()}`);
    console.log(`⏱️  Duration: ${durationSeconds} seconds`);
    console.log("==================================================");

    await prisma.$disconnect();
    process.exit(0);
  });

  stream.on("error", async (err) => {
    console.error("\n❌ Stream error during parsing:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
}

main().catch(async (err) => {
  console.error("\n❌ Fatal error in seeder script:", err);
  await prisma.$disconnect();
  process.exit(1);
});
