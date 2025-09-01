import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'
import MonthlyCalendar from './dashboard/MonthlyCalendar'
import DailyDrawer from './dashboard/DailyDrawer'
import CalendarLegend from './dashboard/CalendarLegend'
import WeeklyFocus from './dashboard/WeeklyFocus'

function Dashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [days, setDays] = useState([])
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const ymLabel = useMemo(() => new Date(year, month-1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }), [year, month])

  useEffect(() => {
    let canceled = false
    async function load() {
      setError('')
      try {
        const res = await axios.get(`/api/analytics/daily?user_id=${user.id}&year=${year}&month=${month}`)
        if (!canceled) setDays(res.data?.data || [])
      } catch (e) {
        console.warn('Aggregates endpoint missing, using mock data')
        if (!canceled) setDays(mockMonth(year, month))
      }
    }
    load()
    return () => { canceled = true }
  }, [user.id, year, month])

  const onSelectDay = (dateStr) => { setSelectedDay(dateStr) }
  const onQuickNew = (dateStr) => {
    // TODO: open New Entry pre-filled to nearest gap
    console.log('quick new entry', dateStr)
  }

  const prevMonth = () => {
    const d = new Date(year, month-2, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth()+1)
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth()+1)
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Personal Leveling</h1>
        <div className="month-switcher">
          <button className="btn btn-secondary" onClick={prevMonth} aria-label="Mês anterior">←</button>
          <strong style={{textTransform:'capitalize'}}>{ymLabel}</strong>
          <button className="btn btn-secondary" onClick={nextMonth} aria-label="Próximo mês">→</button>
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="error">{error}</div>}
        <WeeklyFocus days={days} referenceDay={selectedDay || `${year}-${String(month).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`} />
        <MonthlyCalendar
          year={year}
          month={month}
          data={days}
          onSelectDay={onSelectDay}
          onQuickNew={onQuickNew}
        />
        <CalendarLegend />
        {selectedDay && (
          <DailyDrawer
            date={selectedDay}
            onClose={() => setSelectedDay('')}
            data={days.find(d => d.day === selectedDay)}
            userId={user.id}
          />
        )}
      </main>
    </div>
  )
}

export default Dashboard

// simple mock month generator to keep UI functional until backend is ready
function mockMonth(year, month){
  const daysInMonth = new Date(year, month, 0).getDate()
  const arr = []
  for (let d=1; d<=daysInMonth; d++){
    const used = Math.floor(Math.random()*360) // up to 6h
    const target = 360 // 6h
    const active = 17*60 // 06:00-23:00
    const coverage = Math.min(1, used/active)
    const hit = used >= target
    arr.push({
      day: `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      used_minutes: used,
      active_window_minutes: active,
      coverage_pct: coverage,
      target_minutes: target,
      target_pct: Math.min(1, used/target),
      has_negative: Math.random() < 0.15,
      has_timer: Math.random() < 0.35,
      hit_target: hit,
      top_categories: ['Foco 2h10','Movimento 1h05']
    })
  }
  return arr
}
