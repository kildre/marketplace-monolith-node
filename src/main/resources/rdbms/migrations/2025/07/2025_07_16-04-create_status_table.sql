--liquibase formatted sql
--changeset slair:2025_07_16-04-create_status_table

CREATE TABLE status (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE
);

INSERT INTO status VALUES (1, 'PENDING');
INSERT INTO status VALUES (2, 'APPROVED');
INSERT INTO status VALUES (3, 'DENIED');