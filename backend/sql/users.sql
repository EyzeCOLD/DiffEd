CREATE TABLE IF NOT EXISTS "users" (
    id              SERIAL PRIMARY KEY,
    username        varchar(20) UNIQUE NOT NULL,
    email           varchar(120) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    change_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
