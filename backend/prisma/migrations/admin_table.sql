-- Migração para criar tabela de administradores
-- Execute manualmente no PostgreSQL
CREATE TABLE IF NOT EXISTS admins(
    id serial PRIMARY KEY,
    username varchar(50) UNIQUE NOT NULL,
    email varchar(100) UNIQUE NOT NULL,
    password_hash varchar(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (ROLE IN ('admin', 'super_admin')),
    active boolean DEFAULT TRUE,
    last_login timestamp,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp,
    created_at timestamp DEFAULT NOW(),
    updated_at timestamp DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

