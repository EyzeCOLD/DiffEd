CREATE TABLE IF NOT EXISTS "users" {
    id SERIAL PRIMARY KEY,
    username varchar(20),
    password varchar(64),
    email varchar(120),
    change_date date,
};

INSERT INTO users (username, password, email) VALUES
    (1, 'jpiensal', 'mystrongpassword', 'jpiensal@student.hive.fi')
    (2, 'juaho', 'strongpass', 'juaho@student.hive.fi')
    (3, 'ekeinan', 'strongestpass', 'ekeinan@student.hive.fi')
    ;

