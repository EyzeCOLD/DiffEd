CREATE TABLE IF NOT EXISTS "users" (
    id              SERIAL PRIMARY KEY,
    username        varchar(20) UNIQUE NOT NULL,
    email           varchar(120) UNIQUE NOT NULL,
    hashed_password TEXT,
    github_id       TEXT UNIQUE,
    apikey          TEXT UNIQUE,
    vim_bindings    BOOLEAN NOT NULL DEFAULT false,
    change_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
