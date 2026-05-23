-- Migración Inicial para Soberana ERP
-- Arquitectura NoSQL Offline-First: Una sola tabla para todas las colecciones

CREATE TABLE IF NOT EXISTS app_data (
    id text NOT NULL,
    collection text NOT NULL,
    tenant_id uuid NOT NULL DEFAULT auth.uid(),
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (collection, id, tenant_id)
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Política de Seguridad: Cada negocio (tenant) solo puede ver y editar sus propios datos
CREATE POLICY "Aislamiento por Negocio" ON app_data
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Índices para mejorar la velocidad de búsqueda por colección y tenant
CREATE INDEX IF NOT EXISTS idx_app_data_collection ON app_data(collection);
CREATE INDEX IF NOT EXISTS idx_app_data_tenant ON app_data(tenant_id);
