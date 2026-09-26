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
          slug: string | null;
          description: string | null;
          headline: string | null;
          show_on_home: boolean;
          home_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_order?: number;
          slug?: string | null;
          description?: string | null;
          headline?: string | null;
          show_on_home?: boolean;
          home_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_order?: number;
          slug?: string | null;
          description?: string | null;
          headline?: string | null;
          show_on_home?: boolean;
          home_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          title: string;
          image_url: string;
          mobile_image_url: string | null;
          link_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          image_url: string;
          mobile_image_url?: string | null;
          link_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          image_url?: string;
          mobile_image_url?: string | null;
          link_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      banner_placements: {
        Row: {
          id: string;
          banner_id: string;
          placement: 'home' | 'catalog' | 'home_category' | 'category_page';
          category_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          banner_id: string;
          placement: 'home' | 'catalog' | 'home_category' | 'category_page';
          category_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          banner_id?: string;
          placement?: 'home' | 'catalog' | 'home_category' | 'category_page';
          category_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "banner_placements_banner_id_fkey";
            columns: ["banner_id"];
            isOneToOne: false;
            referencedRelation: "banners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "banner_placements_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      product_subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          }
        ];
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
          // Costo de fabricación, admin-only — el catálogo público nunca lo selecciona.
          cost: number | null;
          // Texto libre legado (schema_catalog_v3); ya no se usa, ver subcategory_id.
          subcategory: string | null;
          subcategory_id: string | null;
          is_starting_price: boolean;
          image_url: string;
          is_personalizable: boolean;
          has_business_info: boolean;
          has_character_option: boolean;
          is_active: boolean;
          // Destacados del inicio: carruseles Tendencia / Novedades / Promociones.
          is_trending: boolean;
          is_new: boolean;
          is_promo: boolean;
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
          cost?: number | null;
          subcategory?: string | null;
          subcategory_id?: string | null;
          is_starting_price?: boolean;
          image_url: string;
          is_personalizable?: boolean;
          has_business_info?: boolean;
          has_character_option?: boolean;
          is_active?: boolean;
          is_trending?: boolean;
          is_new?: boolean;
          is_promo?: boolean;
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
          cost?: number | null;
          subcategory?: string | null;
          subcategory_id?: string | null;
          is_starting_price?: boolean;
          image_url?: string;
          is_personalizable?: boolean;
          has_business_info?: boolean;
          has_character_option?: boolean;
          is_active?: boolean;
          is_trending?: boolean;
          is_new?: boolean;
          is_promo?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      clients: {
        Row: {
          id: number;
          name: string;
          logo_url: string | null;
          brand_color: string | null;
          whatsapp_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          logo_url?: string | null;
          brand_color?: string | null;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          logo_url?: string | null;
          brand_color?: string | null;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_bank_accounts: {
        Row: {
          id: number;
          client_id: number;
          bank_name: string;
          card_number: string | null;
          interbank_clabe: string | null;
          account_holder_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          client_id: number;
          bank_name: string;
          card_number?: string | null;
          interbank_clabe?: string | null;
          account_holder_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          client_id?: number;
          bank_name?: string;
          card_number?: string | null;
          interbank_clabe?: string | null;
          account_holder_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_bank_accounts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      client_social_links: {
        Row: {
          id: string;
          client_id: number;
          network: string;
          url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: number;
          network: string;
          url: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: number;
          network?: string;
          url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_social_links_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: string;
          order_date: string | null;
          client_name: string;
          payment_status: string | null;
          payment_method: string | null;
          advance_amount: number | null;
          // Link o número del chat de WhatsApp/Meta Business del pedido.
          whatsapp_link: string | null;
          order_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_date?: string | null;
          client_name: string;
          payment_status?: string | null;
          payment_method?: string | null;
          advance_amount?: number | null;
          whatsapp_link?: string | null;
          order_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_date?: string | null;
          client_name?: string;
          payment_status?: string | null;
          payment_method?: string | null;
          advance_amount?: number | null;
          whatsapp_link?: string | null;
          order_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          // Vínculo opcional a products.id — nulo en líneas personalizadas/fuera de catálogo.
          product_id: string | null;
          product_name: string;
          quantity: number;
          sale_price: number | null;
          cost: number | null;
          makerworld_link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          sale_price?: number | null;
          cost?: number | null;
          makerworld_link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          sale_price?: number | null;
          cost?: number | null;
          makerworld_link?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          expense_date: string | null;
          description: string;
          cost: number;
          paid_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          expense_date?: string | null;
          description: string;
          cost: number;
          paid_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          expense_date?: string | null;
          description?: string;
          cost?: number;
          paid_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      idea_conversations: {
        Row: {
          id: string;
          session_id: string;
          messages: unknown;
          quote_sent: boolean;
          quote_items: unknown;
          quote_sent_at: string | null;
          provider: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          messages?: unknown;
          quote_sent?: boolean;
          quote_items?: unknown;
          quote_sent_at?: string | null;
          provider?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          messages?: unknown;
          quote_sent?: boolean;
          quote_items?: unknown;
          quote_sent_at?: string | null;
          provider?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      idea_quotes: {
        Row: {
          id: string;
          token: string;
          session_id: string;
          need: string;
          items: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          session_id: string;
          need?: string;
          items: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          session_id?: string;
          need?: string;
          items?: unknown;
          created_at?: string;
        };
        Relationships: [];
      };
      idea_settings: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      idea_chat_log: {
        Row: {
          id: number;
          ip_hash: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          ip_hash: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          ip_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notify_settings: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string | null;
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
