import { NextRequest, NextResponse } from "next/server";
import { PDF2JSONService } from "@/services/pdf2jsonService";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const fields = await PDF2JSONService.detectFieldsFromPDF(buffer);

    return NextResponse.json({
      success: true,
      message: "PDF parsed",
      data: {
        documentId: "temp-id",
        filename: file.name,
        size: file.size,
        fields,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
