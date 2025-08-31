const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');

const router = express.Router();

// Create lançamento with measures
router.post('/', async (req, res) => {
  const client = await db.getClient();
  try {
    const {
      user_id, // TODO: replace with auth when available
      activity_id,
      start_at,
      end_at,
      origin = 'manual',
      notes = null,
      measures = {} // { key: numeric }
    } = req.body || {};

    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });
    if (!activity_id) return res.status(400).json({ error: 'activity_id obrigatório' });
    if (!start_at || !end_at) return res.status(400).json({ error: 'start_at e end_at obrigatórios' });

    const start = new Date(start_at);
    const end = new Date(end_at);
    if (isNaN(+start) || isNaN(+end) || end < start) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const duration_min = Math.round((end.getTime() - start.getTime()) / 60000);

    await client.query('BEGIN');

    const lancId = crypto.randomUUID();
    await client.query(
      `INSERT INTO lancamentos (id, user_id, activity_id, start_at, end_at, duration_min, origin, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [lancId, user_id, activity_id, start.toISOString(), end.toISOString(), duration_min, origin, notes]
    );

    // Map measure keys to activity_measure ids
    const keys = Object.keys(measures || {});
    if (keys.length > 0) {
      const { rows: defs } = await client.query(
        `SELECT id, key FROM activity_measures WHERE activity_id = $1 AND key = ANY($2::text[])`,
        [activity_id, keys]
      );
      const byKey = new Map(defs.map(r => [r.key, r.id]));

      for (const k of keys) {
        const valRaw = measures[k];
        if (valRaw === undefined || valRaw === null || valRaw === '') continue;
        const val = Number(valRaw);
        if (!isFinite(val)) continue;
        const measureId = byKey.get(k);
        if (!measureId) continue; // ignore unknown keys
        await client.query(
          `INSERT INTO lancamento_measures (id, lancamento_id, activity_measure_id, value)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (lancamento_id, activity_measure_id) DO UPDATE SET value = EXCLUDED.value`,
          [crypto.randomUUID(), lancId, measureId, val]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: lancId,
      user_id,
      activity_id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      duration_min,
      origin,
      notes,
      measures
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar lançamento:', err);
    res.status(500).json({ error: 'Erro ao criar lançamento' });
  } finally {
    client.release();
  }
});

// List lançamentos (paginated)
// Query: user_id (required), activity_id (optional), page, limit
router.get('/', async (req, res) => {
  try {
    const { user_id, activity_id } = req.query || {};
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) limit = 20;
    const offset = (page - 1) * limit;

    const params = [user_id];
    let where = 'WHERE l.user_id = $1';
    if (activity_id) { params.push(activity_id); where += ` AND l.activity_id = $${params.length}`; }

    const { rows: items } = await db.query(
      `SELECT l.*
       FROM lancamentos l
       ${where}
       ORDER BY l.start_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    if (items.length === 0) return res.json({ data: [], page, limit, total: 0 });

    const ids = items.map(r => r.id);
    const { rows: measureRows } = await db.query(
      `SELECT lm.lancamento_id, am.key, lm.value
       FROM lancamento_measures lm
       JOIN activity_measures am ON am.id = lm.activity_measure_id
       WHERE lm.lancamento_id = ANY($1::text[])`,
      [ids]
    );
    const measuresByLanc = new Map();
    for (const r of measureRows) {
      if (!measuresByLanc.has(r.lancamento_id)) measuresByLanc.set(r.lancamento_id, {});
      measuresByLanc.get(r.lancamento_id)[r.key] = Number(r.value);
    }

    const data = items.map(it => ({ ...it, measures: measuresByLanc.get(it.id) || {} }));

    // total count (without pagination)
    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*)::int AS count FROM lancamentos l ${where}`,
      params
    );

    res.json({ data, page, limit, total: count });
  } catch (err) {
    console.error('Erro ao listar lançamentos:', err);
    res.status(500).json({ error: 'Erro ao listar lançamentos' });
  }
});

// Get lançamento by id (with measures)
// Query: user_id (required)
router.get('/:id', async (req, res) => {
  try {
    const { user_id } = req.query || {};
    const { id } = req.params;
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

    const { rows } = await db.query(
      `SELECT * FROM lancamentos WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const lanc = rows[0];
    const { rows: ms } = await db.query(
      `SELECT am.key, lm.value
       FROM lancamento_measures lm
       JOIN activity_measures am ON am.id = lm.activity_measure_id
       WHERE lm.lancamento_id = $1`,
      [id]
    );
    const measures = {};
    for (const r of ms) measures[r.key] = Number(r.value);

    res.json({ ...lanc, measures });
  } catch (err) {
    console.error('Erro ao buscar lançamento:', err);
    res.status(500).json({ error: 'Erro ao buscar lançamento' });
  }
});

// Update lançamento and measures
router.put('/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const {
      user_id, // required for ownership check until auth
      activity_id,
      start_at,
      end_at,
      origin,
      notes,
      measures = {}
    } = req.body || {};

    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });
    if (!start_at || !end_at) return res.status(400).json({ error: 'start_at e end_at obrigatórios' });

    const start = new Date(start_at);
    const end = new Date(end_at);
    if (isNaN(+start) || isNaN(+end) || end < start) return res.status(400).json({ error: 'Período inválido' });
    const duration_min = Math.round((end.getTime() - start.getTime()) / 60000);

    await client.query('BEGIN');

    // ensure ownership
    const { rowCount } = await client.query(
      `UPDATE lancamentos
       SET activity_id = $1, start_at = $2, end_at = $3, duration_min = $4, origin = COALESCE($5, origin), notes = $6
       WHERE id = $7 AND user_id = $8`,
      [activity_id, start.toISOString(), end.toISOString(), duration_min, origin || null, notes || null, id, user_id]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    // Map measure keys to activity_measure ids for the target activity
    const keys = Object.keys(measures || {});
    const { rows: defs } = await client.query(
      `SELECT id, key FROM activity_measures WHERE activity_id = $1`,
      [activity_id]
    );
    const byKey = new Map(defs.map(r => [r.key, r.id]));

    // Delete measures not in payload (for this lancamento)
    if (keys.length > 0) {
      const keepIds = keys.map(k => byKey.get(k)).filter(Boolean);
      if (keepIds.length > 0) {
        await client.query(
          `DELETE FROM lancamento_measures
           WHERE lancamento_id = $1 AND activity_measure_id NOT IN (${keepIds.map((_,i)=>`$${i+2}`).join(',')})`,
          [id, ...keepIds]
        );
      } else {
        // none to keep -> clear all
        await client.query(`DELETE FROM lancamento_measures WHERE lancamento_id = $1`, [id]);
      }
    } else {
      // if no measures provided, clear all
      await client.query(`DELETE FROM lancamento_measures WHERE lancamento_id = $1`, [id]);
    }

    // Upsert provided measures
    for (const k of keys) {
      const valRaw = measures[k];
      if (valRaw === undefined || valRaw === null || valRaw === '') continue;
      const val = Number(valRaw);
      if (!isFinite(val)) continue;
      const measureId = byKey.get(k);
      if (!measureId) continue;
      await client.query(
        `INSERT INTO lancamento_measures (id, lancamento_id, activity_measure_id, value)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (lancamento_id, activity_measure_id) DO UPDATE SET value = EXCLUDED.value`,
        [crypto.randomUUID(), id, measureId, val]
      );
    }

    await client.query('COMMIT');

    res.json({ id, user_id, activity_id, start_at: start.toISOString(), end_at: end.toISOString(), duration_min, origin, notes, measures });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar lançamento:', err);
    res.status(500).json({ error: 'Erro ao atualizar lançamento' });
  } finally {
    client.release();
  }
});

// Delete lançamento (and cascade measures)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query || req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

    const { rowCount } = await db.query(`DELETE FROM lancamentos WHERE id = $1 AND user_id = $2`, [id, user_id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao deletar lançamento:', err);
    res.status(500).json({ error: 'Erro ao deletar lançamento' });
  }
});

module.exports = router;
