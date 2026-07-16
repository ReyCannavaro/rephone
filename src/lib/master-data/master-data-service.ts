import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BrandReference = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type PhoneModelReference = {
  id: string;
  brand_id: string;
  brand_name: string;
  model_code: string;
  model_name: string;
  series_name: string | null;
  release_year: number | null;
  default_sim_type: string | null;
  default_os: string | null;
  is_active: boolean;
};

export type StorageVariantReference = {
  id: string;
  capacity_gb: number;
  label: string;
  is_active: boolean;
  sort_order: number;
};

export type ColorReference = {
  id: string;
  brand_id: string | null;
  brand_name: string;
  name: string;
  hex_code: string | null;
  is_active: boolean;
  sort_order: number;
};

export type AccountReference = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  normal_balance: string;
  allow_manual_entry: boolean;
  is_cash_account: boolean;
  is_active: boolean;
  sort_order: number;
};

export type SalesChannelReference = {
  id: string;
  code: string;
  name: string;
  default_fee_type: string;
  default_fee_value: number;
  is_active: boolean;
  sort_order: number;
};

export type CostCategoryReference = {
  id: string;
  code: string;
  name: string;
  scope: string;
  expense_account_id: string | null;
  expense_account_name: string | null;
  inventory_account_id: string | null;
  inventory_account_name: string | null;
  is_active: boolean;
  sort_order: number;
};

export type MasterDataReference = {
  brands: BrandReference[];
  models: PhoneModelReference[];
  storageVariants: StorageVariantReference[];
  colors: ColorReference[];
  accounts: AccountReference[];
  salesChannels: SalesChannelReference[];
  costCategories: CostCategoryReference[];
};

export async function getMasterDataReference(): Promise<MasterDataReference> {
  const supabase = createSupabaseAdminClient();

  const [
    brandsResult,
    modelsResult,
    storageResult,
    colorsResult,
    accountsResult,
    salesChannelsResult,
    costCategoriesResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("id, code, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("phone_models")
      .select(
        "id, brand_id, model_code, model_name, series_name, release_year, default_sim_type, default_os, is_active",
      )
      .eq("is_active", true)
      .order("model_name", { ascending: true }),
    supabase
      .from("storage_variants")
      .select("id, capacity_gb, label, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("colors")
      .select("id, brand_id, name, hex_code, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("accounts")
      .select(
        "id, account_code, account_name, account_type, account_subtype, normal_balance, allow_manual_entry, is_cash_account, is_active, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("sales_channels")
      .select("id, code, name, default_fee_type, default_fee_value, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("cost_categories")
      .select("id, code, name, scope, expense_account_id, inventory_account_id, is_active, sort_order")
      .eq("is_active", true)
      .order("scope", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);

  const failure = [
    brandsResult,
    modelsResult,
    storageResult,
    colorsResult,
    accountsResult,
    salesChannelsResult,
    costCategoriesResult,
  ].find((result) => result.error);

  if (failure?.error) {
    throw new Error(failure.error.message);
  }

  const brands = brandsResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));
  const accountNames = new Map(
    accounts.map((account) => [
      account.id,
      `${account.account_code} - ${account.account_name}`,
    ]),
  );

  return {
    brands,
    models: (modelsResult.data ?? []).map((model) => ({
      ...model,
      brand_name: brandNames.get(model.brand_id) ?? "-",
    })),
    storageVariants: storageResult.data ?? [],
    colors: (colorsResult.data ?? []).map((color) => ({
      ...color,
      brand_name: color.brand_id ? brandNames.get(color.brand_id) ?? "-" : "Universal",
    })),
    accounts,
    salesChannels: (salesChannelsResult.data ?? []).map((channel) => ({
      ...channel,
      default_fee_value: Number(channel.default_fee_value),
    })),
    costCategories: (costCategoriesResult.data ?? []).map((category) => ({
      ...category,
      expense_account_name: category.expense_account_id
        ? accountNames.get(category.expense_account_id) ?? null
        : null,
      inventory_account_name: category.inventory_account_id
        ? accountNames.get(category.inventory_account_id) ?? null
        : null,
    })),
  };
}
