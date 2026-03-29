-- tickets.airdev.us schema
-- Run against Supabase project: nvtfbakietlaurokxogv

-- Tenants
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  api_key text UNIQUE NOT NULL,
  webhook_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Tickets
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  external_id text,
  created_by_email text NOT NULL,
  created_by_name text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'GENERAL',
  priority text NOT NULL DEFAULT 'NORMAL',
  status text NOT NULL DEFAULT 'OPEN',
  closed_at timestamptz,
  activity_log text,
  ai_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_tickets_status ON tickets(status);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_email text NOT NULL,
  author_name text NOT NULL,
  is_admin boolean DEFAULT false,
  content text NOT NULL,
  attachments text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_messages_ticket ON messages(ticket_id);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Admin users (for magic link auth)
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Magic link attempts (rate limiting)
CREATE TABLE magic_link_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_magic_link_email ON magic_link_attempts(email);
ALTER TABLE magic_link_attempts ENABLE ROW LEVEL SECURITY;

-- Seed initial tenants
INSERT INTO tenants (slug, name, api_key) VALUES
  ('airmates', 'Airmates Flying Club', 'tk_' || encode(gen_random_bytes(24), 'hex')),
  ('sitecheck', 'SiteCheck by AirDev', 'tk_' || encode(gen_random_bytes(24), 'hex'));
