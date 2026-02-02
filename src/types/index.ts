import { Database } from './database.types'

export * from './database.types'

// Table Row types
export type Item = Omit<Database['public']['Tables']['items']['Row'], 'status'> & {
    status: 'active' | 'maintenance' | 'retired'
    category_id: string | null
    collection_id: string | null
    material: string | null
    weight: string | null
    color: string | null
    priority: number
    import_batch_id: string | null
    is_ai_generated: boolean
}
export type ItemInsert = Database['public']['Tables']['items']['Insert']
export type ItemUpdate = Database['public']['Tables']['items']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type AppSettings = Database['public']['Tables']['app_settings']['Row']
export type AppSettingsUpdate = Database['public']['Tables']['app_settings']['Update']


export type Reservation = Database['public']['Tables']['reservations']['Row']
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert']
export type ReservationUpdate = Database['public']['Tables']['reservations']['Update']

export type BillingProfile = Database['public']['Tables']['billing_profiles']['Row']
export type BillingProfileInsert = Database['public']['Tables']['billing_profiles']['Insert']
export type BillingProfileUpdate = Database['public']['Tables']['billing_profiles']['Update']

export type StagingImport = Database['public']['Tables']['staging_imports']['Row']
export type StagingImportInsert = Database['public']['Tables']['staging_imports']['Insert']
export type StagingImportUpdate = Database['public']['Tables']['staging_imports']['Update']

export type StagingItem = Database['public']['Tables']['staging_items']['Row']
export type StagingItemInsert = Database['public']['Tables']['staging_items']['Insert']
export type StagingItemUpdate = Database['public']['Tables']['staging_items']['Update']

export type Category = {
    id: string
    name: string
    slug: string
    created_at: string
    hidden_in_portal: boolean
}

export type Collection = {
    id: string
    name: string
    slug: string
    created_at: string
    hidden_in_portal: boolean
}

// Tenant Types
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled'

export type Tenant = {
    id: string
    name: string
    slug: string
    owner_id: string
    status: TenantStatus
    settings: TenantSettings
    white_label_config: WhiteLabelConfig | null
    created_at: string
    updated_at: string
}

export type TenantSettings = {
    max_users: number
    max_storage_gb: number
    features: string[]
    plan: 'free' | 'starter' | 'professional' | 'enterprise'
}

export type WhiteLabelConfig = {
    company_name: string
    logo_url: string | null
    primary_color: string
    secondary_color: string | null
    custom_domain: string | null
    favicon_url: string | null
}

export type TenantMember = {
    id: string
    tenant_id: string
    user_id: string
    email: string
    name: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    status: 'active' | 'invited' | 'suspended'
    joined_at: string
    invited_at: string | null
}

export type TenantInsert = {
    name: string
    slug: string
    settings?: Partial<TenantSettings>
    white_label_config?: Partial<WhiteLabelConfig>
}

export type TenantUpdate = {
    name?: string
    settings?: Partial<TenantSettings>
    white_label_config?: Partial<WhiteLabelConfig>
    status?: TenantStatus
}

export type InviteRequest = {
    email: string
    role: 'admin' | 'member' | 'viewer'
}

export type InviteResponse = {
    id: string
    email: string
    role: string
    invite_token: string
    expires_at: string
}

// Generic Row helper (usage: Row<'items'>)
export type Row<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row']

// Generic Insert helper
export type InsertRow<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert']

// Generic Update helper
export type UpdateRow<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update']

// Domain Types

// Item specs type (for JSONB field)
export interface ItemSpecs {
    size?: string
    material?: string
    stone?: string
    weight?: string
    [key: string]: string | undefined
}

// Status options for forms
export const ITEM_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retired' },
] as const

export const RESERVATION_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'active', label: 'Active' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
] as const

// Supported Gemini Models
export const GEMINI_MODELS = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest)', type: 'flash' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', type: 'flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Smarter)', type: 'pro' },
]
