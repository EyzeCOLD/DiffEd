CREATE TABLE IF NOT EXISTS "files" (
	id uuid PRIMARY KEY,
	name varchar(100) NOT NULL UNIQUE,
	content text
);
