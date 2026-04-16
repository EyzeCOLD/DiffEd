CREATE TABLE IF NOT EXISTS "files" (
	id uuid PRIMARY KEY,
	name varchar(100) NOT NULL,
	content text,
	owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE(name, owner_id)
);
