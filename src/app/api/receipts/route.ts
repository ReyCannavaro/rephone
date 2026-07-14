import { apiError, apiOk } from "@/lib/api/responses";
import {
  generateReceiptNumber,
  generateStockCode,
  getBoolean,
  getDateString,
  getNumber,
  getOptionalString,
  getReceiptStatus,
  getStockStatus,
  getString,
  isRecord,
  readJsonObject,
  validateHttpsUrl,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type UnitInsert = Database["public"]["Tables"]["phone_units"]["Insert"];
type ReceiptInsert = Database["public"]["Tables"]["unit_receipts"]["Insert"];
type AccessoryInsert = Database["public"]["Tables"]["unit_accessories"]["Insert"];
type PhotoInsert = Database["public"]["Tables"]["unit_photos"]["Insert"];
type ReceiptStatus = Database["public"]["Tables"]["unit_receipts"]["Row"]["status"];
type PhotoDriveUrlType = Database["public"]["Tables"]["unit_receipts"]["Row"]["photo_drive_url_type"];
type SimType = Database["public"]["Tables"]["phone_units"]["Row"]["sim_type"];

const receiptStatusFilters: ReceiptStatus[] = ["DRAFT", "INSPECTION", "ACCEPTED", "REJECTED"];
const photoDriveUrlTypes: NonNullable<PhotoDriveUrlType>[] = ["FOLDER", "ALBUM", "PHOTO"];
const simTypes: NonNullable<SimType>[] = ["SINGLE", "DUAL", "ESIM", "HYBRID"];

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const statusParam = getOptionalString(searchParams.get("status"));
  const status = receiptStatusFilters.includes(statusParam as ReceiptStatus)
    ? (statusParam as ReceiptStatus)
    : null;
  const q = getOptionalString(searchParams.get("q"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 100);

  let query = supabase
    .from("unit_receipts")
    .select(
      "id, receipt_number, receipt_date, seller_id, status, total_purchase_amount, total_direct_cost, total_unit_cost, photo_drive_url, created_at, updated_at",
    )
    .is("deleted_at", null)
    .order("receipt_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.ilike("receipt_number", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("RECEIPTS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const unit = isRecord(body.unit) ? body.unit : null;

  if (!unit) {
    return apiError("UNIT_REQUIRED", "Receipt creation requires a unit object.");
  }

  const receiptDate = getDateString(body.receipt_date);
  const sellerId = getString(body.seller_id);
  const brandId = getString(unit.brand_id);
  const modelId = getString(unit.model_id);
  const imei1 = getString(unit.imei_1);

  if (!receiptDate || !sellerId || !brandId || !modelId || !imei1) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "receipt_date, seller_id, unit.brand_id, unit.model_id, and unit.imei_1 are required.",
    );
  }

  const purchasePrice = getNumber(unit.purchase_price);
  const purchaseTransferFee = getNumber(unit.purchase_transfer_fee);
  const totalUnitCost = getNumber(unit.total_unit_cost, purchasePrice + purchaseTransferFee);
  const photoDriveUrl = getOptionalString(body.photo_drive_url) ?? getOptionalString(unit.photo_drive_url);
  const proofUrl = getOptionalString(body.purchase_payment_proof_url);
  const urlError =
    validateHttpsUrl(photoDriveUrl, "photo_drive_url") ??
    validateHttpsUrl(proofUrl, "purchase_payment_proof_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  const supabase = createSupabaseAdminClient();
  const duplicate = await supabase
    .from("phone_units")
    .select("id, stock_code")
    .eq("imei_1", imei1)
    .neq("stock_status", "REJECTED")
    .is("deleted_at", null)
    .maybeSingle();

  if (duplicate.error) {
    return apiError("IMEI_CHECK_FAILED", duplicate.error.message, 500);
  }

  if (duplicate.data) {
    return apiError(
      "DUPLICATE_IMEI",
      "IMEI 1 already exists on an active unit.",
      409,
      duplicate.data,
    );
  }

  const receiptPayload: ReceiptInsert = {
    receipt_number: getOptionalString(body.receipt_number) ?? generateReceiptNumber(),
    receipt_date: receiptDate,
    seller_id: sellerId,
    status: getReceiptStatus(body.status),
    purchase_account_id: getOptionalString(body.purchase_account_id),
    purchase_payment_reference: getOptionalString(body.purchase_payment_reference),
    purchase_payment_proof_url: proofUrl,
    purchase_payment_proof_filename: getOptionalString(body.purchase_payment_proof_filename),
    purchase_payment_proof_recorded_at: getOptionalString(body.purchase_payment_proof_recorded_at),
    photo_drive_url: photoDriveUrl,
    photo_drive_url_type: parsePhotoDriveUrlType(body.photo_drive_url_type),
    total_purchase_amount: purchasePrice,
    total_direct_cost: purchaseTransferFee,
    total_unit_cost: totalUnitCost,
    notes: getOptionalString(body.notes),
  };

  const { data: receipt, error: receiptError } = await supabase
    .from("unit_receipts")
    .insert(receiptPayload)
    .select()
    .single();

  if (receiptError) {
    return apiError("RECEIPT_CREATE_FAILED", receiptError.message, 500);
  }

  const unitPayload: UnitInsert = {
    receipt_id: receipt.id,
    stock_code: getOptionalString(unit.stock_code) ?? generateStockCode(),
    stock_status: getStockStatus(unit.stock_status, receiptPayload.status === "INSPECTION" ? "INSPECTION" : "DRAFT"),
    brand_id: brandId,
    model_id: modelId,
    storage_variant_id: getOptionalString(unit.storage_variant_id),
    color_id: getOptionalString(unit.color_id),
    physical_condition_id: getOptionalString(unit.physical_condition_id),
    imei_1: imei1,
    imei_2: getOptionalString(unit.imei_2),
    serial_number: getOptionalString(unit.serial_number),
    sim_type: parseSimType(unit.sim_type),
    battery_health:
      typeof unit.battery_health === "number" ? getNumber(unit.battery_health) : null,
    cycle_count: typeof unit.cycle_count === "number" ? getNumber(unit.cycle_count) : null,
    icloud_status: getOptionalString(unit.icloud_status),
    google_account_status: getOptionalString(unit.google_account_status),
    find_my_status: getOptionalString(unit.find_my_status),
    imei_status: getOptionalString(unit.imei_status),
    mdm_status: getOptionalString(unit.mdm_status),
    purchase_price: purchasePrice,
    purchase_transfer_fee: purchaseTransferFee,
    total_unit_cost: totalUnitCost,
    current_listing_price:
      typeof unit.current_listing_price === "number" ? getNumber(unit.current_listing_price) : null,
    minimum_price: typeof unit.minimum_price === "number" ? getNumber(unit.minimum_price) : null,
    minus_notes: getOptionalString(unit.minus_notes),
    internal_notes: getOptionalString(unit.internal_notes),
    photo_drive_url: photoDriveUrl,
    acquired_at: receiptDate,
    notes: getOptionalString(unit.notes),
  };

  const { data: createdUnit, error: unitError } = await supabase
    .from("phone_units")
    .insert(unitPayload)
    .select()
    .single();

  if (unitError) {
    await supabase.from("unit_receipts").update({ deleted_at: new Date().toISOString() }).eq("id", receipt.id);
    return apiError("UNIT_CREATE_FAILED", unitError.message, 500);
  }

  const accessories = Array.isArray(unit.accessories) ? unit.accessories : [];
  const accessoryRows = accessories
    .filter(isRecord)
    .map((accessory): AccessoryInsert | null => {
      const accessoryTypeId = getString(accessory.accessory_type_id);
      if (!accessoryTypeId) {
        return null;
      }

      return {
        phone_unit_id: createdUnit.id,
        accessory_type_id: accessoryTypeId,
        is_included: getBoolean(accessory.is_included, true),
        condition_notes: getOptionalString(accessory.condition_notes),
      };
    })
    .filter((row): row is AccessoryInsert => row !== null);

  if (accessoryRows.length > 0) {
    const { error } = await supabase.from("unit_accessories").insert(accessoryRows);
    if (error) {
      return apiError("ACCESSORIES_CREATE_FAILED", error.message, 500);
    }
  }

  const photos = Array.isArray(unit.photos) ? unit.photos : [];
  const photoRows = photos
    .filter(isRecord)
    .map((photo, index): PhotoInsert | null => {
      const driveUrl = getString(photo.drive_url);
      if (!driveUrl) {
        return null;
      }

      return {
        phone_unit_id: createdUnit.id,
        photo_type: (getOptionalString(photo.photo_type) ?? "OTHER") as PhotoInsert["photo_type"],
        drive_url: driveUrl,
        file_name: getOptionalString(photo.file_name),
        sort_order: getNumber(photo.sort_order, index + 1),
        is_primary: getBoolean(photo.is_primary, index === 0),
        notes: getOptionalString(photo.notes),
      };
    })
    .filter((row): row is PhotoInsert => row !== null);

  const invalidPhotoUrl = photoRows
    .map((photo) => validateHttpsUrl(photo.drive_url, "unit.photos[].drive_url"))
    .find(Boolean);

  if (invalidPhotoUrl) {
    return apiError("INVALID_PHOTO_URL", invalidPhotoUrl);
  }

  if (photoRows.length > 0) {
    const { error } = await supabase.from("unit_photos").insert(photoRows);
    if (error) {
      return apiError("PHOTOS_CREATE_FAILED", error.message, 500);
    }
  }

  return apiOk({ receipt, unit: createdUnit }, { status: 201 });
}

function parsePhotoDriveUrlType(value: unknown): PhotoDriveUrlType {
  const text = getOptionalString(value);
  return photoDriveUrlTypes.includes(text as NonNullable<PhotoDriveUrlType>)
    ? (text as NonNullable<PhotoDriveUrlType>)
    : "FOLDER";
}

function parseSimType(value: unknown): SimType {
  const text = getOptionalString(value);
  return simTypes.includes(text as NonNullable<SimType>) ? (text as NonNullable<SimType>) : null;
}
