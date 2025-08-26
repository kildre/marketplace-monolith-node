--liquibase formatted sql
--changeset slair:2025_07_21-01-seed_authorized_users

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('jennifer.a.cowley.civ@mail.mil', 'Jennifer', 'Cowley');

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('jane.f.roberts.civ@mail.mil', 'Jane', 'Roberts');

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('vinoth.jagannathan.civ@mail.mil', 'Vinoth', 'Jagannathan');

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('joanna.c.ramsey.civ@mail.mil', 'Joanna', 'Ramsey');

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('elizabeth.y.ahn.civ@mail.mil', 'Elizabeth', 'Ahn');

INSERT INTO marketplace_user
(email, first_name, last_name)
VALUES
('daniel.e.allen.civ@mail.mil', 'Daniel', 'Allen');

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='jennifer.a.cowley.civ@mail.mil'), 1);

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='jane.f.roberts.civ@mail.mil'), 1);

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='vinoth.jagannathan.civ@mail.mil'), 2);

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='joanna.c.ramsey.civ@mail.mil'), 1);

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='elizabeth.y.ahn.civ@mail.mil'), 2);

INSERT INTO user_roles
(user_id, role_id)
VALUES
((SELECT id from marketplace_user WHERE email='daniel.e.allen.civ@mail.mil'), 2);

