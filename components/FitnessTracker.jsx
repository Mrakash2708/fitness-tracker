'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './FitnessTracker.module.css';
import { signInWithGoogle, logOut, onAuth, saveProgress, loadProgress, listenProgress } from '../lib/firebase';

const STORAGE_KEY = 'akash_tracker_v2';
const loadState = () => { if (typeof window === 'undefined') return null; try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveState = (s) => { if (typeof window === 'undefined') return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };
const getTodayKey = () => new Date().toISOString().split('T')[0];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const DEFAULT_CHECKLIST = [
  { id: 'methi', label: 'Methi water on waking + 2 garlic cloves' },
  { id: 'breakfast', label: 'Breakfast: oats + walnuts + flaxseed' },
  { id: 'workout', label: 'Gym session or 45-min walk' },
  { id: 'lunch', label: 'Lunch: dal + sabzi + curd + roti' },
  { id: 'snack', label: 'Evening: sprouts or roasted chana' },
  { id: 'dinner', label: 'Dinner before 8pm' },
  { id: 'water', label: '3L water done' },
  { id: 'sleep', label: 'Sleep by 11pm' },
];

const BREAKFAST_OPTIONS = [
  { day: 'Mon', meal: 'Oats porridge with milk, flaxseed, walnuts, banana' },
  { day: 'Tue', meal: 'Vegetable poha (minimal oil) + peanuts + green tea + 1 fruit' },
  { day: 'Wed', meal: '3 besan chillas + mint chutney + 1 glass milk' },
  { day: 'Thu', meal: 'Vegetable upma (use oats instead of sooji) + 1 fruit' },
  { day: 'Fri', meal: 'Moong dal chilla (2) + paneer bhurji filling + chutney' },
  { day: 'Sat', meal: 'Sprouts salad bowl + 2 boiled eggs OR paneer cubes + multigrain bread' },
  { day: 'Sun', meal: 'Masala oats with veggies + 1 glass milk + 1 fruit' },
];

const LUNCH_OPTIONS = [
  { day: 'Mon', meal: 'Moong dal + palak sabzi + 2 rotis + salad + curd' },
  { day: 'Tue', meal: 'Masoor dal + bhindi sabzi + 2 rotis + salad + curd' },
  { day: 'Wed', meal: 'Chana dal + lauki sabzi + 2 rotis + salad + curd' },
  { day: 'Thu', meal: 'Rajma + jeera aloo (small portion) + 2 rotis + salad + curd' },
  { day: 'Fri', meal: 'Toor dal + methi sabzi + 2 rotis + salad + curd' },
  { day: 'Sat', meal: 'Chole + mix veg + 2 rotis + salad + curd' },
  { day: 'Sun', meal: 'Dal makhani (homemade, less cream) + baingan bharta + 2 rotis' },
];

const DINNER_OPTIONS = [
  { day: 'Mon', meal: 'Soy chunk curry + cucumber raita + 1-2 rotis + salad' },
  { day: 'Tue', meal: 'Paneer bhurji (100g) + sabzi + 1-2 rotis + salad' },
  { day: 'Wed', meal: 'Mixed dal khichdi (with lots of veggies) + curd' },
  { day: 'Thu', meal: 'Tofu/paneer tikka (air-fried) + sabzi + 1-2 rotis' },
  { day: 'Fri', meal: 'Vegetable soup + 2 egg whites omelette + salad' },
  { day: 'Sat', meal: 'Rajma/chole + 1 small bowl brown rice + salad' },
  { day: 'Sun', meal: 'Stuffed paratha (besan/paneer/sattu) + curd' },
];

const SNACK_OPTIONS = [
  { day: 'Mon', meal: 'Sprouts chaat + green tea' },
  { day: 'Tue', meal: 'Roasted chana (40g) + green tea' },
  { day: 'Wed', meal: 'Apple + 5 almonds + green tea' },
  { day: 'Thu', meal: 'Makhana (fox nuts) roasted + green tea' },
  { day: 'Fri', meal: 'Fruit bowl (guava/papaya) + green tea' },
  { day: 'Sat', meal: 'Boiled chana chaat + lemon + green tea' },
  { day: 'Sun', meal: 'Mixed nuts handful + green tea' },
];

const GYM_SPLIT = [
  { day: 'Mon', focus: 'Push Heavy', detail: 'Bench, shoulder press, incline, lateral raise, triceps + 15 min cardio', img: '/images/gym_push.png', duration: '50-55 min', tag: 'heavy',
    exercises: [
      { name: 'Bench press (barbell)', sets: '4 × 6-8', rest: '2-3 min', note: 'Main lift — go heavy' },
      { name: 'Shoulder press (DB)', sets: '4 × 6-8', rest: '2-3 min', note: 'Strict form' },
      { name: 'Incline dumbbell press', sets: '3 × 8-10', rest: '90 sec', note: 'Upper chest' },
      { name: 'Lateral raise', sets: '3 × 12-15', rest: '60 sec', note: 'Side delts' },
      { name: 'Triceps pushdown (rope)', sets: '3 × 10-12', rest: '60 sec', note: '' },
    ], cardio: '15 min incline treadmill walk (Zone 2, HR 125-140)' },
  { day: 'Tue', focus: 'Pull Heavy', detail: 'Deadlift, row, pulldown, cable row, face pull, curl + 15 min cardio', img: '/images/gym_pull.png', duration: '55-60 min', tag: 'heavy',
    exercises: [
      { name: 'Deadlift', sets: '3 × 5', rest: '3 min', note: 'Only on Tue — skip Fri' },
      { name: 'Barbell row (or T-bar)', sets: '4 × 6-8', rest: '2-3 min', note: 'Main back builder' },
      { name: 'Lat pulldown', sets: '3 × 8-10', rest: '90 sec', note: '' },
      { name: 'Seated cable row', sets: '3 × 10-12', rest: '90 sec', note: 'Squeeze mid-back' },
      { name: 'Face pulls', sets: '3 × 15-20', rest: '60 sec', note: 'Rear delts, posture' },
      { name: 'Barbell curl', sets: '3 × 8-10', rest: '60 sec', note: '' },
    ], cardio: '15 min cycling (Zone 2)' },
  { day: 'Wed', focus: 'Legs Heavy', detail: 'Squat, RDL, leg press, leg curl, calves, plank + HIIT (wk 4+)', img: '/images/gym_squat.png', duration: '55-70 min', tag: 'heavy',
    exercises: [
      { name: 'Squat', sets: '4 × 6-8', rest: '3 min', note: 'Main lift, full depth' },
      { name: 'Romanian deadlift', sets: '3 × 8-10', rest: '2 min', note: 'Hamstring emphasis' },
      { name: 'Leg press', sets: '3 × 10-12', rest: '2 min', note: '' },
      { name: 'Leg curl', sets: '3 × 10-12', rest: '60 sec', note: '' },
      { name: 'Calf raise', sets: '4 × 12-15', rest: '60 sec', note: '' },
      { name: 'Plank', sets: '3 × 45 sec', rest: '30 sec', note: 'Core' },
    ], cardio: 'Wk 1-3: 10 min Zone 2 | Wk 4+: 20 min HIIT' },
  { day: 'Thu', focus: 'Push Volume', detail: 'Same 5 exercises as Mon — more reps, lighter weight + 15 min cardio', img: '/images/gym_push.png', duration: '50-55 min', tag: 'volume',
    exercises: [
      { name: 'Bench press (barbell)', sets: '4 × 10-12', rest: '90 sec', note: '60-70% of Mon weight' },
      { name: 'Shoulder press (DB)', sets: '4 × 10-12', rest: '90 sec', note: 'Control the negative' },
      { name: 'Incline dumbbell press', sets: '3 × 12-15', rest: '60 sec', note: 'Squeeze at top' },
      { name: 'Lateral raise', sets: '3 × 12-15', rest: '60 sec', note: 'Same as Mon' },
      { name: 'Triceps pushdown (rope)', sets: '3 × 12-15', rest: '60 sec', note: '' },
    ], cardio: '15 min cross trainer (Zone 2)' },
  { day: 'Fri', focus: 'Pull Volume', detail: 'Same as Tue (skip deadlift) — more reps, lighter weight + 15 min cardio', img: '/images/gym_pull.png', duration: '50-55 min', tag: 'volume',
    exercises: [
      { name: 'Barbell row (or T-bar)', sets: '4 × 10-12', rest: '90 sec', note: '60-70% of Tue weight' },
      { name: 'Lat pulldown', sets: '3 × 12-15', rest: '60 sec', note: '' },
      { name: 'Seated cable row', sets: '3 × 12-15', rest: '60 sec', note: 'Squeeze mid-back' },
      { name: 'Face pulls', sets: '3 × 15-20', rest: '60 sec', note: 'Same as Tue' },
      { name: 'Barbell curl', sets: '3 × 12-15', rest: '60 sec', note: '' },
    ], cardio: '15 min incline walk (Zone 2)' },
  { day: 'Sat', focus: 'Legs Volume', detail: 'Same as Wed — more reps, lighter weight + 30-40 min long cardio', img: '/images/gym_squat.png', duration: '60-75 min', tag: 'volume',
    exercises: [
      { name: 'Squat', sets: '4 × 10-12', rest: '2 min', note: '60-70% of Wed weight' },
      { name: 'Romanian deadlift', sets: '3 × 10-12', rest: '90 sec', note: '' },
      { name: 'Leg press', sets: '3 × 12-15', rest: '90 sec', note: '' },
      { name: 'Leg curl', sets: '3 × 12-15', rest: '60 sec', note: '' },
      { name: 'Calf raise', sets: '4 × 12-15', rest: '60 sec', note: '' },
      { name: 'Plank', sets: '3 × 60 sec', rest: '30 sec', note: 'Core' },
    ], cardio: '30-40 min brisk walk or cycling (LDL priority day)' },
  { day: 'Sun', focus: 'Rest', detail: 'Full rest — 30 min easy walk optional', img: '/images/gym_cardio.png', duration: '—', tag: 'rest',
    exercises: [], cardio: 'Optional 30 min easy walk, stretching' },
];

const HERO_FOODS = [
  { name: 'Oats (40-50g)', why: 'Soluble fiber (beta-glucan) directly lowers LDL' },
  { name: 'Walnuts (4-5)', why: 'Omega-3 ALA, proven LDL reducer' },
  { name: 'Flaxseed (1 tbsp)', why: 'Omega-3, lignans, cholesterol-binding fiber' },
  { name: 'Almonds (6-8)', why: 'Monounsaturated fats, vitamin E' },
  { name: 'Garlic (2 cloves)', why: 'LDL and BP lowering' },
  { name: 'Methi seeds', why: 'Insulin sensitivity, LDL lowering' },
  { name: 'Green tea (2-3 cups)', why: 'Antioxidants, fat metabolism boost' },
  { name: 'Leafy greens', why: 'Fiber, folate, low calorie' },
  { name: 'Soy chunks', why: '52g protein per 100g dry' },
  { name: 'Low-fat paneer', why: 'Protein, lower saturated fat' },
];

const AVOID_FOODS = [
  { name: 'Fried snacks', detail: 'Samosa, kachori, pakora, bhujia — biggest LDL contributors' },
  { name: 'Sweets', detail: 'Mithai, jalebi, gulab jamun — raises triglycerides & SGPT' },
  { name: 'White carbs', detail: 'White rice excess, maida, pav, naan' },
  { name: 'Full-fat dairy', detail: 'Malai, cream, butter, ghee beyond 1 tsp' },
  { name: 'Packaged food', detail: 'Biscuits, instant noodles, frozen snacks, soft drinks' },
  { name: 'Deep-fried restaurant', detail: 'Paneer tikka with cream, butter naan, chole bhature' },
  { name: 'Alcohol & tobacco', detail: 'Zero tolerance — liver cannot afford this' },
];

const STATS = [
  { label: 'Weight', current: '81 kg', target: '75 kg', icon: '⚖️' },
  { label: 'BMI', current: '33.7', target: 'under 29', icon: '📊' },
  { label: 'LDL cholesterol', current: '230 mg/dl', target: 'under 140', icon: '🫀' },
  { label: 'Total cholesterol', current: '286 mg/dl', target: 'under 200', icon: '🩸' },
  { label: 'HDL (good)', current: '39 mg/dl', target: 'above 45', icon: '💚' },
  { label: 'SGPT (liver)', current: '68 U/L', target: 'under 45', icon: '🧬' },
  { label: 'Blood pressure', current: '120/90', target: 'under 120/80', icon: '❤️' },
  { label: 'Fasting sugar', current: '101 mg/dl', target: 'under 95', icon: '🍬' },
];

export default function FitnessTracker() {
  const [tab, setTab] = useState('today');
  const [state, setState] = useState({
    protein: 0, water: 0, steps: 0, weight: 81, checklist: {},
    mealSelections: { breakfast: null, lunch: null, dinner: null, snack: null },
    date: getTodayKey(),
  });
  const [mounted, setMounted] = useState(false);
  const [expandedAvoid, setExpandedAvoid] = useState(null);
  const [customInputs, setCustomInputs] = useState({ protein: '', water: '', steps: '' });
  const [showCustom, setShowCustom] = useState({ protein: false, water: false, steps: false });
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('');
  const saveTimer = useRef(null);
  const hasLoadedCloud = useRef(false);
  const lastSavedStateRef = useRef('');
  const isSavingRef = useRef(false);

  const isSameState = (s1, s2) => {
    if (!s1 || !s2) return false;
    return s1.protein === s2.protein &&
           s1.water === s2.water &&
           s1.steps === s2.steps &&
           s1.weight === s2.weight &&
           s1.date === s2.date &&
           JSON.stringify(s1.checklist || {}) === JSON.stringify(s2.checklist || {}) &&
           JSON.stringify(s1.mealSelections || {}) === JSON.stringify(s2.mealSelections || {});
  };

  // --- Merge helper: pick whichever has the latest data ---
  const mergeState = useCallback((local, cloud) => {
    if (!cloud) return local;
    if (!local) return cloud;
    // If cloud is for today and local isn't (or vice-versa), prefer today's
    const today = getTodayKey();
    if (cloud.date === today && local.date !== today) return cloud;
    if (local.date === today && cloud.date !== today) return local;
    // Both same day: pick whichever was updated more recently
    if (cloud.updatedAt && local.updatedAt) {
      return cloud.updatedAt > local.updatedAt ? cloud : local;
    }
    // Prefer cloud when both are for today (cloud is the source of truth)
    return cloud.date === today ? cloud : local;
  }, []);

  // --- Init: load local state, then listen to auth ---
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.date !== getTodayKey()) {
        setState({ ...saved, protein: 0, water: 0, steps: 0, checklist: {}, mealSelections: { breakfast: null, lunch: null, dinner: null, snack: null }, date: getTodayKey() });
      } else {
        setState(s => ({ ...s, ...saved, mealSelections: saved.mealSelections || { breakfast: null, lunch: null, dinner: null, snack: null } }));
      }
    }
    setMounted(true);

    // Listen for auth state changes
    let unsubSnapshot;
    const unsub = onAuth(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setSyncStatus('syncing');
        unsubSnapshot = listenProgress(firebaseUser.uid, (cloud) => {
          if (cloud) {
             setState(s => {
                const merged = mergeState(s, cloud);
                if (merged && merged.date === getTodayKey()) {
                  const newState = { ...s, ...merged, mealSelections: merged.mealSelections || s.mealSelections };
                  
                  if (!isSameState(s, newState)) {
                     lastSavedStateRef.current = JSON.stringify(newState);
                     if (!isSavingRef.current) {
                       setSyncStatus('synced');
                       setTimeout(() => setSyncStatus(''), 2000);
                     }
                     return newState;
                  }
                  return s;
                }
                return s;
             });
             hasLoadedCloud.current = true;
          } else {
             hasLoadedCloud.current = true;
          }
        });
      } else {
        if (unsubSnapshot) unsubSnapshot();
      }
    });
    return () => {
      unsub();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [mergeState]);

  // --- Save: localStorage instantly, Firebase debounced ---
  useEffect(() => {
    if (!mounted) return;
    saveState(state);
    
    const stateToSave = { ...state };
    delete stateToSave.updatedAt;
    const currentStateStr = JSON.stringify(stateToSave);

    // Debounce Firebase save (500ms), only if cloud data is already loaded and changed
    if (user && hasLoadedCloud.current && currentStateStr !== lastSavedStateRef.current) {
      lastSavedStateRef.current = currentStateStr;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSyncStatus('syncing');
        isSavingRef.current = true;
        await saveProgress(user.uid, { ...state, updatedAt: new Date().toISOString() });
        setTimeout(() => { isSavingRef.current = false; }, 3000);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus(''), 2000);
      }, 500);
    }
  }, [state, mounted, user]);

  const updateField = (k, v) => setState(s => ({ ...s, [k]: v }));
  const toggleCheck = (id) => setState(s => ({ ...s, checklist: { ...s.checklist, [id]: !s.checklist[id] } }));
  const selectMeal = (category, day) => setState(s => ({ ...s, mealSelections: { ...s.mealSelections, [category]: s.mealSelections[category] === day ? null : day } }));
  const pct = (v, t) => Math.min(100, Math.round((v / t) * 100));

  const applyCustom = (key, isFixed) => {
    const val = parseFloat(customInputs[key]);
    if (!isNaN(val) && val >= 0) {
      updateField(key, isFixed ? +val.toFixed(2) : Math.round(val));
      setCustomInputs(c => ({ ...c, [key]: '' }));
      setShowCustom(s => ({ ...s, [key]: false }));
    }
  };

  const todayDayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const renderMealOptions = (title, options, category, emoji, imgSrc) => (
    <section className={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>{emoji}</span>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className={styles.hint} style={{ margin: 0 }}>Pick today&apos;s meal — tap to select</p>
        </div>
      </div>
      {imgSrc && (
        <div className={styles.imgCard} style={{ marginBottom: '16px' }}>
          <img src={imgSrc} alt={title} />
          <div className={styles.imgOverlay}>
            <h3>{title}</h3>
            <p>7 rotating options · never get bored</p>
          </div>
        </div>
      )}
      {options.map((opt) => (
        <div
          key={opt.day}
          className={`${styles.mealOption} ${state.mealSelections[category] === opt.day ? styles.mealOptionSelected : ''}`}
          onClick={() => selectMeal(category, opt.day)}
        >
          <div className={styles.mealOptionDay} style={opt.day === todayDayName ? { background: 'linear-gradient(135deg, #ec4899, #f43f5e)' } : {}}>
            {opt.day}
          </div>
          <div className={styles.mealOptionText}>{opt.meal}</div>
          <div className={`${styles.mealCheck} ${state.mealSelections[category] === opt.day ? styles.mealCheckActive : ''}`} />
        </div>
      ))}
    </section>
  );

  const handleSignIn = async () => {
    try {
      setSyncStatus('signing-in');
      await signInWithGoogle();
    } catch (e) {
      console.error('Sign-in error:', e);
      setSyncStatus('');
    }
  };

  const handleSignOut = async () => {
    await logOut();
    setUser(null);
    setSyncStatus('');
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <h1>Akash&apos;s Health Reset</h1>
        <p>🔥 3-6 month transformation · Daily tracker</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{user.displayName?.split(' ')[0]}</span>
              {syncStatus === 'synced' && <span style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>☁️ Synced</span>}
              {syncStatus === 'syncing' && <span style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>⏳ Syncing…</span>}
              <button onClick={handleSignOut} style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 14px', borderRadius: '16px', cursor: 'pointer' }}>Sign out</button>
            </>
          ) : (
            <button onClick={handleSignIn} style={{ fontSize: '14px', fontWeight: 700, background: '#ffffff', color: '#9333ea', border: 'none', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '18px' }}>☁️</span> Sign in to sync across devices
            </button>
          )}
        </div>
      </header>

      <nav className={styles.tabs}>
        {[['today', '📋 Today'], ['meals', '🍽️ Meals'], ['diet', '🥗 Diet'], ['gym', '💪 Gym'], ['stats', '📊 Stats']].map(([key, label]) => (
          <button key={key} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {tab === 'today' && (
        <div>
          <section className={styles.card}>
            <h2>⚡ Daily targets</h2>
            {[
              { label: 'Protein', val: state.protein, target: 120, unit: 'g', placeholder: 'e.g. 45', btns: [[-10, '-10g'], [10, '+10g'], [25, '+25g']], key: 'protein' },
              { label: 'Water', val: state.water, target: 3, unit: 'L', placeholder: 'e.g. 0.5', btns: [[-0.25, '-250ml'], [0.25, '+250ml'], [0.5, '+500ml']], key: 'water', fixed: true },
              { label: 'Steps', val: state.steps, target: 8000, unit: '', placeholder: 'e.g. 3500', btns: [[-500, '-500'], [1000, '+1K'], [2500, '+2.5K']], key: 'steps' },
            ].map(item => (
              <div key={item.key} className={styles.progressBlock}>
                <div className={styles.progressTop}>
                  <span>{item.label}</span>
                  <span>{item.fixed ? item.val.toFixed(1) : item.val.toLocaleString()} / {item.target.toLocaleString()}{item.unit}</span>
                </div>
                <div className={styles.progressBg}>
                  <div className={styles.progressFill} style={{ width: `${pct(item.val, item.target)}%` }} />
                </div>
                <div className={styles.btnRow}>
                  {item.btns.map(([amt, lbl]) => (
                    <button key={lbl} onClick={() => updateField(item.key, item.fixed ? Math.max(0, +(item.val + amt).toFixed(2)) : Math.max(0, item.val + amt))}>{lbl}</button>
                  ))}
                  <button
                    onClick={() => setShowCustom(s => ({ ...s, [item.key]: !s[item.key] }))}
                    style={showCustom[item.key] ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', borderColor: 'transparent' } : {}}
                  >✏️</button>
                </div>
                {showCustom[item.key] && (
                  <div className={styles.customRow}>
                    <input
                      type="number"
                      className={styles.customInput}
                      placeholder={item.placeholder}
                      value={customInputs[item.key]}
                      step={item.fixed ? '0.1' : '1'}
                      onChange={e => setCustomInputs(c => ({ ...c, [item.key]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') applyCustom(item.key, item.fixed); }}
                    />
                    <button className={styles.customSetBtn} onClick={() => applyCustom(item.key, item.fixed)}>Set exact</button>
                    <button className={styles.customAddBtn} onClick={() => {
                      const val = parseFloat(customInputs[item.key]);
                      if (!isNaN(val) && val > 0) {
                        updateField(item.key, item.fixed ? Math.max(0, +(item.val + val).toFixed(2)) : Math.max(0, item.val + Math.round(val)));
                        setCustomInputs(c => ({ ...c, [item.key]: '' }));
                      }
                    }}>+ Add</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className={styles.card}>
            <h2>✅ Today&apos;s checklist</h2>
            {DEFAULT_CHECKLIST.map(item => (
              <label key={item.id} className={`${styles.checkItem} ${state.checklist[item.id] ? styles.checkDone : ''}`}>
                <input type="checkbox" checked={!!state.checklist[item.id]} onChange={() => toggleCheck(item.id)} />
                <span>{item.label}</span>
              </label>
            ))}
          </section>

          <section className={styles.card}>
            <h2>⚖️ Weekly weight</h2>
            <div className={styles.weightRow}>
              <span className={styles.weightLabel}>Current:</span>
              <input type="number" className={styles.weightInput} value={state.weight} step="0.1" onChange={e => updateField('weight', parseFloat(e.target.value) || 0)} />
              <span className={styles.weightLabel}>kg</span>
            </div>
            <p className={styles.hint}>Target: 75 kg by end of Month 3</p>
          </section>
        </div>
      )}

      {tab === 'meals' && (
        <div>
          <section className={styles.card} style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '1.5px solid #e9d5ff' }}>
            <h2>🗓️ Today is {todayDayName}day</h2>
            <p className={styles.hint} style={{ fontSize: '13px' }}>Pick one option for each meal. Your selections save automatically and reset daily.</p>
          </section>
          {renderMealOptions('Breakfast Options', BREAKFAST_OPTIONS, 'breakfast', '🌅', '/images/breakfast.png')}
          {renderMealOptions('Lunch Options', LUNCH_OPTIONS, 'lunch', '☀️', '/images/lunch.png')}
          {renderMealOptions('Evening Snack', SNACK_OPTIONS, 'snack', '🫖', '/images/snack.png')}
          {renderMealOptions('Dinner Options', DINNER_OPTIONS, 'dinner', '🌙', '/images/dinner.png')}
        </div>
      )}

      {tab === 'diet' && (
        <div>
          <section className={styles.card}>
            <div className={styles.imgCard}>
              <img src="/images/hero_foods.png" alt="Hero Foods" />
              <div className={styles.imgOverlay}>
                <h3>Your Hero Foods</h3>
                <p>Eat these daily — they target LDL, SGPT & weight</p>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              {HERO_FOODS.map(f => (
                <div key={f.name} className={styles.metricRow}>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>{f.name}</span>
                  <strong style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{f.why}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h2>🚫 Foods to Cut Hard</h2>
            <p className={styles.hint} style={{ marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>These drove LDL to 230. Non-negotiable for 3 months.</p>
            {AVOID_FOODS.map((f, i) => (
              <div key={f.name} onClick={() => setExpandedAvoid(expandedAvoid === i ? null : i)} style={{ cursor: 'pointer' }}>
                <div className={styles.metricRow} style={{ borderBottom: expandedAvoid === i ? 'none' : undefined }}>
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{f.name}</span>
                  <strong style={{ fontSize: '16px', color: '#94a3b8' }}>{expandedAvoid === i ? '−' : '+'}</strong>
                </div>
                {expandedAvoid === i && (
                  <div style={{ padding: '0 0 12px', fontSize: '13px', color: '#64748b', fontWeight: 500, lineHeight: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    {f.detail}
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className={styles.card}>
            <h2>📊 Daily Macro Targets</h2>
            {[
              { label: 'Calories', value: '2,000-2,200 kcal', why: '~400 kcal deficit' },
              { label: 'Protein', value: '110-130g', why: 'Preserve muscle on cut' },
              { label: 'Carbs', value: '220-250g', why: 'Low GI sources' },
              { label: 'Fats', value: '55-65g', why: 'Mostly unsaturated' },
              { label: 'Fiber', value: '35-40g', why: 'LDL lowering' },
              { label: 'Water', value: '3-3.5L', why: 'Hydration, BP' },
            ].map(m => (
              <div key={m.label} className={styles.metricRow}>
                <span>{m.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <strong>{m.value}</strong>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{m.why}</div>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'gym' && (
        <div>
          {/* Overview */}
          <section className={styles.card} style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '1.5px solid #e9d5ff' }}>
            <h2>🏋️ Only 3 Workouts to Remember</h2>
            <p className={styles.hint} style={{ fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>Push · Pull · Legs — do each twice a week. Heavy early, volume later. Same exercises, different reps.</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className={styles.heroTag} style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e', borderColor: '#fcd34d' }}>🔴 Heavy = 6-8 reps, heavier</span>
              <span className={styles.heroTag} style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', color: '#1d4ed8', borderColor: '#93c5fd' }}>🔵 Volume = 10-15 reps, lighter</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className={styles.heroTag}>Phase 1: Wk 1-3 (65-70%)</span>
              <span className={styles.heroTag} style={{ background: 'linear-gradient(135deg, #f3e8ff, #fce7f3)', color: '#7c3aed', borderColor: '#c4b5fd' }}>Phase 2: Wk 4-12 (full + HIIT)</span>
            </div>
          </section>

          {/* Image grid */}
          <div className={styles.gymGrid}>
            {GYM_SPLIT.slice(0, 4).map(day => (
              <div key={day.day} className={styles.imgCard}>
                <img src={day.img} alt={day.focus} />
                <div className={styles.imgOverlay}>
                  <h3>{day.day} · {day.focus}</h3>
                  <p>{day.duration}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Expandable daily workouts */}
          {GYM_SPLIT.map(day => (
            <section key={day.day} className={styles.card}>
              <div onClick={() => setExpandedAvoid(expandedAvoid === day.day ? null : day.day)} style={{ cursor: day.exercises.length ? 'pointer' : 'default' }}>
                <div className={styles.gymHead} style={{ marginBottom: day.exercises.length ? '0' : '6px' }}>
                  <span className={styles.gymDay} style={day.day === todayDayName ? { background: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: '#fff' } : {}}>{day.day}</span>
                  <span className={styles.gymFocus} style={{ flex: 1 }}>{day.focus}</span>
                  {day.tag === 'heavy' && <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>HEAVY</span>}
                  {day.tag === 'volume' && <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' }}>VOLUME</span>}
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginLeft: '8px' }}>{day.duration}</span>
                  {day.exercises.length > 0 && <span style={{ fontSize: '16px', color: '#a855f7', fontWeight: 700, marginLeft: '8px' }}>{expandedAvoid === day.day ? '−' : '+'}</span>}
                </div>
                <div className={styles.gymDetail} style={{ marginLeft: '58px', marginTop: '4px' }}>{day.detail}</div>
              </div>
              {expandedAvoid === day.day && day.exercises.length > 0 && (
                <div style={{ marginTop: '16px', animation: 'fadeUp .3s ease-out' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 6px', color: '#c4b5fd', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Exercise</th>
                          <th style={{ textAlign: 'center', padding: '8px 6px', color: '#c4b5fd', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Sets × Reps</th>
                          <th style={{ textAlign: 'center', padding: '8px 6px', color: '#c4b5fd', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Rest</th>
                          <th style={{ textAlign: 'left', padding: '8px 6px', color: '#c4b5fd', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.exercises.map((ex, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <td style={{ padding: '10px 6px', fontWeight: 600, color: '#f8fafc' }}>{ex.name}</td>
                            <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: '#a855f7' }}>{ex.sets}</td>
                            <td style={{ padding: '10px 6px', textAlign: 'center', color: '#94a3b8' }}>{ex.rest}</td>
                            <td style={{ padding: '10px 6px', color: '#94a3b8', fontStyle: ex.note ? 'italic' : 'normal' }}>{ex.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(21, 128, 61, 0.2)', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    🏃 Finisher: {day.cardio}
                  </div>
                </div>
              )}
            </section>
          ))}

          {/* Training Rules */}
          <section className={styles.card}>
            <h2>📏 Training Rules</h2>
            {[
              ['Main lifts', '4 × 6-8 reps'],
              ['Accessories', '3 × 10-12 reps'],
              ['Heavy rest', '2-3 min'],
              ['Accessory rest', '60-90 sec'],
              ['Post-workout cardio', '15-20 min (Zone 2)'],
              ['Daily steps', '8,000+'],
              ['Progressive overload', '+2.5 kg every 2 weeks'],
              ['Deload', 'Every 6 weeks (cut weight 40%)'],
              ['Sleep minimum', '7+ hours (non-negotiable)'],
            ].map(([l, v]) => (
              <div key={l} className={styles.metricRow}><span>{l}</span><strong>{v}</strong></div>
            ))}
          </section>

          {/* HIIT Protocol */}
          <section className={styles.card}>
            <h2>⚡ HIIT Protocol (Wed, Wk 4+)</h2>
            <p className={styles.hint} style={{ marginBottom: '12px', color: '#1e293b', fontSize: '13px' }}>Bike, treadmill, or rowing machine</p>
            {[
              ['Warm-up', '5 min easy pace'],
              ['Work interval', '30 sec all-out (85-95%)'],
              ['Recovery', '90 sec easy'],
              ['Rounds', '5 → build to 8'],
              ['Cool-down', '4 min'],
              ['Total time', '~25 min'],
            ].map(([l, v]) => (
              <div key={l} className={styles.metricRow}><span>{l}</span><strong>{v}</strong></div>
            ))}
          </section>

          {/* Zone 2 + Cardio Summary */}
          <section className={styles.card}>
            <h2>🏃 Cardio Summary</h2>
            <p className={styles.hint} style={{ marginBottom: '12px', color: '#dc2626', fontSize: '13px' }}>Cardio moves LDL. Don&apos;t skip it. Zone 2 = HR 125-140 bpm.</p>
            {[
              ['Post-lift Zone 2', '15 min × 5 days = 75 min/wk'],
              ['HIIT (Wed)', '25 min/wk (from Wk 4)'],
              ['Sat long cardio', '30-40 min/wk'],
              ['Total structured', '~2.5 hours/week'],
              ['Daily steps', '8,000+ (built into life)'],
            ].map(([l, v]) => (
              <div key={l} className={styles.metricRow}><span>{l}</span><strong>{v}</strong></div>
            ))}
          </section>

          {/* Weekly Volume */}
          <section className={styles.card}>
            <h2>📊 Weekly Volume (Phase 2)</h2>
            <p className={styles.hint} style={{ marginBottom: '12px' }}>All within evidence-based optimal ranges</p>
            {[
              ['Chest', '13 sets', '10-14 ✓'],
              ['Back', '14 sets', '12-16 ✓'],
              ['Shoulders', '12 sets', '8-12 ✓'],
              ['Quads', '13 sets', '10-14 ✓'],
              ['Hams/Glutes', '12 sets', '10-14 ✓'],
              ['Biceps', '9 sets', '6-10 ✓'],
              ['Triceps', '9 sets', '6-10 ✓'],
              ['Calves', '8 sets', '6-10 ✓'],
              ['Core', '6 sets', '6-10 ✓'],
            ].map(([muscle, sets, target]) => (
              <div key={muscle} className={styles.metricRow}>
                <span>{muscle}</span>
                <div style={{ textAlign: 'right' }}>
                  <strong>{sets}</strong>
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{target}</div>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'stats' && (
        <div>
          <section className={styles.card}>
            <h2>🎯 Baseline vs 3-Month Target</h2>
            {STATS.map(s => (
              <div key={s.label} className={styles.statRow}>
                <div className={styles.statLabel}>{s.icon} {s.label}</div>
                <div className={styles.statValues}>
                  <span className={styles.statCurrent}>{s.current}</span>
                  <span className={styles.statArrow}>→</span>
                  <span className={styles.statTarget}>{s.target}</span>
                </div>
              </div>
            ))}
          </section>

          <section className={styles.card}>
            <h2>🏥 Medical Follow-up</h2>
            {[['Week 1', 'Doctor consult re: statin'], ['Week 2', 'Start home BP monitoring'], ['Week 6-8', 'Repeat LFT'], ['Month 3', 'Full lipid + LFT + HbA1c'], ['Month 6', 'Full panel + 2D echo']].map(([t, v]) => (
              <div key={t} className={styles.metricRow}><span>{t}</span><strong>{v}</strong></div>
            ))}
          </section>

          <section className={styles.card}>
            <h2>🚫 Zero Tolerance (3 months)</h2>
            <div className={styles.tagRow}>
              {['Alcohol', 'Smoking', 'Tobacco', 'Fried food', 'Sugary drinks'].map(f => (
                <span key={f} className={styles.avoidTag}>{f}</span>
              ))}
            </div>
          </section>
        </div>
      )}

      <footer className={styles.footer}>Progress saves automatically · Resets daily at midnight</footer>
    </div>
  );
}
