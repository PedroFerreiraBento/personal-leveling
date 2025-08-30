import React from 'react'
import './Background.css'
import bgEvolveMonster from '../../assets/images/background/1-Evolve_Monster.png'

const Background = () => {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="bg-image" style={{ backgroundImage: `url(${bgEvolveMonster})` }} />
      <div className="bg-overlay" />
      <div className="bg-gradient" />
      <div className="bg-radial" />
      <div className="bg-noise" />
    </div>
  )
}

export default Background
