import { query } from './db.js';

const createTablesQuery = `
-- Clean slate for dev environment
DROP TABLE IF EXISTS group_members, groups, connections, trip_requests, trip_participants, trips, bikes, user_profiles, users, otp_verifications, rate_limit_events, notifications CASCADE;

-- User accounts
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT false,
    name VARCHAR(255),
    profile_image_url VARCHAR(255),
    profile_image_public_id VARCHAR(255),
    bike_model VARCHAR(255),
    bike_image_url VARCHAR(255),
    bike_image_public_id VARCHAR(255),
    profile_completed BOOLEAN DEFAULT false,
    last_phone_change_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Verifications
CREATE TABLE otp_verifications (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Extended user profiles
CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    bio TEXT,
    riding_style VARCHAR(100),
    experience_level VARCHAR(50),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's motorcycles
CREATE TABLE bikes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    engine_displacement INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Planned or past trips
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255),
    start_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip Participants (Many-to-Many mapping for users joining trips)
CREATE TABLE trip_participants (
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, user_id)
);

-- Trip Requests (Users asking to join a trip)
CREATE TABLE trip_requests (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id)
);

-- User connections (friends, matching)
CREATE TABLE connections (
    user_id_1 INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- pending, accepted, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id_1, user_id_2)
);

-- Riding groups
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Members (Many-to-Many mapping)
CREATE TABLE group_members (
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- Rate limit events for auditing
CREATE TABLE rate_limit_events (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function initializeDatabase() {
    try {
        console.log("Connecting to database and running setup script...");
        await query(createTablesQuery);
        console.log("✅ Success! All database tables have been created.");
    } catch (error) {
        console.error("❌ Failed to create tables:", error);
    } finally {
        process.exit();
    }
}

initializeDatabase();
