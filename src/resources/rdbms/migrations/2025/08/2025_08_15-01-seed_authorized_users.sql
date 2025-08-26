--liquibase formatted sql
--changeset slair:2025_08_15-01-seed_authorized_users

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('slair@metrostar.com', 'Samuel', 'Lair');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='slair@metrostar.com'), 2);

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('kilian.l.berres.ctr@mail.mil', 'Killian', 'Berres');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='kilian.l.berres.ctr@mail.mil'), 1);

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('kberres@metrostar.com', 'Killian', 'Berres');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='kberres@metrostar.com'), 2);

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('jbapple@metrostar.com', 'Jake', 'Bapple');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='jbapple@metrostar.com'), 2);

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('efernald@metrostar.com', 'Eric', 'Fernald');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='efernald@metrostar.com'), 2);

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('eric.j.fernald2.ctr@mail.mil', 'Eric', 'Fernald');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='eric.j.fernald2.ctr@mail.mil'), 1);

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('aleksander.s.wilms.ctr@mail.mil', 'Aleksander', 'Wilms');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='aleksander.s.wilms.ctr@mail.mil'), 1);
