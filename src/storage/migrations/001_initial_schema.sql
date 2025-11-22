-- Initial database schema for WhatsApp Notion Intake

-- Intake Events Table
CREATE TABLE IF NOT EXISTS intake_events (
  id UUID PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  whatsapp_message_id VARCHAR(255) NOT NULL UNIQUE,
  from_number VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  detected_urls JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  processing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enriched Items Table
CREATE TABLE IF NOT EXISTS enriched_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  source_url TEXT,
  canonical_url TEXT,
  summary TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  entities JSONB DEFAULT '{"people":[],"orgs":[],"products":[],"tech":[]}'::jsonb,
  transcript TEXT,
  ocr_text TEXT,
  extracted_text TEXT,
  media_files JSONB DEFAULT '[]'::jsonb,
  confidence DECIMAL(3, 2) NOT NULL,
  raw_event_id UUID NOT NULL REFERENCES intake_events(id) ON DELETE CASCADE,
  notion_page_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_intake_events_whatsapp_message_id ON intake_events(whatsapp_message_id);
CREATE INDEX idx_intake_events_processing_status ON intake_events(processing_status);
CREATE INDEX idx_intake_events_created_at ON intake_events(created_at DESC);
CREATE INDEX idx_enriched_items_raw_event_id ON enriched_items(raw_event_id);
CREATE INDEX idx_enriched_items_notion_page_id ON enriched_items(notion_page_id);
CREATE INDEX idx_enriched_items_created_at ON enriched_items(created_at DESC);
CREATE INDEX idx_enriched_items_type ON enriched_items(type);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_intake_events_updated_at
  BEFORE UPDATE ON intake_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enriched_items_updated_at
  BEFORE UPDATE ON enriched_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
