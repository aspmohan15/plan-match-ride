import { query } from './db.js';

const seedDataQuery = `
-- Insert some mock users first (needed for foreign keys)
INSERT INTO users (email, password_hash) VALUES
('alex@example.com', 'hashed_pw_123'),
('maria@example.com', 'hashed_pw_123'),
('john@example.com', 'hashed_pw_123')
ON CONFLICT DO NOTHING;

-- Get the ID of the first user to act as creator
DO $$
DECLARE
    first_user_id INTEGER;
    second_user_id INTEGER;
BEGIN
    SELECT id INTO first_user_id FROM users LIMIT 1;
    SELECT id INTO second_user_id FROM users OFFSET 1 LIMIT 1;

    -- Insert mock groups
    INSERT INTO groups (name, description, creator_id) VALUES
    ('Bangalore Weekend Cruisers', 'A chill group for Sunday morning breakfast rides to Nandi Hills.', first_user_id),
    ('KTM Adventure Club', 'For those who prefer the dirt over the tarmac.', second_user_id),
    ('Night Riders', 'Midnight city cruises around the outer ring road.', first_user_id);

    -- Insert mock connections (Pending requests)
    INSERT INTO connections (user_id_1, user_id_2, status) VALUES
    (second_user_id, first_user_id, 'pending');

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
