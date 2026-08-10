export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_colors: {
        Row: {
          id: string;
          name: string;
          hex_code: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          hex_code: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          hex_code?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          is_starting_price: boolean;
          image_url: string;
          is_personalizable: boolean;
          has_business_info: boolean;
          has_character_option: boolean;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          is_starting_price?: boolean;
          image_url: string;
          is_personalizable?: boolean;
          has_business_info?: boolean;
          has_character_option?: boolean;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string;
          price?: number;
          is_starting_price?: boolean;
          image_url?: string;
          is_personalizable?: boolean;
          has_business_info?: boolean;
          has_character_option?: boolean;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_bank_accounts: {
        Row: {
          id: string;
          client_id: string;
          bank_name: string;
          card_number: string | null;
          interbank_clabe: string;
          account_holder_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          bank_name: string;
          card_number?: string | null;
          interbank_clabe: string;
          account_holder_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          bank_name?: string;
          card_number?: string | null;
          interbank_clabe?: string;
          account_holder_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
