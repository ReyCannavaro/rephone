export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string;
          code: "SAMSUNG" | "APPLE" | "GOOGLE" | string;
          name: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          code: "SAMSUNG" | "APPLE" | "GOOGLE" | string;
          name: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          code?: "SAMSUNG" | "APPLE" | "GOOGLE" | string;
          name?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
