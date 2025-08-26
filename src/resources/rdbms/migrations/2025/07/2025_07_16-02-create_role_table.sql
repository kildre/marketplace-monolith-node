--liquibase formatted sql
--changeset slair:2025_07_16-02-create_role_table

CREATE TABLE role (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE
);

INSERT INTO role VALUES (1, 'ADJUDICATOR');
INSERT INTO role VALUES (2, 'REQUESTOR');
