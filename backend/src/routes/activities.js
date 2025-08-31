const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/activities - List activities by user (new schema)
router.get('/', async (req, res) => {
  try {
    const { user_id, limit = 100 } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const limitNum = Math.max(1, Math.min(Number(limit), 500));

    const result = await db.query(
      `SELECT id, user_id, title, short_description, category_id, polarity, created_at
       FROM activities
       WHERE user_id = $1 OR user_id = md5('bootstrap_user_v1')
       ORDER BY created_at DESC
       LIMIT $2`,
      [user_id, limitNum]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/activities/:id - Fetch full activity config for editing
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    // Base
    const base = await db.query(
      `SELECT id, user_id, title, short_description, category_id, polarity, created_at
       FROM activities WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    if (base.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Attributes
    const attrs = await db.query(
      `SELECT attribute_id, value, polarity, model
       FROM activity_attribute_entries WHERE activity_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    // Measures
    const meas = await db.query(
      `SELECT key, label, unit, decimals, min_per_entry, max_per_entry, step, default_value
       FROM activity_measures WHERE activity_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    // Derived
    const der = await db.query(
      `SELECT key, label, formula FROM activity_derived_measures WHERE activity_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    // Scoring
    const sco = await db.query(
      `SELECT mode, rounding, precision, allow_negative, base_points FROM activity_scoring WHERE activity_id = $1`,
      [id]
    );
    const scoring = sco.rows[0] || null;
    let scoringDetails = {};
    if (scoring) {
      if (scoring.mode === 'simple') {
        const r = await db.query(`SELECT measure_ref, points_per_unit FROM activity_scoring_simple WHERE activity_id = $1`, [id]);
        scoringDetails.simple = r.rows[0] || null;
      } else if (scoring.mode === 'linear') {
        const r = await db.query(`SELECT measure_ref, points_per_unit, cap_units FROM activity_scoring_linear_terms WHERE activity_id = $1`, [id]);
        scoringDetails.linear = { terms: r.rows };
      } else if (scoring.mode === 'formula') {
        const r = await db.query(`SELECT expression, clamp_min, clamp_max FROM activity_scoring_formula WHERE activity_id = $1`, [id]);
        scoringDetails.formula = r.rows[0] || null;
      }
    }

    res.json({
      data: {
        ...base.rows[0],
        attributes: {
          model: attrs.rows[0]?.model || 'weights',
          entries: attrs.rows.map(a => ({ attribute_id: a.attribute_id, value: a.value, polarity: a.polarity }))
        },
        measures: meas.rows.map(m => ({
          key: m.key, label: m.label, unit: m.unit, decimals: m.decimals,
          min: m.min_per_entry, max: m.max_per_entry, step: m.step, default: m.default_value
        })),
        derived_measures: der.rows.map(d => ({ key: d.key, label: d.label, formula: d.formula })),
        scoring: scoring ? {
          mode: scoring.mode,
          rounding: scoring.rounding,
          precision: scoring.precision,
          allowNegative: scoring.allow_negative,
          basePoints: scoring.base_points,
          ...scoringDetails
        } : null
      }
    });
  } catch (err) {
    console.error('Error fetching activity details:', err);
    res.status(500).json({ error: 'Failed to fetch activity details' });
  }
});

// POST /api/activities - Create or update activity (new schema)
router.post('/', async (req, res) => {
  try {
    const {
      id,
      user_id,
      title,
      short_description = null,
      category_id = null,
      polarity = 'positive',
      attributes = null,
      measures = null,
      derived_measures = null,
      scoring = null,
    } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    const activityId = id || uuidv4();

    // Ownership guard: if updating an existing activity (id provided), ensure it belongs to this user
    if (id) {
      const owner = await db.query('SELECT user_id FROM activities WHERE id = $1', [id]);
      if (owner.rows.length > 0 && owner.rows[0].user_id !== user_id) {
        return res.status(403).json({ error: 'Not allowed to modify this activity' });
      }
    }

    // Begin transaction
    await db.query('BEGIN');

    const activityIns = await db.query(
      `INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         short_description = EXCLUDED.short_description,
         category_id = EXCLUDED.category_id,
         polarity = EXCLUDED.polarity
       RETURNING id, user_id, title, short_description, category_id, polarity, created_at`,
      [activityId, user_id, title.trim(), short_description, category_id, polarity]
    );

    // Attributes entries
    if (attributes && Array.isArray(attributes.entries)) {
      const entries = attributes.entries
        .filter(e => e && e.attribute_id)
        .map(e => ({
          id: uuidv4(),
          activity_id: activityId,
          attribute_id: e.attribute_id,
          value: e.value ?? null,
          polarity: e.polarity || 'positive',
          model: e.model || attributes.model || 'weights',
        }));

      if (entries.length > 0) {
        // Upsert strategy: delete existing rows for this activity then insert new set
        await db.query('DELETE FROM activity_attribute_entries WHERE activity_id = $1', [activityId]);

        const values = [];
        const placeholders = entries.map((row, i) => {
          const base = i * 6;
          values.push(row.id, row.activity_id, row.attribute_id, row.value, row.polarity, row.model);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
        }).join(',');

        await db.query(
          `INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
           VALUES ${placeholders}`,
          values
        );
      } else {
        // If no entries provided, ensure table has none for this activity
        await db.query('DELETE FROM activity_attribute_entries WHERE activity_id = $1', [activityId]);
      }
    }

    // Measures
    if (Array.isArray(measures)) {
      await db.query('DELETE FROM activity_measures WHERE activity_id = $1', [activityId]);
      if (measures.length > 0) {
        const rows = measures.map(m => ({
          id: uuidv4(),
          activity_id: activityId,
          key: (m.key || '').trim(),
          label: (m.label || '').trim() || (m.key || '').trim(),
          unit: (m.unit || 'custom'),
          decimals: Math.max(0, Math.min(Number(m.decimals ?? 0), 3)),
          min_per_entry: m.min != null ? Number(m.min) : null,
          max_per_entry: m.max != null ? Number(m.max) : null,
          step: m.step != null ? Number(m.step) : null,
          default_value: m.default != null ? Number(m.default) : null,
        })).filter(r => r.key);
        if (rows.length > 0) {
          const values = [];
          const placeholders = rows.map((r, i) => {
            const b = i * 10;
            values.push(r.id, r.activity_id, r.key, r.label, r.unit, r.decimals, r.min_per_entry, r.max_per_entry, r.step, r.default_value);
            return `($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}, $${b+8}, $${b+9}, $${b+10})`;
          }).join(',');
          await db.query(
            `INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals, min_per_entry, max_per_entry, step, default_value)
             VALUES ${placeholders}`,
            values
          );
        }
      }
    }

    // Derived measures
    if (Array.isArray(derived_measures)) {
      await db.query('DELETE FROM activity_derived_measures WHERE activity_id = $1', [activityId]);
      if (derived_measures.length > 0) {
        const rows = derived_measures.map(d => ({
          id: uuidv4(),
          activity_id: activityId,
          key: (d.key || '').trim(),
          label: (d.label || '').trim() || (d.key || '').trim(),
          formula: (d.formula || '').trim(),
        })).filter(r => r.key && r.formula);
        if (rows.length > 0) {
          const values = [];
          const placeholders = rows.map((r, i) => {
            const b = i * 5;
            values.push(r.id, r.activity_id, r.key, r.label, r.formula);
            return `($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5})`;
          }).join(',');
          await db.query(
            `INSERT INTO activity_derived_measures (id, activity_id, key, label, formula)
             VALUES ${placeholders}`,
            values
          );
        }
      }
    }

    // Scoring
    if (scoring && typeof scoring === 'object') {
      // wipe children first
      await db.query('DELETE FROM activity_scoring_simple WHERE activity_id = $1', [activityId]);
      await db.query('DELETE FROM activity_scoring_linear_terms WHERE activity_id = $1', [activityId]);
      await db.query('DELETE FROM activity_scoring_formula WHERE activity_id = $1', [activityId]);
      // base row
      const base = {
        mode: scoring.mode || 'simple',
        rounding: scoring.rounding || 'none',
        precision: Math.max(0, Math.min(Number(scoring.precision ?? 0), 3)),
        allow_negative: scoring.allowNegative !== false,
        base_points: scoring.basePoints != null ? Number(scoring.basePoints) : null,
      };
      await db.query(
        `INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (activity_id) DO UPDATE SET
           mode = EXCLUDED.mode,
           rounding = EXCLUDED.rounding,
           precision = EXCLUDED.precision,
           allow_negative = EXCLUDED.allow_negative,
           base_points = EXCLUDED.base_points`,
        [activityId, base.mode, base.rounding, base.precision, base.allow_negative, base.base_points]
      );

      if (base.mode === 'simple' && scoring.simple) {
        await db.query(
          `INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
           VALUES ($1, $2, $3)
           ON CONFLICT (activity_id) DO UPDATE SET measure_ref = EXCLUDED.measure_ref, points_per_unit = EXCLUDED.points_per_unit`,
          [activityId, (scoring.simple.measureRef || '').trim(), scoring.simple.pointsPerUnit != null ? Number(scoring.simple.pointsPerUnit) : null]
        );
      } else if (base.mode === 'linear' && Array.isArray(scoring.linear?.terms)) {
        const rows = scoring.linear.terms.map(t => ({
          id: uuidv4(),
          activity_id: activityId,
          measure_ref: (t.measureRef || '').trim(),
          points_per_unit: t.pointsPerUnit != null ? Number(t.pointsPerUnit) : null,
          cap_units: t.capUnits != null ? Number(t.capUnits) : null,
        })).filter(r => r.measure_ref);
        if (rows.length > 0) {
          const values = [];
          const placeholders = rows.map((r, i) => {
            const b = i * 5;
            values.push(r.id, r.activity_id, r.measure_ref, r.points_per_unit, r.cap_units);
            return `($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5})`;
          }).join(',');
          await db.query(
            `INSERT INTO activity_scoring_linear_terms (id, activity_id, measure_ref, points_per_unit, cap_units)
             VALUES ${placeholders}`,
            values
          );
        }
      } else if (base.mode === 'formula' && scoring.formula) {
        await db.query(
          `INSERT INTO activity_scoring_formula (activity_id, expression, clamp_min, clamp_max)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (activity_id) DO UPDATE SET expression = EXCLUDED.expression, clamp_min = EXCLUDED.clamp_min, clamp_max = EXCLUDED.clamp_max`,
          [activityId, (scoring.formula.expression || '').trim(), scoring.formula.clamp?.min != null ? Number(scoring.formula.clamp.min) : null, scoring.formula.clamp?.max != null ? Number(scoring.formula.clamp.max) : null]
        );
      }
    }

    await db.query('COMMIT');

    res.status(201).json({ data: activityIns.rows[0] });
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// DELETE /api/activities/:id - Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const result = await db.query(
      'DELETE FROM activities WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
