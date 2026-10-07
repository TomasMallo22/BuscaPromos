/**
 * Tipos generados desde el esquema de Supabase. NO se edita a mano.
 *
 *   npm run db:tipos
 *
 * Generado el 2026-10-07 contra el proyecto `yqfupeqgjibtfvgazvqw` (sa-east-1), con las
 * migraciones 0001, 0007 y 0008 aplicadas. Si cambiás el esquema, regeneralo y commitealo:
 * es lo que hace que un cambio de columna rompa la compilacion del crawler, de la web y de
 * `packages/db` a la vez, en vez de fallar en runtime.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      canales_notificacion: {
        Row: {
          creado_at: string
          destino: string | null
          id: string
          tipo: Database["public"]["Enums"]["tipo_canal"]
          token_expira_at: string | null
          token_vinculacion: string | null
          usuario_id: string
          verificado: boolean
        }
        Insert: {
          creado_at?: string
          destino?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["tipo_canal"]
          token_expira_at?: string | null
          token_vinculacion?: string | null
          usuario_id: string
          verificado?: boolean
        }
        Update: {
          creado_at?: string
          destino?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_canal"]
          token_expira_at?: string | null
          token_vinculacion?: string | null
          usuario_id?: string
          verificado?: boolean
        }
        Relationships: []
      }
      direcciones: {
        Row: {
          activa: boolean
          creada_at: string
          etiqueta: string
          id: string
          lat: number
          lng: number
          resuelta_at: string | null
          texto: string
          usuario_id: string
        }
        Insert: {
          activa?: boolean
          creada_at?: string
          etiqueta: string
          id?: string
          lat: number
          lng: number
          resuelta_at?: string | null
          texto: string
          usuario_id: string
        }
        Update: {
          activa?: boolean
          creada_at?: string
          etiqueta?: string
          id?: string
          lat?: number
          lng?: number
          resuelta_at?: string | null
          texto?: string
          usuario_id?: string
        }
        Relationships: []
      }
      direcciones_tiendas: {
        Row: {
          direccion_id: string
          distancia_m: number | null
          resuelta_at: string
          tienda_id: string
        }
        Insert: {
          direccion_id: string
          distancia_m?: number | null
          resuelta_at?: string
          tienda_id: string
        }
        Update: {
          direccion_id?: string
          distancia_m?: number | null
          resuelta_at?: string
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_tiendas_direccion_id_fkey"
            columns: ["direccion_id"]
            isOneToOne: false
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          creado_at: string
          hora_silencio_desde: number
          hora_silencio_hasta: number
          id: string
          max_alertas_hora: number
          nombre: string | null
        }
        Insert: {
          creado_at?: string
          hora_silencio_desde?: number
          hora_silencio_hasta?: number
          id: string
          max_alertas_hora?: number
          nombre?: string | null
        }
        Update: {
          creado_at?: string
          hora_silencio_desde?: number
          hora_silencio_hasta?: number
          id?: string
          max_alertas_hora?: number
          nombre?: string | null
        }
        Relationships: []
      }
      suscripciones: {
        Row: {
          activa: boolean
          categorias_excluidas: string[]
          creada_at: string
          direccion_id: string | null
          id: string
          ratio_maximo: number
          reglas_habilitadas: Database["public"]["Enums"]["regla_clave"][]
          tienda_id: string
          usuario_id: string
        }
        Insert: {
          activa?: boolean
          categorias_excluidas?: string[]
          creada_at?: string
          direccion_id?: string | null
          id?: string
          ratio_maximo?: number
          reglas_habilitadas?: Database["public"]["Enums"]["regla_clave"][]
          tienda_id: string
          usuario_id: string
        }
        Update: {
          activa?: boolean
          categorias_excluidas?: string[]
          creada_at?: string
          direccion_id?: string | null
          id?: string
          ratio_maximo?: number
          reglas_habilitadas?: Database["public"]["Enums"]["regla_clave"][]
          tienda_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_direccion_id_fkey"
            columns: ["direccion_id"]
            isOneToOne: false
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_corrida: "en_curso" | "ok" | "descartada" | "error"
      estado_oferta: "real" | "inflado" | "sin_historial"
      origen_clave: "ean" | "rappi_master" | "nombre_marca_presentacion"
      promo_kind:
        | "ninguna"
        | "descuento_lista"
        | "promo_usuario_nuevo"
        | "segunda_unidad"
        | "descuento_bancario"
        | "combo"
        | "precio_cuidado"
        | "desconocida"
      regla_clave:
        | "precio_absurdo"
        | "caida_vs_historial"
        | "descuento_extremo"
        | "gran_descuento"
        | "vs_otras_tiendas"
        | "nuevo_vs_pasillo"
        | "promo_usuario_nuevo"
      tipo_canal: "telegram" | "email" | "web"
      tipo_proveedor:
        | "rappi"
        | "vtex"
        | "coto"
        | "laanonima"
        | "sepa"
        | "pedidosya"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      estado_corrida: ["en_curso", "ok", "descartada", "error"],
      estado_oferta: ["real", "inflado", "sin_historial"],
      origen_clave: ["ean", "rappi_master", "nombre_marca_presentacion"],
      promo_kind: [
        "ninguna",
        "descuento_lista",
        "promo_usuario_nuevo",
        "segunda_unidad",
        "descuento_bancario",
        "combo",
        "precio_cuidado",
        "desconocida",
      ],
      regla_clave: [
        "precio_absurdo",
        "caida_vs_historial",
        "descuento_extremo",
        "gran_descuento",
        "vs_otras_tiendas",
        "nuevo_vs_pasillo",
        "promo_usuario_nuevo",
      ],
      tipo_canal: ["telegram", "email", "web"],
      tipo_proveedor: ["rappi", "vtex", "coto", "laanonima", "sepa", "pedidosya"],
    },
  },
} as const
