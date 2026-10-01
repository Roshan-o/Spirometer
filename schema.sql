-- Digital Spirometer Database Schema (Neon / PostgreSQL)

-- 1. Users Table
-- Stores user account and authentication information.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exercise Sessions Table
-- Stores the overarching data for a single exercise period.
CREATE TABLE exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER NOT NULL,
    max_pressure_achieved DECIMAL(10, 2) NOT NULL,
    max_level_reached INTEGER NOT NULL,
    max_level_hold_duration INTEGER NOT NULL, -- Stored in milliseconds
    number_of_repetitions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Repetitions Table (Optional but recommended)
-- Records individual breaths/blows within a specific session.
CREATE TABLE repetitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    max_pressure DECIMAL(10, 2) NOT NULL,
    level_reached INTEGER NOT NULL,
    hold_duration INTEGER NOT NULL, -- Stored in milliseconds
    
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES exercise_sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON exercise_sessions(user_id);
CREATE INDEX idx_repetitions_session_id ON repetitions(session_id);
