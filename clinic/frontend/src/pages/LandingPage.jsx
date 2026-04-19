// frontend/src/pages/LandingPage.jsx

import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo from '../assets/logo.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.bgGradient} />
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />
      <div style={styles.bgCircle3} />
      <div style={styles.grid} />

      <div
        style={{
          ...styles.card,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.95)',
          transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={styles.topBar} />

        {/* LOGO */}
        <div style={styles.logoContainer}>
          <div style={styles.outerRing} />
          <div style={styles.spinRing} />
          <img
            src={logo}
            alt="Clinic Logo"
            style={styles.logoImg}
          />
        </div>

        {/* BADGE */}
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          System Online
        </div>

        {/* TEXT */}
        <p style={styles.helloText}>Hello! Welcome to</p>
        <h1 style={styles.mainTitle}>Poblacion Danao Bohol</h1>
        <h2 style={styles.subTitle}>Clinic Appointment System</h2>
        <div style={styles.underline} />

        <p style={styles.desc}>
          Book appointments, view prescriptions, and manage your
          healthcare — all in one place.
        </p>

        {/* FEATURE PILLS */}
        <div style={styles.pillRow}>
          <span style={styles.pill}>📅 Book Appointments</span>
          <span style={styles.pill}>💊 Prescriptions</span>
          <span style={styles.pill}>🔒 Secure & Encrypted</span>
        </div>

        {/* ENTER BUTTON */}
        <button
          style={styles.enterBtn}
          onClick={() => navigate('/login')}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(22,163,74,0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(22,163,74,0.35)';
          }}
        >
          🚀 Enter System →
        </button>

        <p style={styles.footerNote}>
          Powered by Django + React &nbsp;•&nbsp; Secure &amp; Encrypted
        </p>
      </div>

      <p style={styles.pageFooter}>
        © {new Date().getFullYear()} Poblacion Danao Bohol Health Center. All rights reserved.
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap');
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-40px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(40px); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    padding: '20px',
    background: '#0a0f1e',
  },
  bgGradient: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 20% 50%, rgba(22,163,74,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.15) 0%, transparent 50%)',
    zIndex: 0,
  },
  bgCircle1: {
    position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
    background: 'rgba(22,163,74,0.08)', top: '-200px', left: '-150px',
    filter: 'blur(80px)', animation: 'float1 12s ease-in-out infinite', zIndex: 0,
  },
  bgCircle2: {
    position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
    background: 'rgba(234,179,8,0.08)', bottom: '-100px', right: '-100px',
    filter: 'blur(60px)', animation: 'float2 9s ease-in-out infinite', zIndex: 0,
  },
  bgCircle3: {
    position: 'absolute', width: '250px', height: '250px', borderRadius: '50%',
    background: 'rgba(16,185,129,0.1)', top: '30%', right: '15%',
    filter: 'blur(50px)', zIndex: 0,
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '50px 50px', zIndex: 0,
  },
  card: {
    position: 'relative', zIndex: 2,
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '32px',
    padding: '48px 44px 40px',
    maxWidth: '500px', width: '100%',
    textAlign: 'center',
    boxShadow: '0 30px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  topBar: {
    position: 'absolute', top: 0, left: '20%', right: '20%', height: '3px',
    background: 'linear-gradient(90deg, transparent, #16a34a, #eab308, #16a34a, transparent)',
    borderRadius: '0 0 4px 4px',
  },
  logoContainer: {
    position: 'relative', width: '170px', height: '170px',
    margin: '0 auto 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute', inset: '-10px', borderRadius: '50%',
    border: '3px solid rgba(22,163,74,0.5)',
    animation: 'pulseRing 2.5s ease-out infinite',
  },
  spinRing: {
    position: 'absolute', inset: '-4px', borderRadius: '50%',
    border: '2px dashed rgba(22,163,74,0.4)',
    animation: 'spinSlow 12s linear infinite',
  },
  logoImg: {
    width: '170px',
    height: '170px',
    borderRadius: '50%',
    objectFit: 'cover',
    objectPosition: 'center',
    border: '4px solid #16a34a',
    boxShadow: '0 0 0 6px rgba(22,163,74,0.15), 0 0 40px rgba(22,163,74,0.45)',
    animation: 'floatLogo 4s ease-in-out infinite',
    display: 'block',
    backgroundColor: '#ffffff',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)',
    borderRadius: '20px', padding: '4px 14px',
    color: '#4ade80', fontSize: '12px', fontWeight: '600',
    letterSpacing: '1px', marginBottom: '16px', textTransform: 'uppercase',
  },
  badgeDot: {
    width: '7px', height: '7px', borderRadius: '50%',
    background: '#4ade80', display: 'inline-block',
    animation: 'blink 1.5s ease-in-out infinite',
  },
  helloText: {
    color: '#86efac', fontSize: '15px', fontWeight: '500',
    margin: '0 0 6px', letterSpacing: '0.5px',
  },
  mainTitle: {
    color: '#ffffff', fontSize: '30px', fontWeight: '800',
    margin: '0 0 4px', lineHeight: 1.2,
    background: 'linear-gradient(135deg, #ffffff 0%, #86efac 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  subTitle: {
    color: '#4ade80', fontSize: '18px', fontWeight: '700',
    margin: '0 0 16px',
  },
  underline: {
    width: '70px', height: '3px',
    background: 'linear-gradient(90deg, #16a34a, #eab308)',
    borderRadius: '99px', margin: '0 auto 18px',
  },
  desc: {
    color: 'rgba(209,250,229,0.8)', fontSize: '14px',
    lineHeight: '1.7', margin: '0 0 20px',
  },
  pillRow: {
    display: 'flex', flexWrap: 'wrap',
    justifyContent: 'center', gap: '8px', marginBottom: '28px',
  },
  pill: {
    background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)',
    borderRadius: '20px', padding: '5px 12px',
    color: '#86efac', fontSize: '12px', fontWeight: '500',
  },
  enterBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#ffffff', border: 'none', borderRadius: '50px',
    padding: '16px 44px', fontSize: '17px', fontWeight: '700',
    cursor: 'pointer', boxShadow: '0 8px 30px rgba(22,163,74,0.35)',
    transition: 'all 0.3s ease', width: '100%',
    marginBottom: '20px', letterSpacing: '0.3px',
  },
  footerNote: {
    color: 'rgba(255,255,255,0.25)', fontSize: '11px',
    margin: 0, letterSpacing: '0.5px',
  },
  pageFooter: {
    position: 'relative', zIndex: 2, marginTop: '24px',
    color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center',
  },
};