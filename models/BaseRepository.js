const { query, withTransaction } = require('../config/database');
const { buildListQuery } = require('../utils/queryFeatures');
const ApiError = require('../utils/ApiError');

/**
 * Generic repository providing full CRUD + pagination/search/filter/
 * sort + foreign-key validation for any entity defined in
 * models/entities.js. All queries are parameterized (mysql2 `?`
 * placeholders) - no string-concatenated user input ever reaches SQL.
 */
class BaseRepository {
  constructor(entity) {
    this.entity = entity;
    this.table = entity.table;
    this.pk = entity.pk;
  }

  // ---------------------------------------------------------------
  // Foreign key validation - prevents orphan records
  // ---------------------------------------------------------------
  async validateForeignKeys(data) {
    const fks = this.entity.foreignKeys || [];
    for (const fk of fks) {
      const value = data[fk.field];
      if (value === undefined || value === null || value === '') {
        if (!fk.allowNull) {
          throw ApiError.badRequest(`${fk.field} is required`);
        }
        continue;
      }
      const rows = await query(
        `SELECT ${fk.refPk} FROM ${fk.refTable} WHERE ${fk.refPk} = ? LIMIT 1`,
        [value]
      );
      if (rows.length === 0) {
        throw ApiError.badRequest(
          `Invalid ${fk.field}: no matching record in ${fk.refTable}`
        );
      }
    }
  }

  // ---------------------------------------------------------------
  // Uniqueness validation -> 409 Conflict
  // ---------------------------------------------------------------
  async validateUnique(data, excludeId = null) {
    const uniques = this.entity.unique || [];
    for (const field of uniques) {
      if (data[field] === undefined) continue;
      let sql = `SELECT ${this.pk} FROM ${this.table} WHERE ${field} = ?`;
      const params = [data[field]];
      if (excludeId !== null) {
        sql += ` AND ${this.pk} != ?`;
        params.push(excludeId);
      }
      const rows = await query(sql, params);
      if (rows.length > 0) {
        throw ApiError.conflict(`${field} '${data[field]}' already exists`);
      }
    }
  }

  // ---------------------------------------------------------------
  // Build enriched SELECT (base table + configured LEFT JOINs)
  // ---------------------------------------------------------------
  buildSelectClause() {
    const joins = this.entity.joins || [];
    const joinSelects = joins.map((j) => j.select).join(', ');
    const joinClauses = joins
      .map((j) => `LEFT JOIN ${j.table} ${j.alias} ON ${j.on}`)
      .join(' ');
    const cols = `t.*${joinSelects ? ', ' + joinSelects : ''}`;
    return { cols, joinClauses };
  }

  sanitize(row) {
    if (!row) return row;
    const sensitive = this.entity.sensitive || [];
    if (sensitive.length === 0) return row;
    const clean = { ...row };
    sensitive.forEach((f) => delete clean[f]);
    return clean;
  }

  // ---------------------------------------------------------------
  // LIST (pagination + search + filter + sort + joins)
  // ---------------------------------------------------------------
  async findAll(reqQuery) {
    const { whereSql, params, orderBy, page, limit, offset } = buildListQuery(
      this.entity,
      reqQuery,
      't'
    );
    const { cols, joinClauses } = this.buildSelectClause();

    const dataSql = `
      SELECT ${cols}
      FROM ${this.table} t
      ${joinClauses}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`;
    const rows = await query(dataSql, [...params, limit, offset]);

    const countSql = `SELECT COUNT(*) AS total FROM ${this.table} t ${joinClauses} ${whereSql}`;
    const countRows = await query(countSql, params);
    const total = countRows[0]?.total || 0;

    return {
      rows: rows.map((r) => this.sanitize(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ---------------------------------------------------------------
  // GET BY ID (enriched with joins)
  // ---------------------------------------------------------------
  async findById(id) {
    const { cols, joinClauses } = this.buildSelectClause();
    const sql = `SELECT ${cols} FROM ${this.table} t ${joinClauses} WHERE t.${this.pk} = ? LIMIT 1`;
    const rows = await query(sql, [id]);
    if (rows.length === 0) return null;
    return this.sanitize(rows[0]);
  }

  async existsById(id) {
    const rows = await query(
      `SELECT ${this.pk} FROM ${this.table} WHERE ${this.pk} = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0;
  }

  pickFillable(body) {
    const out = {};
    (this.entity.fillable || []).forEach((f) => {
      if (body[f] !== undefined) out[f] = body[f];
    });
    return out;
  }

  // ---------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------
  async create(body) {
    const data = this.pickFillable(body);
    await this.validateForeignKeys(data);
    await this.validateUnique(data);

    const columns = Object.keys(data);
    if (columns.length === 0) {
      throw ApiError.badRequest('No valid fields provided');
    }
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((c) => data[c]);

    const sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await query(sql, values);

    if (this.pk) {
      return this.findById(result.insertId);
    }
    return data; // composite-key tables
  }

  // ---------------------------------------------------------------
  // UPDATE (partial)
  // ---------------------------------------------------------------
  async update(id, body) {
    const existing = await this.findById(id);
    if (!existing) throw ApiError.notFound(`${this.table} record not found`);

    const data = this.pickFillable(body);
    if (Object.keys(data).length === 0) {
      throw ApiError.badRequest('No valid fields provided to update');
    }

    await this.validateForeignKeys({ ...existing, ...data });
    await this.validateUnique(data, id);

    const setClause = Object.keys(data)
      .map((c) => `${c} = ?`)
      .join(', ');
    const values = Object.values(data);
    values.push(id);

    await query(`UPDATE ${this.table} SET ${setClause} WHERE ${this.pk} = ?`, values);
    return this.findById(id);
  }

  // ---------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------
  async remove(id) {
    const existing = await this.findById(id);
    if (!existing) throw ApiError.notFound(`${this.table} record not found`);
    await query(`DELETE FROM ${this.table} WHERE ${this.pk} = ?`, [id]);
    return true;
  }

  // ---------------------------------------------------------------
  // Composite-key helpers (project_departments / project_partners)
  // ---------------------------------------------------------------
  async findByCompositeKey(keyValues) {
    const [k1, k2] = this.entity.compositeKey;
    const rows = await query(
      `SELECT * FROM ${this.table} WHERE ${k1} = ? AND ${k2} = ? LIMIT 1`,
      [keyValues[k1], keyValues[k2]]
    );
    return rows[0] || null;
  }

  async removeByCompositeKey(keyValues) {
    const [k1, k2] = this.entity.compositeKey;
    const existing = await this.findByCompositeKey(keyValues);
    if (!existing) throw ApiError.notFound('Association not found');
    await query(`DELETE FROM ${this.table} WHERE ${k1} = ? AND ${k2} = ?`, [
      keyValues[k1],
      keyValues[k2],
    ]);
    return true;
  }
}

module.exports = { BaseRepository, withTransaction };
