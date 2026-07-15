export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type BaseMasterRow = {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BaseMasterInsert = {
  id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type BaseMasterUpdate = {
  id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type BaseTransactionRow = {
  id: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

type BaseTransactionInsert = {
  id?: string;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  version?: number;
  created_at?: string;
  updated_at?: string;
};

type ReceiptStatus = "DRAFT" | "INSPECTION" | "ACCEPTED" | "REJECTED";
type StockStatus =
  | "DRAFT"
  | "INSPECTION"
  | "REJECTED"
  | "IN_STOCK"
  | "RESERVED"
  | "SOLD"
  | "RETURNED"
  | "SERVICE"
  | "DAMAGED"
  | "LOST"
  | "WRITTEN_OFF";
type SimType = "SINGLE" | "DUAL" | "ESIM" | "HYBRID";
type PhotoDriveUrlType = "FOLDER" | "ALBUM" | "PHOTO";
type InspectionResultStatus = "OK" | "MINOR" | "ISSUE" | "FAILED" | "UNKNOWN" | "NOT_APPLICABLE";
type UnitPhotoType =
  | "FRONT"
  | "BACK"
  | "LEFT_FRAME"
  | "RIGHT_FRAME"
  | "SCREEN"
  | "IMEI"
  | "ACCESSORIES"
  | "DEFECT"
  | "PAYMENT_PROOF"
  | "OTHER";
type SaleStatus = "DRAFT" | "COMPLETED" | "CANCELLED" | "RETURNED";
type SalePaymentMethod = "CASH" | "TRANSFER" | "MARKETPLACE" | "OTHER";
type SaleReturnStatus = "COMPLETED" | "CANCELLED";
type SaleReturnTargetStockStatus = "IN_STOCK" | "SERVICE" | "DAMAGED";
type JournalStatus = "DRAFT" | "POSTED" | "REVERSED";
type AuditAction = "CREATE" | "UPDATE" | "ACCEPT" | "REJECT" | "SALE" | "REVERSAL";
type JournalSourceModule =
  | "RECEIPT"
  | "UNIT_COST"
  | "SALE"
  | "SALE_RETURN"
  | "CAPITAL"
  | "OWNER_DRAWING"
  | "OPERATING_EXPENSE"
  | "CASH_ADJUSTMENT"
  | "MANUAL";

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      brands: Table<
        BaseMasterRow & {
          code: "SAMSUNG" | "APPLE" | "GOOGLE" | string;
          name: string;
          sort_order: number;
        },
        BaseMasterInsert & {
          code: "SAMSUNG" | "APPLE" | "GOOGLE" | string;
          name: string;
          sort_order?: number;
        },
        BaseMasterUpdate & {
          code?: "SAMSUNG" | "APPLE" | "GOOGLE" | string;
          name?: string;
          sort_order?: number;
        }
      >;
      phone_models: Table<
        BaseMasterRow & {
          brand_id: string;
          model_code: string;
          model_name: string;
          series_name: string | null;
          release_year: number | null;
          default_sim_type: "SINGLE" | "DUAL" | "ESIM" | "HYBRID" | null;
          default_os: string | null;
        },
        BaseMasterInsert & {
          brand_id: string;
          model_code: string;
          model_name: string;
          series_name?: string | null;
          release_year?: number | null;
          default_sim_type?: "SINGLE" | "DUAL" | "ESIM" | "HYBRID" | null;
          default_os?: string | null;
        }
      >;
      storage_variants: Table<
        BaseMasterRow & {
          capacity_gb: number;
          label: string;
          sort_order: number;
        },
        BaseMasterInsert & {
          capacity_gb: number;
          label: string;
          sort_order?: number;
        }
      >;
      colors: Table<
        BaseMasterRow & {
          brand_id: string | null;
          name: string;
          hex_code: string | null;
          sort_order: number;
        },
        BaseMasterInsert & {
          brand_id?: string | null;
          name: string;
          hex_code?: string | null;
          sort_order?: number;
        }
      >;
      physical_conditions: Table<
        BaseMasterRow & {
          code: string;
          name: string;
          score_min: number | null;
          score_max: number | null;
          description: string | null;
          sort_order: number;
        },
        BaseMasterInsert & {
          code: string;
          name: string;
          score_min?: number | null;
          score_max?: number | null;
          description?: string | null;
          sort_order?: number;
        }
      >;
      accessory_types: Table<
        BaseMasterRow & {
          code: string;
          name: string;
          sort_order: number;
        },
        BaseMasterInsert & {
          code: string;
          name: string;
          sort_order?: number;
        }
      >;
      inspection_items: Table<
        BaseMasterRow & {
          code: string;
          category: "PHYSICAL" | "FUNCTION" | "SECURITY" | "NETWORK" | "BATTERY";
          name: string;
          input_type: "STATUS" | "BOOLEAN" | "NUMBER" | "TEXT";
          unit_label: string | null;
          is_required: boolean;
          applies_to_brand_id: string | null;
          sort_order: number;
        },
        BaseMasterInsert & {
          code: string;
          category: "PHYSICAL" | "FUNCTION" | "SECURITY" | "NETWORK" | "BATTERY";
          name: string;
          input_type: "STATUS" | "BOOLEAN" | "NUMBER" | "TEXT";
          unit_label?: string | null;
          is_required?: boolean;
          applies_to_brand_id?: string | null;
          sort_order?: number;
        }
      >;
      sellers: Table<
        BaseMasterRow & {
          seller_code: string;
          name: string;
          phone: string | null;
          identity_number: string | null;
          city: string | null;
          address: string | null;
          source_channel: string | null;
          risk_flag: boolean;
          risk_notes: string | null;
        },
        BaseMasterInsert & {
          seller_code: string;
          name: string;
          phone?: string | null;
          identity_number?: string | null;
          city?: string | null;
          address?: string | null;
          source_channel?: string | null;
          risk_flag?: boolean;
          risk_notes?: string | null;
        }
      >;
      customers: Table<
        BaseMasterRow & {
          customer_code: string;
          name: string;
          phone: string | null;
          city: string | null;
          address: string | null;
          is_repeat_customer: boolean;
          is_blocked: boolean;
          blocked_reason: string | null;
        },
        BaseMasterInsert & {
          customer_code: string;
          name: string;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          is_repeat_customer?: boolean;
          is_blocked?: boolean;
          blocked_reason?: string | null;
        }
      >;
      accounts: Table<
        BaseMasterRow & {
          account_code: string;
          account_name: string;
          account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "COGS" | "EXPENSE";
          account_subtype: string;
          parent_id: string | null;
          normal_balance: "DEBIT" | "CREDIT";
          allow_manual_entry: boolean;
          is_cash_account: boolean;
          sort_order: number;
        },
        BaseMasterInsert & {
          account_code: string;
          account_name: string;
          account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "COGS" | "EXPENSE";
          account_subtype: string;
          parent_id?: string | null;
          normal_balance: "DEBIT" | "CREDIT";
          allow_manual_entry?: boolean;
          is_cash_account?: boolean;
          sort_order?: number;
        }
      >;
      bank_accounts: Table<
        BaseMasterRow & {
          account_id: string;
          bank_name: string;
          account_number_masked: string | null;
          account_holder: string;
          opening_balance: number;
          is_default_purchase: boolean;
          is_default_sales: boolean;
        },
        BaseMasterInsert & {
          account_id: string;
          bank_name: string;
          account_number_masked?: string | null;
          account_holder: string;
          opening_balance?: number;
          is_default_purchase?: boolean;
          is_default_sales?: boolean;
        }
      >;
      sales_channels: Table<
        BaseMasterRow & {
          code: string;
          name: string;
          default_fee_type: "NONE" | "FIXED" | "PERCENTAGE";
          default_fee_value: number;
          sort_order: number;
        },
        BaseMasterInsert & {
          code: string;
          name: string;
          default_fee_type?: "NONE" | "FIXED" | "PERCENTAGE";
          default_fee_value?: number;
          sort_order?: number;
        }
      >;
      cost_categories: Table<
        BaseMasterRow & {
          code: string;
          name: string;
          scope: "UNIT" | "OPERATING" | "SALES";
          expense_account_id: string | null;
          inventory_account_id: string | null;
          sort_order: number;
        },
        BaseMasterInsert & {
          code: string;
          name: string;
          scope: "UNIT" | "OPERATING" | "SALES";
          expense_account_id?: string | null;
          inventory_account_id?: string | null;
          sort_order?: number;
        }
      >;
      unit_receipts: Table<
        BaseTransactionRow & {
          receipt_number: string;
          receipt_date: string;
          seller_id: string;
          status: ReceiptStatus;
          decision_at: string | null;
          rejection_reason_code: string | null;
          rejection_notes: string | null;
          purchase_account_id: string | null;
          purchase_payment_reference: string | null;
          purchase_payment_proof_url: string | null;
          purchase_payment_proof_filename: string | null;
          purchase_payment_proof_recorded_at: string | null;
          photo_drive_url: string | null;
          photo_drive_url_type: PhotoDriveUrlType | null;
          total_purchase_amount: number;
          total_direct_cost: number;
          total_unit_cost: number;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          receipt_number: string;
          receipt_date: string;
          seller_id: string;
          status?: ReceiptStatus;
          decision_at?: string | null;
          rejection_reason_code?: string | null;
          rejection_notes?: string | null;
          purchase_account_id?: string | null;
          purchase_payment_reference?: string | null;
          purchase_payment_proof_url?: string | null;
          purchase_payment_proof_filename?: string | null;
          purchase_payment_proof_recorded_at?: string | null;
          photo_drive_url?: string | null;
          photo_drive_url_type?: PhotoDriveUrlType | null;
          total_purchase_amount?: number;
          total_direct_cost?: number;
          total_unit_cost?: number;
          journal_entry_id?: string | null;
        }
      >;
      phone_units: Table<
        BaseTransactionRow & {
          receipt_id: string | null;
          stock_code: string;
          stock_status: StockStatus;
          brand_id: string;
          model_id: string;
          storage_variant_id: string | null;
          color_id: string | null;
          physical_condition_id: string | null;
          imei_1: string;
          imei_2: string | null;
          serial_number: string | null;
          sim_type: SimType | null;
          battery_health: number | null;
          cycle_count: number | null;
          icloud_status: string | null;
          google_account_status: string | null;
          find_my_status: string | null;
          imei_status: string | null;
          mdm_status: string | null;
          purchase_price: number;
          purchase_transfer_fee: number;
          total_unit_cost: number;
          current_listing_price: number | null;
          minimum_price: number | null;
          minus_notes: string | null;
          internal_notes: string | null;
          photo_drive_url: string | null;
          acquired_at: string | null;
          sold_at: string | null;
        },
        BaseTransactionInsert & {
          receipt_id?: string | null;
          stock_code: string;
          stock_status?: StockStatus;
          brand_id: string;
          model_id: string;
          storage_variant_id?: string | null;
          color_id?: string | null;
          physical_condition_id?: string | null;
          imei_1: string;
          imei_2?: string | null;
          serial_number?: string | null;
          sim_type?: SimType | null;
          battery_health?: number | null;
          cycle_count?: number | null;
          icloud_status?: string | null;
          google_account_status?: string | null;
          find_my_status?: string | null;
          imei_status?: string | null;
          mdm_status?: string | null;
          purchase_price?: number;
          purchase_transfer_fee?: number;
          total_unit_cost?: number;
          current_listing_price?: number | null;
          minimum_price?: number | null;
          minus_notes?: string | null;
          internal_notes?: string | null;
          photo_drive_url?: string | null;
          acquired_at?: string | null;
          sold_at?: string | null;
        }
      >;
      unit_inspection_results: Table<
        BaseTransactionRow & {
          receipt_id: string;
          phone_unit_id: string;
          inspection_item_id: string;
          result_status: InspectionResultStatus | null;
          boolean_value: boolean | null;
          number_value: number | null;
          text_value: string | null;
        },
        BaseTransactionInsert & {
          receipt_id: string;
          phone_unit_id: string;
          inspection_item_id: string;
          result_status?: InspectionResultStatus | null;
          boolean_value?: boolean | null;
          number_value?: number | null;
          text_value?: string | null;
        }
      >;
      unit_accessories: Table<
        BaseTransactionRow & {
          phone_unit_id: string;
          accessory_type_id: string;
          is_included: boolean;
          condition_notes: string | null;
        },
        BaseTransactionInsert & {
          phone_unit_id: string;
          accessory_type_id: string;
          is_included?: boolean;
          condition_notes?: string | null;
        }
      >;
      unit_photos: Table<
        BaseTransactionRow & {
          phone_unit_id: string;
          photo_type: UnitPhotoType;
          drive_url: string;
          file_name: string | null;
          sort_order: number;
          is_primary: boolean;
        },
        BaseTransactionInsert & {
          phone_unit_id: string;
          photo_type: UnitPhotoType;
          drive_url: string;
          file_name?: string | null;
          sort_order?: number;
          is_primary?: boolean;
        }
      >;
      unit_costs: Table<
        BaseTransactionRow & {
          cost_number: string;
          phone_unit_id: string;
          cost_category_id: string;
          cost_date: string;
          description: string;
          amount: number;
          payment_account_id: string | null;
          is_paid: boolean;
          proof_url: string | null;
          proof_filename: string | null;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          cost_number: string;
          phone_unit_id: string;
          cost_category_id: string;
          cost_date: string;
          description: string;
          amount: number;
          payment_account_id?: string | null;
          is_paid?: boolean;
          proof_url?: string | null;
          proof_filename?: string | null;
          journal_entry_id?: string | null;
        }
      >;
      unit_price_histories: Table<
        BaseTransactionRow & {
          phone_unit_id: string;
          listing_price: number;
          minimum_price: number;
          estimated_profit_at_listing: number;
          estimated_profit_at_minimum: number;
          reason: string | null;
          effective_at: string;
        },
        BaseTransactionInsert & {
          phone_unit_id: string;
          listing_price: number;
          minimum_price: number;
          estimated_profit_at_listing: number;
          estimated_profit_at_minimum: number;
          reason?: string | null;
          effective_at?: string;
        }
      >;
      sales: Table<
        BaseTransactionRow & {
          sale_number: string;
          sale_date: string;
          customer_id: string;
          sales_channel_id: string | null;
          status: SaleStatus;
          payment_account_id: string | null;
          payment_method: SalePaymentMethod | null;
          payment_reference: string | null;
          payment_proof_url: string | null;
          payment_proof_filename: string | null;
          payment_proof_recorded_at: string | null;
          completed_at: string | null;
          subtotal_amount: number;
          total_sales_cost: number;
          total_net_amount: number;
          total_cogs_amount: number;
          total_profit_amount: number;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          sale_number: string;
          sale_date: string;
          customer_id: string;
          sales_channel_id?: string | null;
          status?: SaleStatus;
          payment_account_id?: string | null;
          payment_method?: SalePaymentMethod | null;
          payment_reference?: string | null;
          payment_proof_url?: string | null;
          payment_proof_filename?: string | null;
          payment_proof_recorded_at?: string | null;
          completed_at?: string | null;
          subtotal_amount?: number;
          total_sales_cost?: number;
          total_net_amount?: number;
          total_cogs_amount?: number;
          total_profit_amount?: number;
          journal_entry_id?: string | null;
        }
      >;
      sale_items: Table<
        BaseTransactionRow & {
          sale_id: string;
          phone_unit_id: string;
          listing_price: number | null;
          minimum_price: number | null;
          final_price: number;
          unit_cost: number;
          sales_cost_amount: number;
          net_amount: number;
          profit_amount: number;
        },
        BaseTransactionInsert & {
          sale_id: string;
          phone_unit_id: string;
          listing_price?: number | null;
          minimum_price?: number | null;
          final_price: number;
          unit_cost: number;
          sales_cost_amount?: number;
          net_amount: number;
          profit_amount: number;
        }
      >;
      sale_costs: Table<
        BaseTransactionRow & {
          sale_id: string;
          sale_item_id: string | null;
          cost_category_id: string;
          description: string;
          amount: number;
          payment_account_id: string | null;
        },
        BaseTransactionInsert & {
          sale_id: string;
          sale_item_id?: string | null;
          cost_category_id: string;
          description: string;
          amount: number;
          payment_account_id?: string | null;
        }
      >;
      sale_returns: Table<
        BaseTransactionRow & {
          return_number: string;
          sale_id: string;
          return_date: string;
          status: SaleReturnStatus;
          target_stock_status: SaleReturnTargetStockStatus;
          return_reason_code: string | null;
          return_notes: string | null;
          refund_amount: number;
          refund_account_id: string | null;
          refund_reference: string | null;
          refund_proof_url: string | null;
          refund_proof_filename: string | null;
          refund_recorded_at: string | null;
          reversed_sale_journal_entry_id: string | null;
          journal_entry_id: string | null;
          completed_at: string | null;
        },
        BaseTransactionInsert & {
          return_number: string;
          sale_id: string;
          return_date: string;
          status?: SaleReturnStatus;
          target_stock_status: SaleReturnTargetStockStatus;
          return_reason_code?: string | null;
          return_notes?: string | null;
          refund_amount?: number;
          refund_account_id?: string | null;
          refund_reference?: string | null;
          refund_proof_url?: string | null;
          refund_proof_filename?: string | null;
          refund_recorded_at?: string | null;
          reversed_sale_journal_entry_id?: string | null;
          journal_entry_id?: string | null;
          completed_at?: string | null;
        }
      >;
      capital_contributions: Table<
        BaseTransactionRow & {
          contribution_number: string;
          contribution_date: string;
          account_id: string;
          amount: number;
          reference: string | null;
          proof_url: string | null;
          proof_filename: string | null;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          contribution_number: string;
          contribution_date: string;
          account_id: string;
          amount: number;
          reference?: string | null;
          proof_url?: string | null;
          proof_filename?: string | null;
          journal_entry_id?: string | null;
        }
      >;
      owner_drawings: Table<
        BaseTransactionRow & {
          drawing_number: string;
          drawing_date: string;
          account_id: string;
          amount: number;
          reference: string | null;
          proof_url: string | null;
          proof_filename: string | null;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          drawing_number: string;
          drawing_date: string;
          account_id: string;
          amount: number;
          reference?: string | null;
          proof_url?: string | null;
          proof_filename?: string | null;
          journal_entry_id?: string | null;
        }
      >;
      operating_expenses: Table<
        BaseTransactionRow & {
          expense_number: string;
          expense_date: string;
          cost_category_id: string | null;
          expense_account_id: string;
          payment_account_id: string;
          description: string;
          amount: number;
          reference: string | null;
          proof_url: string | null;
          proof_filename: string | null;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          expense_number: string;
          expense_date: string;
          cost_category_id?: string | null;
          expense_account_id: string;
          payment_account_id: string;
          description: string;
          amount: number;
          reference?: string | null;
          proof_url?: string | null;
          proof_filename?: string | null;
          journal_entry_id?: string | null;
        }
      >;
      cash_adjustments: Table<
        BaseTransactionRow & {
          adjustment_number: string;
          adjustment_date: string;
          account_id: string;
          adjustment_type: "INCREASE" | "DECREASE";
          amount: number;
          reason: string;
          offset_account_id: string | null;
          reference: string | null;
          proof_url: string | null;
          proof_filename: string | null;
          journal_entry_id: string | null;
        },
        BaseTransactionInsert & {
          adjustment_number: string;
          adjustment_date: string;
          account_id: string;
          adjustment_type: "INCREASE" | "DECREASE";
          amount: number;
          reason: string;
          offset_account_id?: string | null;
          reference?: string | null;
          proof_url?: string | null;
          proof_filename?: string | null;
          journal_entry_id?: string | null;
        }
      >;
      journal_entries: Table<
        BaseTransactionRow & {
          journal_number: string;
          transaction_date: string;
          source_module: JournalSourceModule;
          source_id: string;
          description: string;
          status: JournalStatus;
          total_debit: number;
          total_credit: number;
          posted_at: string | null;
          reversed_entry_id: string | null;
        },
        BaseTransactionInsert & {
          journal_number: string;
          transaction_date: string;
          source_module: JournalSourceModule;
          source_id: string;
          description: string;
          status?: JournalStatus;
          total_debit?: number;
          total_credit?: number;
          posted_at?: string | null;
          reversed_entry_id?: string | null;
        }
      >;
      journal_lines: Table<
        BaseTransactionRow & {
          journal_entry_id: string;
          account_id: string;
          description: string | null;
          debit: number;
          credit: number;
          phone_unit_id: string | null;
          seller_id: string | null;
          customer_id: string | null;
        },
        BaseTransactionInsert & {
          journal_entry_id: string;
          account_id: string;
          description?: string | null;
          debit?: number;
          credit?: number;
          phone_unit_id?: string | null;
          seller_id?: string | null;
          customer_id?: string | null;
        }
      >;
      audit_logs: Table<
        {
          id: string;
          event_time: string;
          action: AuditAction;
          entity_table: string;
          entity_id: string | null;
          actor_user_id: string | null;
          actor_email: string | null;
          actor_role: string | null;
          reason: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json | null;
          request_path: string | null;
          request_method: string | null;
          created_at: string;
        },
        {
          id?: string;
          event_time?: string;
          action: AuditAction;
          entity_table: string;
          entity_id?: string | null;
          actor_user_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          reason?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          request_path?: string | null;
          request_method?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      rpc_accept_receipt: {
        Args: {
          p_receipt_id: string;
          p_purchase_account_id: string;
          p_purchase_payment_reference: string;
          p_purchase_payment_proof_url: string;
          p_purchase_payment_proof_filename: string | null;
          p_purchase_payment_proof_recorded_at: string | null;
          p_photo_drive_url: string;
        };
        Returns: Json;
      };
      rpc_add_unit_cost: {
        Args: {
          p_phone_unit_id: string;
          p_cost: Json;
          p_inventory_account_id: string;
        };
        Returns: Json;
      };
      rpc_complete_sale: {
        Args: {
          p_sale_id: string;
          p_sale_update: Json;
          p_unit_ids: string[];
          p_journal_lines: Json;
        };
        Returns: Json;
      };
      rpc_return_sale: {
        Args: {
          p_sale_id: string;
          p_sale_return: Json;
          p_unit_ids: string[];
          p_target_stock_status: string;
          p_reversal_lines: Json;
          p_reversed_journal_entry_id: string;
        };
        Returns: Json;
      };
      rpc_create_operating_expense: {
        Args: {
          p_expense: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
