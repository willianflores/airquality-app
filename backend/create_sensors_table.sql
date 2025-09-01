CREATE TABLE IF NOT EXISTS sensors (
  id SERIAL PRIMARY KEY,
  code VARCHAR UNIQUE,
  sensor_index VARCHAR UNIQUE,
  name VARCHAR,
  municipio VARCHAR,
  institution VARCHAR,
  location VARCHAR,
  active BOOLEAN DEFAULT true,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
