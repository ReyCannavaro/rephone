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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
