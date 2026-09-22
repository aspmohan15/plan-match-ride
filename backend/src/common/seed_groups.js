import { query } from './db.js';

const seedDataQuery = `
-- Insert some mock users first (needed for foreign keys)
INSERT INTO users (phone_number, password_hash) VALUES
('9876543210', 'hashed_pw_123'),
('9876543211', 'hashed_pw_123'),
('9876543212', 'hashed_pw_123')
ON CONFLICT DO NOTHING;

-- Get the IDs
DO $$
DECLARE
    u1 INTEGER;
    u2 INTEGER;
    u3 INTEGER;
    g1 INTEGER;
BEGIN
    SELECT id INTO u1 FROM users WHERE phone_number = '9876543210';
    SELECT id INTO u2 FROM users WHERE phone_number = '9876543211';
    SELECT id INTO u3 FROM users WHERE phone_number = '9876543212';

    -- Insert rich profiles so the search UI looks good
    INSERT INTO user_profiles (user_id, full_name) VALUES
    (u1, 'Alex Johnson'), (u2, 'Maria Garcia'), (u3, 'John Doe')
    ON CONFLICT DO NOTHING;

    INSERT INTO bikes (user_id, make, model) VALUES
    (u1, 'Royal Enfield', 'Himalayan'), (u2, 'KTM', '390 Duke')
    ON CONFLICT DO NOTHING;

    -- Insert mock groups
    INSERT INTO groups (name, description, creator_id) VALUES
    ('Bangalore Weekend Cruisers', 'A chill group for Sunday morning breakfast rides to Nandi Hills.', u1)
    RETURNING id INTO g1;

    INSERT INTO groups (name, description, creator_id) VALUES
    ('KTM Adventure Club', 'For those who prefer the dirt over the tarmac.', u2),
    ('Night Riders', 'Midnight city cruises around the outer ring road.', u1);

    -- Insert group members
    INSERT INTO group_members (group_id, user_id) VALUES
    (g1, u1), (g1, u2) ON CONFLICT DO NOTHING;

    -- Insert mock connections (Pending requests)
    INSERT INTO connections (user_id_1, user_id_2, status) VALUES
    (u2, u1, 'pending') ON CONFLICT DO NOTHING;

END $$;
`;

async function seedDatabase() {
    try {
        console.log("Seeding database with dummy Groups and Connections...");
        await query(seedDataQuery);
        console.log("✅ Success! Dummy data inserted into PostgreSQL.");
    } catch (error) {
        console.error("❌ Failed to insert dummy data:", error);
    } finally {
        process.exit();
    }
}

seedDatabase();
