CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    user_id BIGINT,
    username TEXT,
    text TEXT,
    date TIMESTAMP
);

CREATE INDEX idx_post ON comments(post_id);
