// Gula PMS - Next.js Excel Import Route Handler (v2) - Updated: 2023-10-27
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let pharmacyId = formData.get("pharmacyId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "الرجاء اختيار ملف Excel أولاً" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet) as Record<string, any>[];

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "ملف Excel فارغ أو غير صالح" }, { status: 400 });
    }

    // Decode token from header if pharmacyId not in formData
    if (!pharmacyId) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const base64Url = token.split(".")[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
            const decoded = JSON.parse(jsonPayload);
            if (decoded?.pharmacyId) {
              pharmacyId = decoded.pharmacyId;
            }
          }
        } catch { /* fallback */ }
      }
    }

    if (!pharmacyId) {
      const pharmacy = await prisma.pharmacy.findFirst();
      if (!pharmacy) {
        return NextResponse.json({ error: "لم يتم العثور على أي صيدلية مسجلة في قاعدة البيانات" }, { status: 400 });
      }
      pharmacyId = pharmacy.id;
    }

    const validRecords = [];
    for (const row of data) {
      const tradeName = String(row["TRADE NAME"] || row["Trade Name"] || "").trim();
      if (!tradeName) continue;

      const scientificName = String(row["SCIENTIFIC  NAME"] || row["SCIENTIFIC NAME"] || "").trim();
      const manufacturer = String(row["Authorization holder (Manufacturer)"] || row["Manufacturer"] || "").trim();
      const country = String(row["NATIONALITY OF THE MANUFACTURER)"] || row["NATIONALITY OF THE MANUFACTURER"] || "").trim();
      const dosageForm = String(row["PACKAGING & DOSAGE FORM"] || row["Dosage Form"] || "").trim();
      const nationalCode = String(row["N.code"] || row["N.Code"] || "").trim();

      validRecords.push({
        id: crypto.randomUUID(),
        pharmacyId: pharmacyId!,
        tradeName,
        scientificName: scientificName || null,
        manufacturer: manufacturer || null,
        country: country || null,
        dosageForm: dosageForm || null,
        nationalCode: nationalCode || null,
        barcode: null, // Nullable barcode as required
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على صفوف أدوية صالحة في الملف" }, { status: 400 });
    }

    // Chunk insertion in batches of 200 to prevent SQLite parameter limit crash (5200+ records)
    const BATCH_SIZE = 200;
    let importedCount = 0;

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const result = await prisma.medicine.createMany({
        data: batch,
      });
      importedCount += result.count;
    }

    revalidatePath("/inventory");
    revalidatePath("/pos");

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${importedCount} دواء بنجاح في قاعدة البيانات`,
      count: importedCount,
    });
  } catch (error: any) {
    console.error("[Next.js Import API Error]:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ غير متوقع أثناء معالجة الملف" }, { status: 500 });
  }
}
