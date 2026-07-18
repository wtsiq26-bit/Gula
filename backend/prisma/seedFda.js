const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/pick.js');
const { streamArray } = require('stream-json/streamers/stream-array.js');

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// OpenFDA JSON Streaming Seeder
// ─────────────────────────────────────────────────────────────
// This script streams a large JSON file to avoid Out of Memory (OOM) 
// crashes, batches records into memory, and bulk-inserts them into SQLite.
// ─────────────────────────────────────────────────────────────

// Configuration
// We resolve 'data/drugs.json' relative to the project root (assuming backend is in /backend)
const DRUGS_FILE_PATH = path.join(__dirname, '../data/drugs.json');
const BATCH_SIZE = 500; // Optimal batch size for SQLite to avoid locking/performance issues

async function seed() {
  console.log(`Starting OpenFDA drugs streaming seeder...`);
  console.log(`File path resolved to: ${DRUGS_FILE_PATH}`);

  if (!fs.existsSync(DRUGS_FILE_PATH)) {
    console.error(`❌ ERROR: The file ${DRUGS_FILE_PATH} does not exist.`);
    console.error(`Please ensure you have placed the drugs.json file in the root 'data' folder.`);
    process.exit(1);
  }

  // 1. Ensure we have a default Pharmacy to assign these medicines to
  // since the schema requires a pharmacyId.
  let defaultPharmacy = await prisma.pharmacy.findFirst();
  if (!defaultPharmacy) {
    console.log("No pharmacy found. Creating a default 'System Pharmacy'...");
    defaultPharmacy = await prisma.pharmacy.create({
      data: {
        name: "System Pharmacy",
        location: "Central Database"
      }
    });
  }
  console.log(`Using Pharmacy ID: ${defaultPharmacy.id}`);

  // Load existing barcodes to prevent duplicate constraint errors in SQLite
  console.log('Loading existing barcodes from database to prevent duplicates...');
  const existingMedicines = await prisma.medicine.findMany({
    select: { barcode: true },
    where: { barcode: { not: null } }
  });
  const seenBarcodes = new Set(existingMedicines.map(m => m.barcode));
  console.log(`Loaded ${seenBarcodes.size} existing barcodes.`);

  let batch = [];
  let totalProcessed = 0;
  let totalInserted = 0;

  console.log('Initializing JSON data stream pipeline...');
  
  // 2. Setup the stream-json pipeline
  const pipeline = chain([
    fs.createReadStream(DRUGS_FILE_PATH),
    parser(),
    // OpenFDA data wraps the list in a "results" array. We only want to stream this array.
    pick({ filter: 'results' }),
    streamArray()
  ]);

  // 3. Process each item chunk-by-chunk
  pipeline.on('data', async (data) => {
    // Each 'data' event yields an object { key: index, value: drugObject }
    const drug = data.value;
    
    // Graceful mapping: Extract required fields, handling missing properties
    const tradeName = drug.brand_name || drug.generic_name || "Unknown Medicine";
    const genericName = drug.generic_name || null;
    const category = drug.product_type || (drug.route && drug.route[0]) || null;
    
    // Use product_ndc or the first packaging package_ndc as the barcode
    let barcode = drug.product_ndc || null;
    if (!barcode && drug.packaging && drug.packaging.length > 0) {
      barcode = drug.packaging[0].package_ndc || null;
    }

    // Skip if barcode already exists
    if (barcode) {
      if (seenBarcodes.has(barcode)) return;
      seenBarcodes.add(barcode);
    }

    // Prepare Medicine object matching Prisma schema
    batch.push({
      tradeName: tradeName.substring(0, 255), // truncate to prevent DB constraint errors
      genericName: genericName ? genericName.substring(0, 255) : null,
      category: category ? category.substring(0, 100) : null,
      barcode: barcode,
      costPrice: 0.0,    // Default cost
      sellingPrice: 0.0, // Default selling price
      stock: 0,          // Default stock
      pharmacyId: defaultPharmacy.id
    });

    totalProcessed++;

    // 4. Batch Insertion Logic
    if (batch.length >= BATCH_SIZE) {
      // Pause the file stream to prevent reading more data into RAM
      pipeline.pause(); 
      
      try {
        const batchToInsert = [...batch];
        batch = []; // Clear the batch for the next chunk
        
        // Bulk insert using Prisma.
        // SQLite does not support skipDuplicates: true, so we manage uniqueness in memory.
        const result = await prisma.medicine.createMany({
          data: batchToInsert
        });

        totalInserted += result.count;
        console.log(`[Progress] Read ${totalProcessed} drugs. Inserted batch of ${result.count}. Total inserted: ${totalInserted}`);
      } catch (error) {
        console.error(`[Error] Failed to insert batch at record ${totalProcessed}:`, error.message);
      } finally {
        // Resume reading from disk once DB insertion is done
        pipeline.resume(); 
      }
    }
  });

  // 5. Handle stream completion
  pipeline.on('end', async () => {
    // Process any remaining items in the final batch that didn't hit the BATCH_SIZE limit
    if (batch.length > 0) {
      try {
        const result = await prisma.medicine.createMany({
          data: batch
        });
        totalInserted += result.count;
        console.log(`[Progress] Read ${totalProcessed} drugs. Inserted final batch of ${result.count}. Total inserted: ${totalInserted}`);
      } catch (error) {
        console.error('[Error] Failed to insert final batch:', error.message);
      }
    }
    
    console.log('\n✅ OpenFDA Seeding Completed Successfully!');
    console.log(`-> Total Records Read from JSON: ${totalProcessed}`);
    console.log(`-> Total Records Inserted in DB (excluding duplicates): ${totalInserted}`);
    await prisma.$disconnect();
  });

  // Handle stream errors (e.g. malformed JSON, file reading issues)
  pipeline.on('error', async (error) => {
    console.error('\n❌ Stream Pipeline Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

// Execute
seed().catch(async (e) => {
  console.error("\n❌ Fatal Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
