/**
 * Database types for the typed Supabase client.
 *
 * Hand-authored to mirror supabase/migrations — the app relies on the exported
 * convenience aliases below (Sex, Unit, Teen, …), so DO NOT overwrite this file
 * with `supabase gen types` output (that drops the aliases). Add new
 * columns/tables here by hand when a migration lands.
 */

export type Sex = "M" | "F";
export type CheckinStatus = "present" | "authorized_to_leave" | "left";
export type AppRole = "global_admin" | "unit_admin" | "volunteer";
export type VolunteerFunction =
  | "ministro_culto"
  | "gerencia"
  | "recepcao"
  | "diversao"
  | "louvor"
  | "pequenos_grupos";

type Timestamps = { created_at: string };

export type Database = {
  public: {
    Tables: {
      units: {
        Row: { id: string; code: string; name: string; is_active: boolean } & Timestamps;
        Insert: { id?: string; code: string; name: string; is_active?: boolean; created_at?: string };
        Update: { id?: string; code?: string; name?: string; is_active?: boolean; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          unit_id: string | null;
          role: AppRole;
          full_name: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          unit_id?: string | null;
          role?: AppRole;
          full_name: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string | null;
          role?: AppRole;
          full_name?: string;
          phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      teens: {
        Row: {
          id: string;
          unit_id: string;
          seq: number;
          display_id: string;
          name: string;
          birthdate: string;
          sex: Sex;
          guardian_name: string;
          guardian_phone: string;
          cep: string | null;
          street: string | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          observations: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          seq?: number;
          display_id?: string;
          name: string;
          birthdate: string;
          sex: Sex;
          guardian_name: string;
          guardian_phone: string;
          cep?: string | null;
          street?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          observations?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          birthdate?: string;
          sex?: Sex;
          guardian_name?: string;
          guardian_phone?: string;
          cep?: string | null;
          street?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          observations?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      teen_guardians: {
        Row: {
          id: string;
          unit_id: string;
          teen_id: string;
          name: string;
          phone: string;
          relationship: string | null;
          is_primary: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          teen_id: string;
          name: string;
          phone: string;
          relationship?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          relationship?: string | null;
          is_primary?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      unit_services: {
        Row: {
          id: string;
          unit_id: string;
          label: string;
          start_time: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          label: string;
          start_time: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          label?: string;
          start_time?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          unit_id: string;
          session_date: string;
          service_id: string;
          notes: string | null;
          closed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          session_date: string;
          service_id: string;
          notes?: string | null;
          closed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          session_date?: string;
          service_id?: string;
          notes?: string | null;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          id: string;
          unit_id: string;
          session_id: string;
          teen_id: string;
          status: CheckinStatus;
          check_in_time: string;
          authorized_at: string | null;
          authorized_by: string | null;
          authorized_by_name: string | null;
          check_out_time: string | null;
          checked_in_by: string | null;
          guardian_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          session_id: string;
          teen_id: string;
          status?: CheckinStatus;
          check_in_time?: string;
          authorized_at?: string | null;
          authorized_by?: string | null;
          authorized_by_name?: string | null;
          check_out_time?: string | null;
          checked_in_by?: string | null;
          guardian_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: CheckinStatus;
          authorized_at?: string | null;
          authorized_by?: string | null;
          authorized_by_name?: string | null;
          check_out_time?: string | null;
          guardian_id?: string | null;
        };
        Relationships: [];
      };
      small_groups: {
        Row: {
          id: string;
          unit_id: string;
          session_id: string;
          label: string | null;
          sex: Sex | null;
          volunteer_id: string | null;
          outside_age_rule: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          session_id: string;
          label?: string | null;
          sex?: Sex | null;
          volunteer_id?: string | null;
          outside_age_rule?: boolean;
          created_at?: string;
        };
        Update: {
          label?: string | null;
          sex?: Sex | null;
          volunteer_id?: string | null;
          outside_age_rule?: boolean;
        };
        Relationships: [];
      };
      small_group_members: {
        Row: {
          id: string;
          unit_id: string;
          group_id: string;
          checkin_id: string;
          assigned_manually: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          group_id: string;
          checkin_id: string;
          assigned_manually?: boolean;
          created_at?: string;
        };
        Update: { group_id?: string; assigned_manually?: boolean };
        Relationships: [];
      };
      volunteers: {
        Row: {
          id: string;
          unit_id: string;
          profile_id: string | null;
          name: string;
          phone: string | null;
          sex: Sex | null;
          birthdate: string | null;
          functions: VolunteerFunction[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          profile_id?: string | null;
          name: string;
          phone?: string | null;
          sex?: Sex | null;
          birthdate?: string | null;
          functions?: VolunteerFunction[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          sex?: Sex | null;
          birthdate?: string | null;
          functions?: VolunteerFunction[];
          is_active?: boolean;
        };
        Relationships: [];
      };
      volunteer_attendance: {
        Row: {
          id: string;
          unit_id: string;
          session_id: string;
          volunteer_id: string;
          present: boolean;
          leads_group: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          session_id: string;
          volunteer_id: string;
          present?: boolean;
          leads_group?: boolean;
          created_at?: string;
        };
        Update: { present?: boolean; leads_group?: boolean };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          unit_id: string;
          name: string;
          category: string | null;
          unit_label: string;
          quantity: number;
          min_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          name: string;
          category?: string | null;
          unit_label?: string;
          quantity?: number;
          min_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string | null;
          unit_label?: string;
          quantity?: number;
          min_quantity?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          unit_id: string;
          product_id: string;
          delta: number;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          product_id: string;
          delta: number;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: { reason?: string | null };
        Relationships: [];
      };
      teen_id_counters: {
        Row: { unit_id: string; next_seq: number };
        Insert: { unit_id: string; next_seq?: number };
        Update: { next_seq?: number };
        Relationships: [];
      };
    };
    Views: {
      v_session_attendance: {
        Row: {
          session_id: string | null;
          unit_id: string | null;
          session_date: string | null;
          service_label: string | null;
          closed_at: string | null;
          teens_present: number | null;
        };
        Relationships: [];
      };
      v_session_attendance_by_sex: {
        Row: {
          session_id: string | null;
          unit_id: string | null;
          session_date: string | null;
          service_label: string | null;
          teens_m: number | null;
          teens_f: number | null;
        };
        Relationships: [];
      };
      v_monthly_unique_teens: {
        Row: {
          unit_id: string | null;
          month: string | null;
          unique_teens: number | null;
        };
        Relationships: [];
      };
      v_teen_growth: {
        Row: {
          unit_id: string | null;
          month: string | null;
          new_teens: number | null;
          cumulative_teens: number | null;
        };
        Relationships: [];
      };
      v_volunteer_engagement: {
        Row: {
          session_id: string | null;
          unit_id: string | null;
          session_date: string | null;
          service_label: string | null;
          volunteers_present: number | null;
          volunteers_registered: number | null;
        };
        Relationships: [];
      };
      v_volunteer_leaderboard: {
        Row: {
          unit_id: string | null;
          volunteer_id: string | null;
          name: string | null;
          sessions_attended: number | null;
          last_present: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      record_stock_movement: {
        Args: { p_product: string; p_delta: number; p_reason?: string | null };
        Returns: {
          id: string;
          unit_id: string;
          name: string;
          category: string | null;
          unit_label: string;
          quantity: number;
          min_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Enums: {
      sex: Sex;
      checkin_status: CheckinStatus;
      app_role: AppRole;
      volunteer_function: VolunteerFunction;
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience row aliases used across the app.
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Teen = Database["public"]["Tables"]["teens"]["Row"];
export type UnitService = Database["public"]["Tables"]["unit_services"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Checkin = Database["public"]["Tables"]["checkins"]["Row"];
export type SmallGroup = Database["public"]["Tables"]["small_groups"]["Row"];
export type SmallGroupMember =
  Database["public"]["Tables"]["small_group_members"]["Row"];
export type Volunteer = Database["public"]["Tables"]["volunteers"]["Row"];
export type VolunteerAttendance =
  Database["public"]["Tables"]["volunteer_attendance"]["Row"];
export type TeenGuardian = Database["public"]["Tables"]["teen_guardians"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type StockMovement =
  Database["public"]["Tables"]["stock_movements"]["Row"];
