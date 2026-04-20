// frontend/src/pages/LandingPage.jsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo from '../assets/logo.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={styles.page}>
      {/* Background effects */}
      <div style={styles.bgGradient} />
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />
      <div style={styles.grid} />

      {/* Main Card */}
      <div style={{
        ...styles.card,
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={styles.topBar} />

        {/* LOGO */}
        <div style={styles.logoContainer}>
          <div style={styles.spinRing} />
          <div style={styles.pulseRing} />
          <img
            src={logo}
            alt="Poblacion Danao Bohol Clinic Logo"
            style={styles.logoImg}
          />
        </div>

        {/* BADGE */}
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          System Online
        </div>

        {/* TEXT */}
        <p style={styles.helloText}>👋 Hello! Welcome to</p>
        <h1 style={styles.mainTitle}>Clinic Appointment System</h1>
        <p style={styles.subtitle}>Poblacion Danao Bohol</p>

        <div style={styles.divider} />

        <p style={styles.desc}>
          Your trusted healthcare partner — book appointments,
          manage records, and connect with doctors.
        </p>

        {/* FEATURE PILLS */}
        <div style={styles.pillRow}>
          <span style={styles.pill}>📅 Appointments</span>
          <span style={styles.pill}>💊 Prescriptions</span>
          <span style={styles.pill}>🔒 Secure</span>
        </div>

        {/* SIGN UP BUTTON */}
        <button
          style={styles.signupBtn}
          onClick={() => navigate('/login')}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(22,163,74,0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(22,163,74,0.35)';
          }}
        >
          🚀 Sign Up
        </button>

        <p style={styles.loginHint}>
          Already have an account?{' '}
          <span style={styles.loginLink} onClick={() => navigate('/login')}>
            Log in here
          </span>
        </p>

        <p style={styles.footerNote}>
          Powered by Django + React &nbsp;•&nbsp; Secure &amp; Encrypted
        </p>
      </div>

      <p style={styles.pageFooter}>
        © {new Date().getFullYear()} Poblacion Danao Bohol Health Center
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; overflow: hidden; }

        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-9px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0;   }
        }
        @keyframes blink {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.2; }
        }
        @keyframes floatBg {
          0%, 100% { transform: translateY(0px);  }
          50%      { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  /* ── Page ── */
  page: {
    height: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
    fontFamily: "'Poppins', sans-serif",
    background: '#0a0f1e',
    padding: '0 16px',
  },

  bgGradient: {
    position: 'absolute', inset: 0,
    background:
      'radial-gradient(ellipse at 20% 50%, rgba(22,163,74,0.22) 0%, transparent 55%),' +
      'radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.12) 0%, transparent 50%)',
    zIndex: 0,
  },
  bgCircle1: {
    position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
    background: 'rgba(22,163,74,0.07)', top: '-180px', left: '-120px',
    filter: 'blur(70px)', animation: 'floatBg 10s ease-in-out infinite', zIndex: 0,
  },
  bgCircle2: {
    position: 'absolute', width: '350px', height: '350px', borderRadius: '50%',
    background: 'rgba(234,179,8,0.07)', bottom: '-80px', right: '-80px',
    filter: 'blur(60px)', zIndex: 0,
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),' +
      'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '50px 50px', zIndex: 0,
  },

  /* ── Card ── */
  card: {
    position: 'relative', zIndex: 2,
    background: 'rgba(255,255,255,0.045)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '28px',
    padding: '30px 40px 26px',
    maxWidth: '460px', width: '100%',
    textAlign: 'center',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  topBar: {
    position: 'absolute', top: 0, left: '25%', right: '25%', height: '3px',
    background: 'linear-gradient(90deg, transparent, #16a34a, #eab308, #16a34a, transparent)',
    borderRadius: '0 0 4px 4px',
  },

  /* ── Logo ── */
  logoContainer: {
    position: 'relative', width: '130px', height: '130px',
    margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  spinRing: {
    position: 'absolute', inset: '-6px', borderRadius: '50%',
    border: '2px dashed rgba(22,163,74,0.45)',
    animation: 'spinSlow 12s linear infinite',
    pointerEvents: 'none',
  },
  pulseRing: {
    position: 'absolute', inset: '-10px', borderRadius: '50%',
    border: '2px solid rgba(22,163,74,0.4)',
    animation: 'pulseRing 2.5s ease-out infinite',
    pointerEvents: 'none',
  },
  logoImg: {
    width: '130px', height: '130px',
    borderRadius: '50%',
    objectFit: 'cover', objectPosition: 'center',
    border: '4px solid #16a34a',
    boxShadow: '0 0 0 6px rgba(22,163,74,0.12), 0 0 35px rgba(22,163,74,0.45)',
    animation: 'floatLogo 4s ease-in-out infinite',
    backgroundColor: '#fff',
    display: 'block', position: 'relative', zIndex: 1,
  },

  /* ── Badge ── */
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(22,163,74,0.14)', border: '1px solid rgba(22,163,74,0.28)',
    borderRadius: '20px', padding: '3px 12px',
    color: '#4ade80', fontSize: '11px', fontWeight: '600',
    letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase',
  },
  badgeDot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: '#4ade80', display: 'inline-block',
    animation: 'blink 1.5s ease-in-out infinite',
  },

  /* ── Text ── */
  helloText: {
    color: '#86efac', fontSize: '14px', fontWeight: '500',
    margin: '0 0 4px', letterSpacing: '0.3px',
  },
  mainTitle: {
    background: 'linear-gradient(135deg, #ffffff 0%, #86efac 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    fontSize: '22px', fontWeight: '800',
    margin: '0 0 4px', lineHeight: 1.2,
  },
  subtitle: {
    color: '#4ade80', fontSize: '14px', fontWeight: '600',
    margin: '0 0 10px',
  },
  divider: {
    width: '55px', height: '3px',
    background: 'linear-gradient(90deg, #16a34a, #eab308)',
    borderRadius: '99px', margin: '0 auto 12px',
  },
  desc: {
    color: 'rgba(209,250,229,0.75)', fontSize: '13px',
    lineHeight: '1.6', margin: '0 0 14px',
  },

  /* ── Pills ── */
  pillRow: {
    display: 'flex', flexWrap: 'wrap',
    justifyContent: 'center', gap: '7px', marginBottom: '18px',
  },
  pill: {
    background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)',
    borderRadius: '20px', padding: '4px 12px',
    color: '#86efac', fontSize: '11px', fontWeight: '500',
  },

  /* ── Button ── */
  signupBtn: {
    display: 'block', width: '100%',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#fff', border: 'none', borderRadius: '50px',
    padding: '13px', fontSize: '16px', fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 28px rgba(22,163,74,0.35)',
    transition: 'all 0.3s ease',
    marginBottom: '12px', letterSpacing: '0.5px',
  },

  loginHint: {
    color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '10px',
  },
  loginLink: {
    color: '#4ade80', cursor: 'pointer',
    fontWeight: '600', textDecoration: 'underline',
  },
  footerNote: {
    color: 'rgba(255,255,255,0.2)', fontSize: '10px', letterSpacing: '0.5px',
  },

  pageFooter: {
    position: 'relative', zIndex: 2, marginTop: '14px',
    color: 'rgba(255,255,255,0.18)', fontSize: '10px',
  },
};