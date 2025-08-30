import React from 'react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-inner">
        <span>v0.1.0</span>
        <span className="sep" />
        <span>© {new Date().getFullYear()} Personal Leveling</span>
      </div>
    </footer>
  )
}

export default Footer
