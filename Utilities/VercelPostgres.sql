-- Database: tlts_system

-- Drop existing tables if they exist
DROP TABLE IF EXISTS admin_log;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS request_history;
DROP TABLE IF EXISTS equipment_categories;
DROP TABLE IF EXISTS admins;

-- Create custom enum type for request status
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'ongoing', 'cancelled', 'returned');

-- Table: admins
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: equipment_categories
CREATE TABLE equipment_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    quantity_available INTEGER NOT NULL
);

-- Table: request_history
CREATE TABLE request_history (
    batch_id SERIAL PRIMARY KEY,
    requisitioner_form_receipt BYTEA NOT NULL,
    approved_requests_receipt BYTEA
);

-- Table: requests
CREATE TABLE requests (
    request_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    nature_of_service TEXT,
    purpose TEXT,
    venue VARCHAR(255),
    equipment_category_id INTEGER,
    quantity_requested INTEGER NOT NULL,
    requested DATE,
    time_requested TIME,
    return_time TIME,
    time_borrowed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    status request_status DEFAULT 'pending',
    status_updated_at TIMESTAMP,
    admin_id INTEGER,
    batch_id INTEGER NOT NULL,
    FOREIGN KEY (equipment_category_id) REFERENCES equipment_categories(category_id),
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id),
    FOREIGN KEY (batch_id) REFERENCES request_history(batch_id)
);

-- Table: admin_log
CREATE TABLE admin_log (
    log_id SERIAL PRIMARY KEY,
    request_id INTEGER UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    nature_of_service TEXT NOT NULL,
    purpose TEXT NOT NULL,
    venue VARCHAR(255),
    equipment_category_id INTEGER,
    quantity_requested INTEGER NOT NULL,
    requested DATE,
    time_requested TIME,
    return_time TIME,
    time_borrowed TIME,
    approved_at TIMESTAMP,
    status request_status NOT NULL,
    status_updated_at TIMESTAMP,
    admin_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    request_approved_by VARCHAR(255) NOT NULL,
    mcl_pass_no VARCHAR(255),
    released_by VARCHAR(255),
    time_returned TIME,
    received_by VARCHAR(255),
    remarks TEXT,
    last_notification_sent TIMESTAMP,
    FOREIGN KEY (equipment_category_id) REFERENCES equipment_categories(category_id),
    FOREIGN KEY (batch_id) REFERENCES request_history(batch_id)
);

-- Insert initial admin user
INSERT INTO admins (email, name, password_hash, created_at) 
VALUES ('magbitang@ceu.edu.ph', 'Michael Lino Magbitang', 
        '$2a$10$YXCyvSxs5h9UBXxJSWG15.FnNIauoNYBPJYmR2qPL53wUx./.k2cO', 
        '2024-10-21 02:32:53'),
        ('claravall2130888@mls.ceu.edu.ph', 'Jannah Claravall', 
        '$2a$10$XanfHdFhcn6faS3M/k42eeT2q5DUgN8R8FANTDVOB85sNMoOoDW9m', 
        '2024-11-26 02:32:53');

-- Insert equipment categories
INSERT INTO equipment_categories (category_name, quantity_available) VALUES
('DLP-LCD Projector', 100),
('Laptop', 100),
('Overhead Projector', 100),
('VHS Player', 100),
('Sound System', 100),
('DVD Player', 100),
('VCD Player', 100),
('CD Cassette Player', 100),
('Karaoke', 100),
('Microphone', 100),
('Document Camera', 100),
('Digital Video Camera', 100),
('Digital Still Camera', 100),
('Audio Voltage Regulator', 100),
('Amplifier', 100),
('Audio Mixer', 100),
('Stereo Graphic Equalizer', 100),
('Globe Map', 100),
('Television Set', 100),
('Tripod', 100),
('Microphone Stand', 100),
('Wireless Microphone', 100),
('Lapel Microphone', 100),
('Radio Cassette', 100),
('Projector Screen', 100),
('External Hard Drive', 100);

/*
Pang drop ng table sa Vercel Query

DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

*/