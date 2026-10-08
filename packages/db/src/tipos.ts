/**
 * Tipos generados desde el esquema de Supabase. NO se edita a mano.
 *
 *   npm run db:tipos
 *
 * Generado el 2026-10-07 contra el proyecto `yqfupeqgjibtfvgazvqw` (sa-east-1), con las
 * migraciones 0001 y 0007 a 0013 aplicadas. Si cambiás el esquema, regeneralo y commitealo:
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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerta_estado: {
        Row: {
          actualizado_at: string
          hallazgo_id: string
          precio_avisado: number
          producto_id: string
          regla: Database["public"]["Enums"]["regla_clave"]
          tienda_id: string
        }
        Insert: {
          actualizado_at?: string
          hallazgo_id: string
          precio_avisado: number
          producto_id: string
          regla: Database["public"]["Enums"]["regla_clave"]
          tienda_id: string
        }
        Update: {
          actualizado_at?: string
          hallazgo_id?: string
          precio_avisado?: number
          producto_id?: string
          regla?: Database["public"]["Enums"]["regla_clave"]
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerta_estado_hallazgo_id_fkey"
            columns: ["hallazgo_id"]
            isOneToOne: false
            referencedRelation: "hallazgos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerta_estado_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerta_estado_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
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
      corridas: {
        Row: {
          app_version: string | null
          commit_sha: string | null
          descartada_motivo: string | null
          estado: Database["public"]["Enums"]["estado_corrida"]
          fin: string | null
          grupos_fallidos: string[]
          hallazgos_nuevos: number
          id: string
          inicio: string
          productos_cambiados: number
          productos_conocidos: number
          productos_vistos: number
          tienda_id: string
        }
        Insert: {
          app_version?: string | null
          commit_sha?: string | null
          descartada_motivo?: string | null
          estado?: Database["public"]["Enums"]["estado_corrida"]
          fin?: string | null
          grupos_fallidos?: string[]
          hallazgos_nuevos?: number
          id?: string
          inicio?: string
          productos_cambiados?: number
          productos_conocidos?: number
          productos_vistos?: number
          tienda_id: string
        }
        Update: {
          app_version?: string | null
          commit_sha?: string | null
          descartada_motivo?: string | null
          estado?: Database["public"]["Enums"]["estado_corrida"]
          fin?: string | null
          grupos_fallidos?: string[]
          hallazgos_nuevos?: number
          id?: string
          inicio?: string
          productos_cambiados?: number
          productos_conocidos?: number
          productos_vistos?: number
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corridas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciales_proveedor: {
        Row: {
          actualizado_at: string
          expira_at: string
          proveedor_id: string
          token: string
        }
        Insert: {
          actualizado_at?: string
          expira_at: string
          proveedor_id: string
          token: string
        }
        Update: {
          actualizado_at?: string
          expira_at?: string
          proveedor_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "credenciales_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: true
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
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
          sin_cobertura_at: string | null
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
          sin_cobertura_at?: string | null
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
          sin_cobertura_at?: string | null
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
          {
            foreignKeyName: "direcciones_tiendas_tienda_fk"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      hallazgos: {
        Row: {
          cerrado_at: string | null
          corrida_id: string | null
          detalle: Json
          detectado_at: string
          estado_oferta: Database["public"]["Enums"]["estado_oferta"] | null
          id: string
          notificar: boolean
          precio: number
          precio_referencia: number | null
          producto_id: string
          ratio: number | null
          regla: Database["public"]["Enums"]["regla_clave"]
          tienda_id: string
        }
        Insert: {
          cerrado_at?: string | null
          corrida_id?: string | null
          detalle?: Json
          detectado_at?: string
          estado_oferta?: Database["public"]["Enums"]["estado_oferta"] | null
          id?: string
          notificar?: boolean
          precio: number
          precio_referencia?: number | null
          producto_id: string
          ratio?: number | null
          regla: Database["public"]["Enums"]["regla_clave"]
          tienda_id: string
        }
        Update: {
          cerrado_at?: string | null
          corrida_id?: string | null
          detalle?: Json
          detectado_at?: string
          estado_oferta?: Database["public"]["Enums"]["estado_oferta"] | null
          id?: string
          notificar?: boolean
          precio?: number
          precio_referencia?: number | null
          producto_id?: string
          ratio?: number | null
          regla?: Database["public"]["Enums"]["regla_clave"]
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hallazgos_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          canal: Database["public"]["Enums"]["tipo_canal"]
          creada_at: string
          enviada_at: string | null
          error: string | null
          hallazgo_id: string
          id: number
          usuario_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["tipo_canal"]
          creada_at?: string
          enviada_at?: string | null
          error?: string | null
          hallazgo_id: string
          id?: number
          usuario_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["tipo_canal"]
          creada_at?: string
          enviada_at?: string | null
          error?: string | null
          hallazgo_id?: string
          id?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_hallazgo_id_fkey"
            columns: ["hallazgo_id"]
            isOneToOne: false
            referencedRelation: "hallazgos"
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
      precios_actuales: {
        Row: {
          cambio_at: string
          en_stock: boolean
          precio: number
          precio_lista: number | null
          producto_id: string
          promo_kind: Database["public"]["Enums"]["promo_kind"]
          stock: number | null
          tienda_id: string
          visto_at: string
        }
        Insert: {
          cambio_at: string
          en_stock: boolean
          precio: number
          precio_lista?: number | null
          producto_id: string
          promo_kind?: Database["public"]["Enums"]["promo_kind"]
          stock?: number | null
          tienda_id: string
          visto_at: string
        }
        Update: {
          cambio_at?: string
          en_stock?: boolean
          precio?: number
          precio_lista?: number | null
          producto_id?: string
          promo_kind?: Database["public"]["Enums"]["promo_kind"]
          stock?: number | null
          tienda_id?: string
          visto_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precios_actuales_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_actuales_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      precios_cambios: {
        Row: {
          en_stock: boolean
          id: number
          precio: number
          precio_lista: number | null
          producto_id: string
          promo_kind: Database["public"]["Enums"]["promo_kind"]
          tienda_id: string
          ts: string
        }
        Insert: {
          en_stock: boolean
          id?: number
          precio: number
          precio_lista?: number | null
          producto_id: string
          promo_kind: Database["public"]["Enums"]["promo_kind"]
          tienda_id: string
          ts: string
        }
        Update: {
          en_stock?: boolean
          id?: number
          precio?: number
          precio_lista?: number | null
          producto_id?: string
          promo_kind?: Database["public"]["Enums"]["promo_kind"]
          tienda_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "precios_cambios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_cambios_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          actualizado_at: string
          canonico_id: string | null
          categoria_path: string[]
          id: string
          id_externo: string
          imagen_url: string | null
          marca: string | null
          nombre: string
          presentacion: string | null
          proveedor_id: string
        }
        Insert: {
          actualizado_at?: string
          canonico_id?: string | null
          categoria_path?: string[]
          id?: string
          id_externo: string
          imagen_url?: string | null
          marca?: string | null
          nombre: string
          presentacion?: string | null
          proveedor_id: string
        }
        Update: {
          actualizado_at?: string
          canonico_id?: string | null
          categoria_path?: string[]
          id?: string
          id_externo?: string
          imagen_url?: string | null
          marca?: string | null
          nombre?: string
          presentacion?: string | null
          proveedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_canonico_id_fkey"
            columns: ["canonico_id"]
            isOneToOne: false
            referencedRelation: "productos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_canonicos: {
        Row: {
          clave: string
          id: string
          origen: Database["public"]["Enums"]["origen_clave"]
        }
        Insert: {
          clave: string
          id?: string
          origen: Database["public"]["Enums"]["origen_clave"]
        }
        Update: {
          clave?: string
          id?: string
          origen?: Database["public"]["Enums"]["origen_clave"]
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          creado_at: string
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_proveedor"]
        }
        Insert: {
          creado_at?: string
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_proveedor"]
        }
        Update: {
          creado_at?: string
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_proveedor"]
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
          {
            foreignKeyName: "suscripciones_tienda_fk"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      tiendas: {
        Row: {
          creada_at: string
          id: string
          id_externo: string
          lat_consulta: number
          lng_consulta: number
          nombre: string | null
          primera_corrida_ok_at: string | null
          proveedor_id: string
          ultima_corrida_ok_at: string | null
        }
        Insert: {
          creada_at?: string
          id?: string
          id_externo: string
          lat_consulta: number
          lng_consulta: number
          nombre?: string | null
          primera_corrida_ok_at?: string | null
          proveedor_id: string
          ultima_corrida_ok_at?: string | null
        }
        Update: {
          creada_at?: string
          id?: string
          id_externo?: string
          lat_consulta?: number
          lng_consulta?: number
          nombre?: string | null
          primera_corrida_ok_at?: string | null
          proveedor_id?: string
          ultima_corrida_ok_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiendas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_lote_precios: {
        Args: { p_filas: Json; p_tienda_id: string; p_ts: string }
        Returns: {
          motivo: string
          producto_id: string
        }[]
      }
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
