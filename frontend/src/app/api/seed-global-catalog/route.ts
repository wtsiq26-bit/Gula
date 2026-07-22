// Gula PMS - Global Catalog Seeding API Route Handler
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GLOBAL_PHARMACY_ID = "SYSTEM_GLOBAL";
const BATCH_SIZE = 500;

async function runSeeding() {
  const candidatePaths = [
    path.resolve(process.cwd(), "drugs.json"),
    path.resolve(process.cwd(), "prisma/drugs.json"),
    path.resolve(process.cwd(), "data/drugs.json"),
    path.resolve(process.cwd(), "../backend/data/drugs.json"),
    path.resolve(process.cwd(), "../backend/prisma/drugs.json"),
    path.resolve(process.cwd(), "../drugs.json"),
  ];

  let filePath: string | null = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    throw new Error(
      `لم يتم العثور على ملف drugs.json في أي من المسارات المتوقعة. المسارات المفحوصة:\n${candidatePaths.join("\n")}`
    );
  }

  // 1. Ensure mandatory SYSTEM_GLOBAL tenant exists in Pharmacy table
  await prisma.pharmacy.upsert({
    where: { id: GLOBAL_PHARMACY_ID },
    update: {},
    create: {
      id: GLOBAL_PHARMACY_ID,
      name: "النظام العالمي للأدوية (Global Catalog)",
      location: "System",
    },
  });

  // 2. Pre-load existing barcodes into memory to minimize database conflict overhead
  const existingMedicines = await prisma.medicine.findMany({
    select: { barcode: true },
    where: { barcode: { not: null } },
  });
  const seenBarcodes = new Set<string>();
  for (const m of existingMedicines) {
    if (m.barcode) seenBarcodes.add(m.barcode);
  }

  // 3. Set up stream-json pipeline
  const { chain } = require("stream-chain");
  const { parser } = require("stream-json");
  const { pick } = require("stream-json/filters/pick.js");
  const { streamArray } = require("stream-json/streamers/stream-array.js");

  // Detect whether JSON uses top-level "results" object or array
  const fileHeader = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).substring(0, 1000);
  const hasResultsWrapper = fileHeader.includes('"results"');

  const pipelineSteps = [
    fs.createReadStream(filePath),
    parser(),
  ];
  if (hasResultsWrapper) {
    pipelineSteps.push(pick({ filter: "results" }));
  }
  pipelineSteps.push(streamArray());

  const pipeline = chain(pipelineSteps);

  let batch: any[] = [];
  let totalProcessed = 0;
  let totalInserted = 0;
  const startTime = Date.now();

  return new Promise<{ totalProcessed: number; totalInserted: number; durationSeconds: number; filePath: string }>((resolve, reject) => {
    pipeline.on("data", async (data: { key: number; value: any }) => {
      const drug = data.value;
      if (!drug) return;

      const tradeName = (
        drug.brand_name ||
        drug.tradeName ||
        drug.trade_name ||
        drug.generic_name ||
        "دواء غير مسمى"
      ).trim();

      const genericName = (drug.generic_name || drug.genericName || "").trim() || null;

      let scientificName: string | null = (drug.scientificName || drug.scientific_name || "").trim() || null;
      if (!scientificName && Array.isArray(drug.active_ingredients)) {
        scientificName = drug.active_ingredients
          .map((a: any) => (a.name || a.strength ? `${a.name || ""} ${a.strength || ""}`.trim() : ""))
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

      let barcode: string | null = (drug.barcode || drug.product_ndc || "").trim() || null;
      if (!barcode && Array.isArray(drug.packaging) && drug.packaging.length > 0) {
        barcode = (drug.packaging[0].package_ndc || "").trim() || null;
      }

      const manufacturer = (drug.manufacturer || drug.labeler_name || "").trim() || null;
      const dosageForm = (drug.dosageForm || drug.dosage_form || "").trim() || null;
      const nationalCode = (drug.nationalCode || drug.national_code || "").trim() || null;
      const country = (drug.country || "").trim() || null;

      // Avoid duplicates
      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          return;
        }
        seenBarcodes.add(barcode);
      }

      batch.push({
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

      totalProcessed++;

      if (batch.length >= BATCH_SIZE) {
        pipeline.pause();
        const currentBatch = [...batch];
        batch = [];

        try {
          const res = await prisma.medicine.createMany({
            data: currentBatch,
            skipDuplicates: true,
          });
          totalInserted += res.count;
        } catch (err: any) {
          console.error(`[Seed Global Catalog Error at chunk ${totalProcessed}]:`, err?.message || err);
        } finally {
          pipeline.resume();
        }
      }
    });

    pipeline.on("end", async () => {
      if (batch.length > 0) {
        try {
          const res = await prisma.medicine.createMany({
            data: batch,
            skipDuplicates: true,
          });
          totalInserted += res.count;
        } catch (err: any) {
          console.error(`[Seed Global Catalog Error at final chunk]:`, err?.message || err);
        }
      }
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      resolve({
        totalProcessed,
        totalInserted,
        durationSeconds,
        filePath: filePath!,
      });
    });

    pipeline.on("error", (err: any) => {
      console.error("[Seed Global Catalog Pipeline Error]:", err);
      reject(err);
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const result = await runSeeding();
    return NextResponse.json({
      success: true,
      message: "تم استيراد الكتالوج العالمي للأدوية بنجاح!",
      details: {
        totalProcessed: result.totalProcessed,
        totalInserted: result.totalInserted,
        durationSeconds: result.durationSeconds,
        batchSize: BATCH_SIZE,
        filePath: result.filePath,
      },
    });
  } catch (error: any) {
    console.error("[Seed Global Catalog API GET Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ غير متوقع أثناء استيراد الكتالوج." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
