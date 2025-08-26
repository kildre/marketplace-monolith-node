--liquibase formatted sql
--changeset slair:2025_07_16-03-create_user_roles_table

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES marketplace_user(id),
    role_id SMALLINT REFERENCES role(id),
    PRIMARY KEY(user_id, role_id)
);