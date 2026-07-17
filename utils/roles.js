/**
 * Role IDs match the insertion order of the seed data in
 * database/schema.sql (section 2 - ACCESS CONTROL: ROLES & USERS).
 * If roles are re-seeded in a different order, update this map to
 * match the actual role_id values in your database.
 */
module.exports = {
  PRINCIPAL: 1,
  DIRECTOR_OF_PLANNING: 2,
  HOD: 3,
  CDSM: 4,
  COORDINATOR: 5,
  ADMINISTRATOR: 6,
};
