// frontend/src/pages/LandingPage.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.jpg';

// ── All sections defined here ──
const SECTIONS = ['home', 'about', 'services', 'doctors', 'appointment', 'contact'];

export default function LandingPage() {
  const navigate = useNavigate();
  const [active, setActive]   = useState('home');
  const [prev,   setPrev]     = useState(null);
  const [anim,   setAnim]     = useState('');  // 'enter' | 'exit'
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Lock body scroll completely ──
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow   = 'hidden';
    document.body.style.height     = '100vh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height   = '100vh';
    return () => {
      document.body.style.overflow   = original;
      document.body.style.height     = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height   = '';
    };
  }, []);

  // ── Switch section with fade transition ──
  const goTo = (section) => {
    if (section === active) return;
    setMenuOpen(false);
    setPrev(active);
    setAnim('exit');
    setTimeout(() => {
      setActive(section);
      setAnim('enter');
      setTimeout(() => setAnim(''), 400);
    }, 300);
  };

  // ── Keyboard accessibility ──
  const handleKeyDown = (e, section) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(section); }
  };

  const navItems = [
    { key:'home',        label:'🏠 Home' },
    { key:'about',       label:'🏥 About Us' },
    { key:'services',    label:'✨ Services' },
    { key:'doctors',     label:'🩺 Doctors' },
    { key:'appointment', label:'📅 Appointment' },
    { key:'contact',     label:'📞 Contact' },
  ];

  return (
    <div style={s.root}>

      {/* ══════════ NAVBAR ══════════ */}
      <nav style={s.navbar} role="navigation" aria-label="Main navigation">
        <div style={s.navInner}>

          {/* Brand — click goes Home */}
          <div
            style={s.brand}
            onClick={() => goTo('home')}
            onKeyDown={e => handleKeyDown(e, 'home')}
            tabIndex={0}
            role="button"
            aria-label="Go to Home"
          >
            <img src={logo} alt="Clinic Logo" style={s.brandLogo} />
            <div style={s.brandText}>
              <span style={s.brandTop}>POBLACION DANAO BOHOL</span>
              <span style={s.brandBot}>Clinic Appointment System</span>
            </div>
          </div>

          {/* Desktop nav links */}
          <div style={s.navLinks} role="menubar">
            {navItems.map(item => (
              <button
                key={item.key}
                role="menuitem"
                tabIndex={0}
                aria-current={active === item.key ? 'page' : undefined}
                style={{
                  ...s.navBtn,
                  ...(active === item.key ? s.navBtnActive : {}),
                }}
                onClick={() => goTo(item.key)}
                onKeyDown={e => handleKeyDown(e, item.key)}
              >
                {item.label}
                {active === item.key && <span style={s.activePip} aria-hidden="true" />}
              </button>
            ))}
          </div>

          {/* Auth buttons */}
          <div style={s.navAuth}>
            <button style={s.btnLogin}  onClick={() => navigate('/login')} tabIndex={0}>Log In</button>
            <button style={s.btnSignup} onClick={() => navigate('/login')} tabIndex={0}>Sign Up</button>
          </div>

          {/* Mobile hamburger */}
          <button
            style={s.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={s.mobileMenu} role="menu">
            {navItems.map(item => (
              <button
                key={item.key}
                role="menuitem"
                style={{ ...s.mobileBtn, ...(active === item.key ? s.mobileBtnActive : {}) }}
                onClick={() => goTo(item.key)}
              >
                {item.label}
              </button>
            ))}
            <div style={s.mobileAuthRow}>
              <button style={s.btnLogin}  onClick={() => navigate('/login')}>Log In</button>
              <button style={s.btnSignup} onClick={() => navigate('/login')}>Sign Up</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════ SECTION VIEWPORT ══════════ */}
      <main style={s.viewport} aria-live="polite">
        <div style={{
          ...s.sectionWrap,
          opacity:    anim === 'exit' ? 0 : 1,
          transform:  anim === 'exit' ? 'translateY(12px) scale(0.99)'
                    : anim === 'enter' ? 'translateY(0) scale(1)'
                    : 'translateY(0) scale(1)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}>

          {/* ─── HOME ─── */}
          {active === 'home' && (
            <section style={s.section} aria-label="Home">
              <div style={s.heroBg} />
              <div style={s.heroP1} /><div style={s.heroP2} />
              <div style={s.homeInner}>

                {/* Left */}
                <div style={s.homeLeft}>
                  <div style={s.heroBadge}>
                    <span style={s.heroDot} />
                    🏥 Poblacion Danao Bohol Health Center
                  </div>
                  <h1 style={s.heroH1}>
                    Book Your Clinic<br />Appointment<br />
                    <span style={s.heroGreen}>in Minutes</span>
                  </h1>
                  <p style={s.heroDesc}>
                    Our easy-to-use system connects you with the right doctor,
                    at the right time — anytime, anywhere. Trusted by thousands
                    of patients in Danao, Bohol.
                  </p>
                  <div style={s.heroButtons}>
                    <button style={s.heroCTA}
                      onClick={() => goTo('appointment')}
                      onMouseEnter={e => e.currentTarget.style.boxShadow='0 14px 35px rgba(22,163,74,0.5)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow='0 6px 20px rgba(22,163,74,0.3)'}
                    >📅 Book Appointment</button>
                    <button style={s.heroSecond} onClick={() => goTo('about')}
                      onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >Learn More ↓</button>
                  </div>
                  <div style={s.trustStrip}>
                    {[{i:'✅',t:'Easy & Fast'},{i:'🔒',t:'Secure'},{i:'🕐',t:'24/7 Access'}].map(x=>(
                      <div key={x.t} style={s.trustItem}>
                        <span>{x.i}</span>
                        <span style={s.trustText}>{x.t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={s.proof}>
                    <div style={s.proofAvatars}>
                      {['👩','👨','👩','👨','👩'].map((a,i)=>(
                        <span key={i} style={{...s.proofAvatar, left:`${i*24}px`}}>{a}</span>
                      ))}
                    </div>
                    <div style={{marginLeft:'130px'}}>
                      <div style={s.proofStars}>★★★★★</div>
                      <div style={s.proofText}>5,000+ patients · 4.9/5</div>
                    </div>
                  </div>
                </div>

                {/* Right — logo card */}
                <div style={s.homeRight}>
                  <div style={s.logoCard}>
                    <div style={s.logoRing1} />
                    <div style={s.logoRing2} />
                    <img src={logo} alt="Clinic" style={s.logoCardImg} />
                    <div style={s.logoStats}>
                      {[{n:'5,000+',l:'Patients'},{n:'10+',l:'Doctors'},{n:'98%',l:'Satisfaction'}].map((st,i)=>(
                        <div key={st.l} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          {i>0 && <div style={s.statDiv}/>}
                          <div style={s.statBox}>
                            <div style={s.statNum}>{st.n}</div>
                            <div style={s.statLabel}>{st.l}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── ABOUT US ─── */}
          {active === 'about' && (
            <section style={{...s.section, ...s.aboutSection}} aria-label="About Us">
              <div style={s.aboutInner}>
                <div style={s.aboutLogoWrap}>
                  <div style={s.aboutRing1}/><div style={s.aboutRing2}/>
                  <img src={logo} alt="Clinic" style={s.aboutLogo} />
                </div>
                <div style={s.aboutText}>
                  <div style={s.badge}>🏥 About Us</div>
                  <h2 style={s.sectionH2}>
                    Serving the Community of<br/>
                    <span style={{color:'#16a34a'}}>Poblacion Danao, Bohol</span>
                  </h2>
                  <p style={s.bodyP}>
                    Our clinic has been dedicated to providing quality healthcare to
                    the residents of Poblacion Danao, Bohol. We believe every person
                    deserves access to professional medical care — close to home.
                  </p>
                  <div style={s.mvRow}>
                    {[
                      {icon:'🎯',title:'Our Mission',text:'To deliver accessible, high-quality, and compassionate healthcare to every resident of Danao, Bohol.'},
                      {icon:'👁️',title:'Our Vision',  text:'A healthier Danao community where modern technology bridges the gap between patients and doctors.'},
                    ].map(m=>(
                      <div key={m.title} style={s.mvCard}>
                        <div style={s.mvIcon}>{m.icon}</div>
                        <div style={s.mvTitle}>{m.title}</div>
                        <div style={s.mvText}>{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <div style={s.statsRow}>
                    {[{n:'5,000+',l:'Patients'},{n:'10+',l:'Doctors'},{n:'98%',l:'Satisfaction'},{n:'24/7',l:'Access'}].map(st=>(
                      <div key={st.l} style={s.statCard}>
                        <div style={s.statCardNum}>{st.n}</div>
                        <div style={s.statCardLabel}>{st.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── SERVICES ─── */}
          {active === 'services' && (
            <section style={s.section} aria-label="Services">
              <div style={s.centeredSection}>
                <div style={s.badge}>✨ Why Choose Us</div>
                <h2 style={s.sectionH2}>Why Choose Our Appointment System?</h2>
                <p style={s.sectionSub}>Everything you need to manage your healthcare in one place</p>
                <div style={s.featGrid}>
                  {[
                    {icon:'📅',color:'#dcfce7',ic:'#16a34a',title:'Easy Scheduling',    desc:'Book appointments in just a few clicks — no phone calls, no waiting.'},
                    {icon:'🩺',color:'#dbeafe',ic:'#1d4ed8',title:'Choose Your Doctor',  desc:'View doctor profiles, specializations, and real-time availability.'},
                    {icon:'🔔',color:'#fef9c3',ic:'#ca8a04',title:'Real-time Alerts',    desc:'Get instant notifications so you never miss an appointment.'},
                    {icon:'🕐',color:'#fce7f3',ic:'#be185d',title:'24/7 Access',         desc:'Schedule and manage appointments anytime, anywhere, on any device.'},
                    {icon:'🔒',color:'#ede9fe',ic:'#7c3aed',title:'Secure & Encrypted',  desc:'Medical records are Fernet-encrypted and fully protected.'},
                    {icon:'💊',color:'#ffedd5',ic:'#ea580c',title:'Digital Prescriptions',desc:'Doctors send prescriptions directly to your secure dashboard.'},
                  ].map(f=>(
                    <div key={f.title} style={s.featCard}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-6px)';e.currentTarget.style.boxShadow='0 16px 40px rgba(0,0,0,0.1)';}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.05)';}}
                    >
                      <div style={{...s.featIcon,background:f.color,color:f.ic}}>{f.icon}</div>
                      <div style={s.featTitle}>{f.title}</div>
                      <div style={s.featDesc}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ─── DOCTORS ─── */}
          {active === 'doctors' && (
            <section style={s.section} aria-label="Doctors">
              <div style={s.centeredSection}>
                <div style={s.badge}>🩺 Our Team</div>
                <h2 style={s.sectionH2}>Meet Our Doctors</h2>
                <p style={s.sectionSub}>Experienced professionals dedicated to your health</p>
                <div style={s.docGrid}>
                  {[
                    {icon:'👨‍⚕️',name:'General Physician',  spec:'Primary care & general consultations',    slots:'Mon – Fri'},
                    {icon:'👩‍⚕️',name:'Pediatrician',       spec:'Specialized care for children & infants', slots:'Mon – Thu'},
                    {icon:'🧑‍⚕️',name:'Internal Medicine',  spec:'Diagnosis of adult internal diseases',    slots:'Tue – Sat'},
                    {icon:'👩‍⚕️',name:'OB-Gynecologist',    spec:"Women's health & maternal care",          slots:'Mon – Fri'},
                  ].map(doc=>(
                    <div key={doc.name} style={s.docCard}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-6px)';e.currentTarget.style.borderColor='#16a34a';e.currentTarget.style.boxShadow='0 14px 36px rgba(22,163,74,0.15)';}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.05)';}}
                    >
                      <div style={s.docAvatar}>{doc.icon}</div>
                      <div style={s.docName}>{doc.name}</div>
                      <div style={s.docSpec}>{doc.spec}</div>
                      <div style={s.docSlots}>🗓 {doc.slots}</div>
                      <button style={s.docBtn} onClick={()=>goTo('appointment')}
                        onMouseEnter={e=>{e.currentTarget.style.background='#16a34a';e.currentTarget.style.color='#fff';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#16a34a';}}
                      >Book Appointment →</button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ─── APPOINTMENT ─── */}
          {active === 'appointment' && (
            <section style={s.section} aria-label="Book Appointment">
              <div style={s.centeredSection}>
                <div style={s.badge}>📅 Book Now</div>
                <h2 style={s.sectionH2}>Schedule an Appointment</h2>
                <p style={s.sectionSub}>Fill out the form below — we'll confirm your slot</p>
                <div style={s.apptCard}>
                  {/* Form side */}
                  <div style={s.apptLeft}>
                    <h3 style={s.apptFormTitle}>Quick Appointment</h3>
                    <div style={s.apptField}>
                      <label style={s.apptLabel}>🩺 Select Doctor</label>
                      <select style={s.apptSelect}>
                        <option value="">-- Choose a doctor --</option>
                        <option>General Physician</option>
                        <option>Pediatrician</option>
                        <option>Internal Medicine</option>
                        <option>OB-Gynecologist</option>
                      </select>
                    </div>
                    <div style={s.apptRow}>
                      <div style={{flex:1}}>
                        <label style={s.apptLabel}>📅 Date</label>
                        <input type="date" style={s.apptInput} min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div style={{flex:1}}>
                        <label style={s.apptLabel}>🕐 Time</label>
                        <select style={s.apptSelect}>
                          <option value="">-- Time --</option>
                          {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'].map(t=>(
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={s.apptField}>
                      <label style={s.apptLabel}>📝 Reason (optional)</label>
                      <textarea style={s.apptTextarea} rows={3} placeholder="Briefly describe your concern..." />
                    </div>
                    <button style={s.apptBtn} onClick={()=>navigate('/login')}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 12px 30px rgba(22,163,74,0.45)'}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(22,163,74,0.25)'}
                    >✅ Check Availability & Book</button>
                    <p style={s.apptNote}>You'll be redirected to log in to complete your booking.</p>
                  </div>
                  {/* Steps side */}
                  <div style={s.apptRight}>
                    <h3 style={s.apptInfoTitle}>How It Works</h3>
                    {[
                      {n:'1',title:'Select & Submit',  desc:'Choose your doctor, date, and time.'},
                      {n:'2',title:'Login / Register', desc:'Create a free account or log in.'},
                      {n:'3',title:'Get Confirmed',    desc:'Receive instant notification of confirmation.'},
                      {n:'4',title:'Visit the Clinic', desc:'Arrive on time — your doctor will be ready.'},
                    ].map(st=>(
                      <div key={st.n} style={s.apptStep}>
                        <div style={s.apptStepNum}>{st.n}</div>
                        <div>
                          <div style={s.apptStepTitle}>{st.title}</div>
                          <div style={s.apptStepDesc}>{st.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── CONTACT ─── */}
          {active === 'contact' && (
            <section style={{...s.section,background:'linear-gradient(135deg,#1d4ed8,#1e3a8a)'}} aria-label="Contact">
              <div style={s.centeredSection}>
                <div style={{...s.badge,background:'rgba(255,255,255,0.15)',color:'#fff'}}>📞 Get In Touch</div>
                <h2 style={{...s.sectionH2,color:'#fff'}}>Contact Us</h2>
                <p style={{...s.sectionSub,color:'rgba(255,255,255,0.75)'}}>We're here to help the Danao community</p>
                <div style={s.contactGrid}>
                  {[
                    {icon:'📍',title:'Location', desc:'Poblacion, Danao, Bohol, Philippines'},
                    {icon:'📞',title:'Phone',    desc:'+63 (XXX) XXX-XXXX'},
                    {icon:'✉️',title:'Email',    desc:'clinic@danao.bohol.gov.ph'},
                    {icon:'🕐',title:'Hours',    desc:'Mon – Fri: 8:00 AM – 5:00 PM'},
                  ].map(c=>(
                    <div key={c.title} style={s.contactCard}>
                      <div style={s.contactIcon}>{c.icon}</div>
                      <div style={s.contactTitle}>{c.title}</div>
                      <div style={s.contactDesc}>{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={s.ctaRow}>
                  <div>
                    <h3 style={s.ctaTitle}>Ready to Take Control of Your Health?</h3>
                    <p style={s.ctaSub}>Create your account today and book your appointment in minutes.</p>
                  </div>
                  <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                    <button style={s.ctaBtnWhite}   onClick={()=>navigate('/login')}>👤 Sign Up Free</button>
                    <button style={s.ctaBtnOutline} onClick={()=>goTo('appointment')}>📅 Book Now</button>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: hidden !important; height: 100vh !important; max-height: 100vh !important; }
        body { font-family: 'Inter', sans-serif; }
        button:focus-visible, [role="button"]:focus-visible {
          outline: 3px solid #16a34a;
          outline-offset: 2px;
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%,100% { opacity:1; } 50% { opacity:0.2; }
        }
        select:focus, input:focus, textarea:focus {
          outline: none;
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.15);
        }
        @media (max-width: 900px) {
          .desktop-nav  { display: none !important; }
          .desktop-auth { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════
   STYLES
══════════════════════════════════════════ */
const G = '#16a34a';
const B = '#1d4ed8';

const s = {
  // Layout
  root:     { display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', fontFamily:"'Inter',sans-serif", background:'#fff' },
  viewport: { flex:1, overflow:'hidden', position:'relative' },
  sectionWrap: { width:'100%', height:'100%', overflow:'hidden' },
  section: {
    width:'100%', height:'100%',
    overflowY:'auto', overflowX:'hidden',
    background:'linear-gradient(135deg,#f0fdf4,#eff6ff)',
    padding:'32px 28px',
    display:'flex', flexDirection:'column',
  },
  aboutSection: { background:'linear-gradient(135deg,#f0fdf4,#eff6ff)' },

  // NAVBAR
  navbar: {
    flexShrink:0,
    background:'#fff', borderBottom:'1px solid #f3f4f6',
    boxShadow:'0 2px 20px rgba(0,0,0,0.07)', zIndex:1000,
  },
  navInner: {
    maxWidth:'1280px', margin:'0 auto',
    display:'flex', alignItems:'center',
    padding:'10px 24px', gap:'12px',
  },
  brand: {
    display:'flex', alignItems:'center', gap:'12px',
    cursor:'pointer', flexShrink:0, userSelect:'none',
    borderRadius:'10px', padding:'4px 8px',
    transition:'background 0.2s',
  },
  brandLogo: {
    width:'60px', height:'60px', borderRadius:'50%',
    objectFit:'cover', border:`3px solid ${G}`,
    boxShadow:'0 0 14px rgba(22,163,74,0.35)',
  },
  brandText: { display:'flex', flexDirection:'column', lineHeight:1.3 },
  brandTop:  { fontSize:'13px', fontWeight:'900', color:'#111827', letterSpacing:'0.5px' },
  brandBot:  { fontSize:'11px', fontWeight:'600', color:G },

  navLinks: { display:'flex', gap:'2px', flex:1, justifyContent:'center' },
  navBtn: {
    background:'none', border:'none', borderRadius:'8px',
    padding:'8px 12px', fontSize:'13px', fontWeight:'600',
    color:'#4b5563', cursor:'pointer', position:'relative',
    transition:'color 0.2s, background 0.2s', whiteSpace:'nowrap',
  },
  navBtnActive: { color:G, background:'rgba(22,163,74,0.08)' },
  activePip: {
    position:'absolute', bottom:'3px', left:'50%',
    transform:'translateX(-50%)',
    width:'5px', height:'5px', borderRadius:'50%', background:G,
  },

  navAuth: { display:'flex', gap:'8px', flexShrink:0 },
  btnLogin: {
    background:'transparent', border:'1.5px solid #d1d5db', borderRadius:'8px',
    padding:'8px 18px', fontSize:'13px', fontWeight:'700',
    color:'#374151', cursor:'pointer', transition:'all 0.2s',
  },
  btnSignup: {
    background:B, border:'none', borderRadius:'8px',
    padding:'8px 18px', fontSize:'13px', fontWeight:'700',
    color:'#fff', cursor:'pointer',
    boxShadow:'0 2px 10px rgba(29,78,216,0.3)',
    transition:'all 0.2s',
  },
  hamburger: {
    display:'none', background:'none', border:'none',
    fontSize:'22px', cursor:'pointer', color:'#374151',
    marginLeft:'auto', padding:'6px',
  },
  mobileMenu: {
    display:'flex', flexDirection:'column', gap:'4px',
    padding:'10px 24px 16px', background:'#fff',
    borderTop:'1px solid #f3f4f6',
    maxHeight:'80vh', overflowY:'auto',
  },
  mobileBtn: {
    background:'none', border:'none', padding:'11px 8px',
    fontSize:'15px', fontWeight:'600', color:'#374151',
    cursor:'pointer', textAlign:'left', borderBottom:'1px solid #f3f4f6',
    borderRadius:'0', transition:'color 0.2s',
  },
  mobileBtnActive: { color:G, fontWeight:'800' },
  mobileAuthRow: { display:'flex', gap:'10px', paddingTop:'10px' },

  // HERO / HOME
  heroBg: {
    position:'absolute', inset:0, pointerEvents:'none',
    background:'radial-gradient(ellipse at 70% 40%,rgba(29,78,216,0.06) 0%,transparent 60%), radial-gradient(ellipse at 20% 80%,rgba(22,163,74,0.08) 0%,transparent 50%)',
  },
  heroP1: {
    position:'absolute', width:'300px', height:'300px', borderRadius:'50%',
    background:'rgba(22,163,74,0.07)', top:'-60px', left:'-60px',
    filter:'blur(60px)', pointerEvents:'none',
  },
  heroP2: {
    position:'absolute', width:'200px', height:'200px', borderRadius:'50%',
    background:'rgba(29,78,216,0.06)', bottom:'60px', right:'-30px',
    filter:'blur(50px)', pointerEvents:'none',
  },
  homeInner: {
    maxWidth:'1200px', margin:'0 auto', width:'100%',
    display:'flex', alignItems:'center', gap:'50px',
    flex:1, position:'relative', zIndex:1, flexWrap:'wrap',
    justifyContent:'center',
  },
  homeLeft:  { flex:'1 1 380px', minWidth:'280px' },
  homeRight: { flex:'0 0 auto' },

  heroBadge: {
    display:'inline-flex', alignItems:'center', gap:'8px',
    background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.22)',
    borderRadius:'99px', padding:'5px 14px',
    color:'#15803d', fontSize:'12px', fontWeight:'700',
    marginBottom:'18px',
  },
  heroDot: {
    width:'7px', height:'7px', borderRadius:'50%',
    background:G, display:'inline-block',
    animation:'blink 1.5s infinite',
  },
  heroH1: {
    fontSize:'clamp(30px,4.5vw,52px)', fontWeight:'900',
    lineHeight:1.1, color:'#111827', marginBottom:'18px',
  },
  heroGreen: {
    background:`linear-gradient(135deg,${G},#15803d)`,
    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
  },
  heroDesc: {
    fontSize:'16px', color:'#4b5563', lineHeight:1.75,
    marginBottom:'28px', maxWidth:'480px',
  },
  heroButtons: { display:'flex', gap:'12px', marginBottom:'28px', flexWrap:'wrap' },
  heroCTA: {
    background:`linear-gradient(135deg,${G},#15803d)`,
    color:'#fff', border:'none', borderRadius:'12px',
    padding:'13px 28px', fontSize:'15px', fontWeight:'800',
    cursor:'pointer', boxShadow:'0 6px 20px rgba(22,163,74,0.3)',
    transition:'all 0.3s',
  },
  heroSecond: {
    background:'transparent', color:'#374151',
    border:'1.5px solid #d1d5db', borderRadius:'12px',
    padding:'13px 24px', fontSize:'15px', fontWeight:'700',
    cursor:'pointer', transition:'all 0.25s',
  },

  trustStrip: { display:'flex', gap:'20px', marginBottom:'24px', flexWrap:'wrap' },
  trustItem:  { display:'flex', alignItems:'center', gap:'8px' },
  trustText:  { fontSize:'13px', fontWeight:'700', color:'#374151' },

  proof: { display:'flex', alignItems:'center', position:'relative' },
  proofAvatars: { position:'relative', width:'135px', height:'36px', flexShrink:0 },
  proofAvatar: { position:'absolute', fontSize:'26px', background:'#fff', borderRadius:'50%', boxShadow:'0 0 0 2px #fff' },
  proofStars: { color:'#f59e0b', fontSize:'16px', letterSpacing:'2px', marginBottom:'2px' },
  proofText:  { fontSize:'12px', color:'#6b7280', fontWeight:'600' },

  logoCard: {
    background:'#fff', borderRadius:'24px',
    boxShadow:'0 20px 60px rgba(0,0,0,0.1)',
    padding:'28px 24px', textAlign:'center',
    border:'1px solid #e5e7eb', position:'relative',
    width:'260px',
  },
  logoRing1: {
    position:'absolute', inset:'-10px', borderRadius:'50%',
    border:'2px dashed rgba(22,163,74,0.3)',
    animation:'spin 18s linear infinite', pointerEvents:'none',
    width:'180px', height:'180px', top:'18px', left:'40px',
  },
  logoRing2: {
    position:'absolute', inset:0, borderRadius:'50%',
    border:'2px solid rgba(22,163,74,0.15)',
    animation:'spin 28s linear infinite reverse', pointerEvents:'none',
    width:'200px', height:'200px', top:'10px', left:'30px',
  },
  logoCardImg: {
    width:'160px', height:'160px', borderRadius:'50%',
    objectFit:'cover', border:`4px solid ${G}`,
    boxShadow:'0 0 0 8px rgba(22,163,74,0.1)',
    animation:'float 5s ease-in-out infinite',
    position:'relative', zIndex:1,
  },
  logoStats: {
    display:'flex', alignItems:'center', justifyContent:'center',
    gap:'8px', marginTop:'16px',
    background:'#f9fafb', borderRadius:'10px', padding:'10px',
  },
  statDiv:  { width:'1px', height:'28px', background:'#e5e7eb' },
  statBox:  { textAlign:'center' },
  statNum:  { fontSize:'16px', fontWeight:'900', color:G },
  statLabel:{ fontSize:'10px', color:'#6b7280', fontWeight:'600', textTransform:'uppercase' },

  // COMMON SECTION LAYOUT
  centeredSection: {
    maxWidth:'1100px', margin:'0 auto', width:'100%',
    display:'flex', flexDirection:'column', alignItems:'center',
  },
  badge: {
    display:'inline-block',
    background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.2)',
    borderRadius:'99px', padding:'5px 16px',
    color:'#15803d', fontSize:'13px', fontWeight:'700',
    marginBottom:'12px',
  },
  sectionH2: { fontSize:'clamp(24px,3.5vw,34px)', fontWeight:'900', color:'#111827', marginBottom:'8px', textAlign:'center' },
  sectionSub:{ fontSize:'15px', color:'#6b7280', marginBottom:'36px', textAlign:'center' },
  bodyP:     { fontSize:'15px', color:'#4b5563', lineHeight:1.8, marginBottom:'14px' },

  // ABOUT
  aboutInner: {
    maxWidth:'1050px', margin:'0 auto', width:'100%',
    display:'flex', alignItems:'center', gap:'56px', flexWrap:'wrap',
    justifyContent:'center',
  },
  aboutLogoWrap: { position:'relative', display:'inline-block', flexShrink:0 },
  aboutRing1: {
    position:'absolute', inset:'-14px', borderRadius:'50%',
    border:'3px dashed rgba(22,163,74,0.3)',
    animation:'spin 20s linear infinite', pointerEvents:'none',
  },
  aboutRing2: {
    position:'absolute', inset:'-28px', borderRadius:'50%',
    border:'2px solid rgba(22,163,74,0.13)',
    animation:'spin 30s linear infinite reverse', pointerEvents:'none',
  },
  aboutLogo: {
    width:'220px', height:'220px', borderRadius:'50%',
    objectFit:'cover', border:`5px solid ${G}`,
    boxShadow:'0 0 0 12px rgba(22,163,74,0.08)',
    display:'block',
  },
  aboutText: { flex:'1 1 300px' },

  mvRow: { display:'flex', gap:'14px', margin:'16px 0', flexWrap:'wrap' },
  mvCard: {
    flex:'1 1 180px', background:'#fff',
    border:'1.5px solid #e5e7eb', borderRadius:'14px',
    padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
  },
  mvIcon:  { fontSize:'22px', marginBottom:'6px' },
  mvTitle: { fontSize:'13px', fontWeight:'800', color:'#111827', marginBottom:'5px' },
  mvText:  { fontSize:'12px', color:'#6b7280', lineHeight:1.6 },

  statsRow: { display:'flex', gap:'20px', marginTop:'16px', flexWrap:'wrap' },
  statCard:     { textAlign:'center' },
  statCardNum:  { fontSize:'26px', fontWeight:'900', color:G },
  statCardLabel:{ fontSize:'11px', color:'#6b7280', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px' },

  // FEATURES
  featGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',
    gap:'18px', width:'100%',
  },
  featCard: {
    background:'#fff', border:'1.5px solid #f3f4f6',
    borderRadius:'16px', padding:'24px',
    boxShadow:'0 2px 12px rgba(0,0,0,0.05)',
    transition:'all 0.3s ease', cursor:'default',
  },
  featIcon: {
    width:'48px', height:'48px', borderRadius:'12px',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'22px', marginBottom:'12px',
  },
  featTitle: { fontSize:'15px', fontWeight:'800', color:'#111827', marginBottom:'6px' },
  featDesc:  { fontSize:'13px', color:'#6b7280', lineHeight:1.65 },

  // DOCTORS
  docGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',
    gap:'18px', width:'100%',
  },
  docCard: {
    background:'#fff', border:'1.5px solid #e5e7eb',
    borderRadius:'18px', padding:'28px 20px',
    textAlign:'center', transition:'all 0.3s ease',
    boxShadow:'0 2px 10px rgba(0,0,0,0.05)',
  },
  docAvatar: { fontSize:'48px', marginBottom:'12px' },
  docName:   { fontSize:'16px', fontWeight:'800', color:'#111827', marginBottom:'6px' },
  docSpec:   { fontSize:'12px', color:'#6b7280', lineHeight:1.6, marginBottom:'10px' },
  docSlots:  {
    fontSize:'11px', color:G, fontWeight:'700',
    background:'rgba(22,163,74,0.08)', borderRadius:'6px',
    padding:'4px 10px', display:'inline-block', marginBottom:'16px',
  },
  docBtn: {
    background:'transparent', border:`1.5px solid ${G}`,
    color:G, borderRadius:'8px', padding:'9px 16px',
    fontSize:'12px', fontWeight:'700', cursor:'pointer',
    transition:'all 0.25s', width:'100%',
  },

  // APPOINTMENT
  apptCard: {
    background:'#fff', borderRadius:'20px',
    boxShadow:'0 16px 50px rgba(0,0,0,0.09)',
    border:'1.5px solid #e5e7eb',
    display:'flex', flexWrap:'wrap', width:'100%',
    overflow:'hidden',
  },
  apptLeft:  { flex:'1 1 320px', padding:'32px' },
  apptRight: { flex:'0 0 270px', padding:'32px', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)' },
  apptFormTitle: { fontSize:'20px', fontWeight:'900', color:'#111827', marginBottom:'20px' },
  apptField: { marginBottom:'14px' },
  apptRow:   { display:'flex', gap:'12px', marginBottom:'14px', flexWrap:'wrap' },
  apptLabel: {
    display:'block', fontSize:'11px', fontWeight:'700',
    color:'#374151', marginBottom:'6px',
    textTransform:'uppercase', letterSpacing:'0.5px',
  },
  apptSelect: {
    width:'100%', padding:'11px 12px',
    border:'1.5px solid #e5e7eb', borderRadius:'9px',
    fontSize:'14px', fontWeight:'700', color:'#000',
    background:'#f9fafb', cursor:'pointer',
  },
  apptInput: {
    width:'100%', padding:'11px 12px',
    border:'1.5px solid #e5e7eb', borderRadius:'9px',
    fontSize:'14px', fontWeight:'700', color:'#000', background:'#f9fafb',
  },
  apptTextarea: {
    width:'100%', padding:'11px 12px',
    border:'1.5px solid #e5e7eb', borderRadius:'9px',
    fontSize:'13px', fontWeight:'600', color:'#000',
    background:'#f9fafb', resize:'vertical',
  },
  apptBtn: {
    width:'100%', background:`linear-gradient(135deg,${G},#15803d)`,
    color:'#fff', border:'none', borderRadius:'10px',
    padding:'13px', fontSize:'15px', fontWeight:'800',
    cursor:'pointer', boxShadow:'0 4px 16px rgba(22,163,74,0.25)',
    transition:'all 0.3s', marginBottom:'8px',
  },
  apptNote: { fontSize:'11px', color:'#9ca3af', textAlign:'center' },

  apptInfoTitle: { fontSize:'16px', fontWeight:'800', color:'#111827', marginBottom:'20px' },
  apptStep: { display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'18px' },
  apptStepNum: {
    width:'30px', height:'30px', borderRadius:'50%', flexShrink:0,
    background:G, color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'13px', fontWeight:'800',
  },
  apptStepTitle: { fontSize:'13px', fontWeight:'800', color:'#111827', marginBottom:'3px' },
  apptStepDesc:  { fontSize:'12px', color:'#6b7280', lineHeight:1.6 },

  // CONTACT
  contactGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',
    gap:'18px', marginBottom:'36px', width:'100%',
  },
  contactCard: {
    background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)',
    borderRadius:'16px', padding:'24px', textAlign:'center',
    backdropFilter:'blur(10px)',
  },
  contactIcon:  { fontSize:'32px', marginBottom:'10px' },
  contactTitle: { fontSize:'14px', fontWeight:'800', color:'#fff', marginBottom:'6px' },
  contactDesc:  { fontSize:'13px', color:'rgba(255,255,255,0.75)', lineHeight:1.6 },

  ctaRow: {
    background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
    borderRadius:'18px', padding:'28px 32px',
    display:'flex', alignItems:'center',
    justifyContent:'space-between', gap:'20px', flexWrap:'wrap', width:'100%',
  },
  ctaTitle:     { fontSize:'20px', fontWeight:'900', color:'#fff', marginBottom:'5px' },
  ctaSub:       { fontSize:'13px', color:'rgba(255,255,255,0.8)' },
  ctaBtnWhite:  {
    background:'#fff', color:B, border:'none', borderRadius:'9px',
    padding:'12px 22px', fontSize:'14px', fontWeight:'800',
    cursor:'pointer', boxShadow:'0 4px 14px rgba(0,0,0,0.15)',
  },
  ctaBtnOutline: {
    background:'transparent', color:'#fff',
    border:'2px solid rgba(255,255,255,0.55)', borderRadius:'9px',
    padding:'12px 22px', fontSize:'14px', fontWeight:'700', cursor:'pointer',
  },
};