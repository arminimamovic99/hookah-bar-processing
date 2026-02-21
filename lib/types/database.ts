export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'waiter' | 'bar' | 'shisha' | 'admin';
export type ProductCategory = 'drink' | 'shisha';
export type OrderStatus = 'new' | 'in_progress' | 'completed';
export type StationStatus = 'pending' | 'done';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          email: string | null;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          role?: AppRole;
          email?: string | null;
          full_name?: string | null;
        };
      };
      tables: {
        Row: {
          id: string;
          number: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          number: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          number?: string;
          is_active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: ProductCategory;
          price: number;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: ProductCategory;
          price: number;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: ProductCategory;
          price?: number;
          is_available?: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          table_id: string;
          status: OrderStatus;
          created_by_user: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          status?: OrderStatus;
          created_by_user: string;
          created_at?: string;
        };
        Update: {
          table_id?: string;
          status?: OrderStatus;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          qty: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          qty?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          qty?: number;
          note?: string | null;
        };
      };
      order_station_status: {
        Row: {
          order_id: string;
          bar_status: StationStatus;
          shisha_status: StationStatus;
          updated_at: string;
        };
        Insert: {
          order_id: string;
          bar_status?: StationStatus;
          shisha_status?: StationStatus;
          updated_at?: string;
        };
        Update: {
          bar_status?: StationStatus;
          shisha_status?: StationStatus;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          required_role: AppRole;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      product_category: ProductCategory;
      order_status: OrderStatus;
      station_status: StationStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
