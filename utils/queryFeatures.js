/**
 * Builds the WHERE / ORDER BY / LIMIT clauses shared by every
 * "list" endpoint (GET /resource) from the request's query string,
 * constrained by what each entity config declares as allowed.
 *
 * Supported query params:
 *   page, limit                -> pagination
 *   sort=field, order=asc|desc -> sorting (whitelisted by entity.sortable)
 *   search=text                -> LIKE search across entity.searchable fields
 *   <filterableField>=value    -> exact-match filter (whitelisted by entity.filterable)
 *   <field>_gte / <field>_lte  -> range filter for numeric/date filterable fields
 */
function buildListQuery(entity, reqQuery, tableAlias) {
  const alias = tableAlias ? `${tableAlias}.` : '';
  const where = [];
  const params = [];

  // ---- filtering (exact match) ----
  (entity.filterable || []).forEach((field) => {
    if (reqQuery[field] !== undefined && reqQuery[field] !== '') {
      where.push(`${alias}${field} = ?`);
      params.push(reqQuery[field]);
    }
    if (reqQuery[`${field}_gte`] !== undefined && reqQuery[`${field}_gte`] !== '') {
      where.push(`${alias}${field} >= ?`);
      params.push(reqQuery[`${field}_gte`]);
    }
    if (reqQuery[`${field}_lte`] !== undefined && reqQuery[`${field}_lte`] !== '') {
      where.push(`${alias}${field} <= ?`);
      params.push(reqQuery[`${field}_lte`]);
    }
  });

  // ---- search (LIKE across whitelisted fields) ----
  if (reqQuery.search && entity.searchable && entity.searchable.length > 0) {
    const likeClauses = entity.searchable.map((f) => `${alias}${f} LIKE ?`);
    where.push(`(${likeClauses.join(' OR ')})`);
    entity.searchable.forEach(() => params.push(`%${reqQuery.search}%`));
  }

  // ---- sorting ----
  let orderBy = `${alias}${entity.pk} DESC`;
  if (reqQuery.sort && entity.sortable && entity.sortable.includes(reqQuery.sort)) {
    const dir = String(reqQuery.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    orderBy = `${alias}${reqQuery.sort} ${dir}`;
  }

  // ---- pagination ----
  const page = Math.max(parseInt(reqQuery.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(reqQuery.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return { whereSql, params, orderBy, page, limit, offset };
}

module.exports = { buildListQuery };
