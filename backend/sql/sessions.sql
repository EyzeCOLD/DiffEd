CREATE TABLE IF NOT EXISTS "user_sessions" (
    sid     varchar NOT NULL COLLATE "default",
    sess    json NOT NULL,
    expire  TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");

