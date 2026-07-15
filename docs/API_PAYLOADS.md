# API Payload Reference

Base response shape:

```json
{ "ok": true, "data": {} }
```

Error response shape:

```json
{ "ok": false, "error": { "code": "CODE", "message": "Message" } }
```

Mutating endpoints require an authenticated Supabase user with role `OWNER`.

## Receipt Flow

### `POST /api/receipts`

```json
{
  "receipt_date": "2026-07-15",
  "seller_id": "uuid",
  "photo_drive_url": "https://drive.google.com/drive/folders/example",
  "purchase_payment_proof_url": "https://drive.google.com/file/d/example/view",
  "unit": {
    "brand_id": "uuid",
    "model_id": "uuid",
    "storage_variant_id": "uuid",
    "color_id": "uuid",
    "imei_1": "123456789012345",
    "imei_2": "123456789012346",
    "purchase_price": 4500000,
    "purchase_transfer_fee": 10000,
    "imei_status": "ACTIVE",
    "icloud_status": "CLEAN",
    "photos": [
      {
        "photo_type": "FRONT",
        "drive_url": "https://drive.google.com/file/d/example/view",
        "is_primary": true
      }
    ]
  }
}
```

### `POST /api/receipts/{id}/inspection`

```json
{
  "results": [
    {
      "phone_unit_id": "uuid",
      "inspection_item_id": "uuid",
      "result_status": "OK",
      "notes": "Normal"
    }
  ]
}
```

### `POST /api/receipts/{id}/accept`

```json
{
  "purchase_account_id": "uuid",
  "purchase_payment_reference": "TRX-001",
  "purchase_payment_proof_url": "https://drive.google.com/file/d/example/view",
  "photo_drive_url": "https://drive.google.com/drive/folders/example",
  "audit_reason": "Checklist selesai"
}
```

### `POST /api/receipts/{id}/reject`

```json
{
  "rejection_reason_code": "FAILED_IMEI",
  "rejection_notes": "IMEI tidak aman"
}
```

## Unit Inventory

### `POST /api/units/{id}/costs`

```json
{
  "cost_category_id": "uuid",
  "cost_date": "2026-07-15",
  "description": "Ganti tempered glass",
  "amount": 50000,
  "payment_account_id": "uuid",
  "proof_url": "https://drive.google.com/file/d/example/view"
}
```

### `POST /api/units/{id}/prices`

```json
{
  "listing_price": 5400000,
  "minimum_price": 5100000,
  "reason": "Harga awal listing"
}
```

## Sales

### `POST /api/sales`

```json
{
  "sale_date": "2026-07-15",
  "customer_id": "uuid",
  "sales_channel_id": "uuid",
  "phone_unit_id": "uuid",
  "final_price": 5300000,
  "payment_method": "TRANSFER",
  "payment_account_id": "uuid",
  "payment_reference": "SALE-001",
  "payment_proof_url": "https://drive.google.com/file/d/example/view",
  "costs": [
    {
      "cost_category_id": "uuid",
      "description": "Transport COD",
      "amount": 25000,
      "payment_account_id": "uuid"
    }
  ]
}
```

### `POST /api/sales/{id}/complete`

```json
{
  "payment_account_id": "uuid",
  "payment_reference": "SALE-001",
  "payment_proof_url": "https://drive.google.com/file/d/example/view"
}
```

### `POST /api/sales/{id}/return`

```json
{
  "return_date": "2026-07-16",
  "target_stock_status": "IN_STOCK",
  "reason": "Pembeli batal",
  "refund_amount": 5300000,
  "refund_account_id": "uuid",
  "refund_reference": "REF-001",
  "refund_proof_url": "https://drive.google.com/file/d/example/view"
}
```

## Finance

### `POST /api/capital-contributions`

```json
{
  "contribution_date": "2026-07-15",
  "account_id": "uuid",
  "amount": 10000000,
  "reference": "CAP-001",
  "proof_url": "https://drive.google.com/file/d/example/view"
}
```

### `POST /api/owner-drawings`

```json
{
  "drawing_date": "2026-07-15",
  "account_id": "uuid",
  "amount": 500000,
  "reference": "DRAW-001",
  "proof_url": "https://drive.google.com/file/d/example/view"
}
```

### `POST /api/operating-expenses`

```json
{
  "expense_date": "2026-07-15",
  "payment_account_id": "uuid",
  "expense_account_id": "uuid",
  "description": "Internet bulanan",
  "amount": 350000,
  "proof_url": "https://drive.google.com/file/d/example/view"
}
```

### `POST /api/cash-adjustments`

```json
{
  "adjustment_date": "2026-07-15",
  "account_id": "uuid",
  "adjustment_type": "INCREASE",
  "amount": 100000,
  "reason": "Pembulatan saldo kas",
  "proof_url": "https://drive.google.com/file/d/example/view"
}
```

## Query Endpoints

- `GET /api/receipts`
- `GET /api/receipts/{id}`
- `GET /api/journals?include_lines=true`
- `GET /api/ledger`
- `GET /api/ledger/balances`
- `GET /api/reports/dashboard`
- `GET /api/reports/inventory`
- `GET /api/reports/unit-profitability`
- `GET /api/reports/profit-loss`
- `GET /api/reports/balance-sheet`
- `GET /api/reports/cash-flow`

## Supabase Types

Manual type file lives at `src/lib/supabase/database.types.ts` for now.

Later, generate it from the real database with Supabase CLI:

```bash
supabase gen types --linked --schema public > src/lib/supabase/database.types.ts
```

For local Supabase:

```bash
supabase gen types --local --schema public > src/lib/supabase/database.types.ts
```
