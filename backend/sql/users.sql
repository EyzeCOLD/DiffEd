CREATE TABLE IF NOT EXISTS "users" (
    id SERIAL PRIMARY KEY,
    username varchar(20) UNIQUE NOT NULL,
    email varchar(120) UNIQUE NOT NULL,
    hashed_password varchar(64) NOT NULL,
    salt varchar(16) NOT NULL,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- below is prototype information
--INSERT INTO users (id, username, email, hashedPassword) VALUES
    --(1, 'jpiensal', 'jpiensal@student.hive.fi', 'mystrongpassword')
    --(2, 'juaho', 'juaho@student.hive.fi', 'strongpass')
    --(3, 'ekeinan', 'ekeinan@student.hive.fi', 'strongestpass')
    --;
--
