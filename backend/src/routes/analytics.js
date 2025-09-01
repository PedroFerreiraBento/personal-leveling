const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// GET /api/analytics/daily?user_id=...&year=2025&month=8
router.get('/daily', async (req, res) => {
  try {
    const { user_id } = req.query || {};
    let { year, month } = req.query || {};
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });
    year = parseInt(year, 10);
    month = parseInt(month, 10);
    const now = new Date();
    if (!Number.isFinite(year)) year = now.getFullYear();
    if (!Number.isFinite(month) || month < 1 || month > 12) month = now.getMonth() + 1;

    // Use LOCAL month bounds
    const start = new Date(year, month - 1, 1, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0); // exclusive

    // Pull minimal fields needed for aggregation + activity metadata
    const { rows } = await db.query(
      `SELECT l.id, l.activity_id, l.start_at, l.end_at, l.duration_min, l.origin,
              a.category_id, a.polarity
       FROM lancamentos l
       LEFT JOIN activities a ON a.id = l.activity_id
       WHERE l.user_id = $1
         AND l.start_at < $3
         AND l.end_at   >= $2
       ORDER BY l.start_at ASC`,
      [user_id, start.toISOString(), end.toISOString()]
    );

    // User config (could come from DB later)
    const ACTIVE_START_HOUR = 6;  // 06:00 local
    const ACTIVE_END_HOUR = 23;   // 23:00 local
    const TARGET_MINUTES = 6 * 60; // 6h úteis/dia

    const byDay = new Map();
    // Preload attribute weights for involved activities (weights model)
    const actIds = Array.from(new Set(rows.map(r => r.activity_id).filter(Boolean)));
    const attrWeights = new Map(); // activity_id -> signed sum of weights
    async function loadAttrWeights(ids){
      if (!ids || ids.length===0) return;
      const placeholders = ids.map((_, i) => `$${i+1}`).join(',');
      const q = await db.query(
        `SELECT activity_id, value, polarity FROM activity_attribute_entries WHERE activity_id IN (${placeholders})`,
        ids
      );
      for (const r of q.rows) {
        const sign = (r.polarity === 'negative') ? -1 : 1;
        attrWeights.set(r.activity_id, (attrWeights.get(r.activity_id) || 0) + (Number(r.value) || 0) * sign);
      }
    }
    await loadAttrWeights(actIds);

    for (const r of rows) {
      // Split cross-midnight into LOCAL per-day [s,e)
      const s = new Date(r.start_at);
      const e = new Date(r.end_at);
      if (!(s < e)) continue;

      let cur = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
      while (cur < e) {
        const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0);
        const segStart = new Date(Math.max(cur.getTime(), s.getTime()));
        const segEnd = new Date(Math.min(next.getTime(), e.getTime()));

        const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
        if (!byDay.has(key)) byDay.set(key, { intervals: [], has_timer: false, has_negative: false, categories: new Map(), net_raw: 0 });
        const bag = byDay.get(key);

        bag.intervals.push([segStart.getTime(), segEnd.getTime()]);
        if (r.origin === 'timer') bag.has_timer = true;
        if (r.polarity === 'negative') bag.has_negative = true;
        const minutes = Math.round((segEnd - segStart) / 60000);
        if (r.category_id) bag.categories.set(r.category_id, (bag.categories.get(r.category_id) || 0) + minutes);
        // Net attribute contribution: signed attribute weights * hours in this segment
        const w = attrWeights.get(r.activity_id) || 0;
        bag.net_raw += w * (minutes / 60);

        cur = next;
      }
    }

    // Helper: merge overlaps and sum minutes
    function mergedMinutes(intervals) {
      if (!intervals || intervals.length === 0) return 0;
      intervals.sort((a,b)=> a[0]-b[0]);
      let total = 0, [cs, ce] = intervals[0];
      for (let i=1;i<intervals.length;i++){
        const [s,e] = intervals[i];
        if (s <= ce) ce = Math.max(ce, e); else { total += (ce - cs); cs = s; ce = e; }
      }
      total += (ce - cs);
      return Math.round(total / 60000);
    }

    // For 28-day normalization window (ending at month end)
    const normStart = new Date(end.getTime() - 28*24*60*60*1000);
    const { rows: rows28 } = await db.query(
      `SELECT l.id, l.activity_id, l.start_at, l.end_at
       FROM lancamentos l
       WHERE l.user_id = $1 AND l.start_at < $3 AND l.end_at >= $2
       ORDER BY l.start_at ASC`,
      [user_id, normStart.toISOString(), end.toISOString()]
    );
    const byDay28 = new Map(); // dayStr -> net_raw
    // Ensure weights cover all activities in 28d window
    const actIds28 = Array.from(new Set(rows28.map(r=>r.activity_id).filter(Boolean)));
    const missing = actIds28.filter(id => !attrWeights.has(id));
    await loadAttrWeights(missing);
    if (rows28.length) {
      for (const r of rows28) {
        const s = new Date(r.start_at); const e = new Date(r.end_at); if (!(s<e)) continue;
        let cur = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
        while (cur < e) {
          const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()+1, 0,0,0);
          const segStart = new Date(Math.max(cur.getTime(), s.getTime()));
          const segEnd = new Date(Math.min(next.getTime(), e.getTime()));
          const minutes = Math.max(0, Math.round((segEnd - segStart)/60000));
          if (minutes>0){
            const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            const w = attrWeights.get(r.activity_id) || 0;
            byDay28.set(key, (byDay28.get(key)||0) + w * (minutes/60));
          }
          cur = next;
        }
      }
    }

    function percentile(values, p){
      if (!values.length) return 0;
      const arr = [...values].sort((a,b)=>a-b);
      const idx = Math.min(arr.length-1, Math.max(0, Math.round((p/100)*(arr.length-1))));
      return arr[idx];
    }
    const windowVals = Array.from(byDay28.values());
    const p5 = percentile(windowVals, 5);
    const p95 = percentile(windowVals, 95);

    function normalizeNet(v){
      if (!isFinite(v) || (p5===0 && p95===0)) return 0;
      if (v >= 0) {
        const denom = (p95 !== 0) ? Math.abs(p95) : 1;
        return Math.max(0, Math.min(1, v / denom));
      } else {
        const denom = (p5 !== 0) ? Math.abs(p5) : 1;
        return -Math.max(0, Math.min(1, Math.abs(v) / denom));
      }
    }

    // Build response array for the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const bag = byDay.get(key) || { intervals: [], has_timer: false, has_negative: false, categories: new Map(), net_raw: 0 };

      // Active window in local time
      const activeStart = new Date(year, month-1, d, ACTIVE_START_HOUR, 0, 0);
      const activeEnd = new Date(year, month-1, d, ACTIVE_END_HOUR, 0, 0);
      const activeWindow = [[activeStart.getTime(), activeEnd.getTime()]];

      // Intersect recorded intervals with active window for coverage
      const intervals = bag.intervals;
      const clipped = [];
      for (const [s,e] of intervals){
        const cs = Math.max(s, activeWindow[0][0]);
        const ce = Math.min(e, activeWindow[0][1]);
        if (ce > cs) clipped.push([cs, ce]);
      }
      const used_minutes = mergedMinutes(intervals);
      const covered_minutes = mergedMinutes(clipped);
      const active_minutes = Math.max(0, Math.round((activeEnd - activeStart) / 60000));

      const target_minutes = TARGET_MINUTES;
      const target_pct = target_minutes > 0 ? Math.min(1, used_minutes / target_minutes) : 0;
      const coverage_pct = active_minutes > 0 ? Math.min(1, covered_minutes / active_minutes) : 0;

      const net_raw = bag.net_raw || 0;
      const net_norm = normalizeNet(net_raw); // [-1..1]

      // Top categories (IDs for now; frontend can map if needed)
      const top = Array.from(bag.categories.entries())
        .sort((a,b)=> b[1]-a[1])
        .slice(0,5)
        .map(([name, minutes]) => ({ name, minutes }));

      data.push({
        day: key,
        used_minutes,
        active_window_minutes: active_minutes,
        coverage_pct,
        target_minutes,
        target_pct,
        net_raw,
        net_norm,
        has_negative: !!bag.has_negative,
        has_timer: !!bag.has_timer,
        hit_target: used_minutes >= target_minutes,
        top_categories: top
      });
    }

    res.json({ data });
  } catch (err) {
    console.error('Erro em /api/analytics/daily:', err);
    res.status(500).json({ error: 'Erro ao calcular agregados diários' });
  }
});

module.exports = router;
 
// GET /api/analytics/day?user_id=...&day=YYYY-MM-DD
router.get('/day', async (req, res) => {
  try {
    const { user_id, day } = req.query || {};
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'day inválido (YYYY-MM-DD)' });

    const [y,m,d] = day.split('-').map(Number);
    // Use LOCAL midnight bounds for the requested day
    const start = new Date(y, m-1, d, 0, 0, 0);
    const end = new Date(y, m-1, d+1, 0, 0, 0);

    const { rows } = await db.query(
      `SELECT l.id, l.start_at, l.end_at, l.duration_min, l.origin,
              a.id as activity_id, a.title as activity_title, a.category_id, a.polarity
       FROM lancamentos l
       LEFT JOIN activities a ON a.id = l.activity_id
       WHERE l.user_id = $1 AND l.start_at < $3 AND l.end_at >= $2
       ORDER BY l.start_at ASC`,
      [user_id, start.toISOString(), end.toISOString()]
    );

    const ACTIVE_START_HOUR = 6;
    const ACTIVE_END_HOUR = 23;
    const TARGET_MINUTES = 6*60;

    const segments = [];
    const categories = new Map();
    const activities = new Map();

    for (const r of rows){
      const s = new Date(r.start_at); const e = new Date(r.end_at);
      if (!(s < e)) continue;
      const segStart = new Date(Math.max(s.getTime(), start.getTime()));
      const segEnd = new Date(Math.min(e.getTime(), end.getTime()));
      if (!(segEnd > segStart)) continue;
      const minutes = Math.round((segEnd - segStart)/60000);
      if (r.category_id) categories.set(r.category_id, (categories.get(r.category_id)||0)+minutes);
      if (r.activity_id) activities.set(r.activity_id, { id:r.activity_id, title:r.activity_title, minutes:(activities.get(r.activity_id)?.minutes||0)+minutes });
      segments.push({ start: segStart.toISOString(), end: segEnd.toISOString(), category_id: r.category_id, activity_id: r.activity_id, activity_title: r.activity_title, origin: r.origin });
    }

    // KPIs
    function mergedMinutes(intervals){
      if (intervals.length===0) return 0;
      intervals.sort((a,b)=>a[0]-b[0]);
      let total=0; let [cs,ce]=intervals[0];
      for (let i=1;i<intervals.length;i++){ const [s,e]=intervals[i]; if (s<=ce) ce=Math.max(ce,e); else { total+=ce-cs; cs=s; ce=e; } }
      total+=ce-cs; return Math.round(total/60000);
    }
    const intervals = segments.map(s=>[new Date(s.start).getTime(), new Date(s.end).getTime()]);
    const used_minutes = mergedMinutes(intervals);
    const activeStart = new Date(y, m-1, d, ACTIVE_START_HOUR, 0, 0);
    const activeEnd = new Date(y, m-1, d, ACTIVE_END_HOUR, 0, 0);
    const active_minutes = Math.max(0, Math.round((activeEnd-activeStart)/60000));
    const clipped = intervals.map(([s,e])=>[Math.max(s, activeStart.getTime()), Math.min(e, activeEnd.getTime())]).filter(([s,e])=>e>s);
    const covered_minutes = mergedMinutes(clipped);
    const target_minutes = TARGET_MINUTES;
    const target_pct = target_minutes>0 ? Math.min(1, used_minutes/target_minutes) : 0;
    const coverage_pct = active_minutes>0 ? Math.min(1, covered_minutes/active_minutes) : 0;

    res.json({
      day,
      used_minutes,
      active_window_minutes: active_minutes,
      coverage_pct,
      target_minutes,
      target_pct,
      count: rows.length,
      categories: Array.from(categories.entries()).map(([id, minutes])=>({ id, minutes })),
      activities: Array.from(activities.values()).sort((a,b)=>b.minutes-a.minutes).slice(0,10),
      segments
    });
  } catch (err) {
    console.error('Erro em /api/analytics/day:', err);
    res.status(500).json({ error: 'Erro ao calcular dia' });
  }
});
