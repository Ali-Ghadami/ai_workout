import { SPORTS, todayKey, dateShift, trackingStats, buildPlan } from './planner.mjs';
import { parseImport } from './imports.mjs';

const icons = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  journal: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h4m-4 3h7"/>',
  plan: '<path d="m3 17 6-6 4 4 7-8m-5 0h5v5"/><path d="M4 21h16"/>',
  connections: '<path d="m10 13 4-4m-6 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 10a3.5 3.5 0 0 0 5 0l4-4a3.5 3.5 0 0 0-5-5l-1 1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M20 12H4m7-7-7 7 7 7"/>',
  chevron: '<path d="m14 6-6 6 6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  pulse: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  strength: '<path d="m6 18 12-12M3 14l7 7m4-18 7 7M2 17l5 5M17 2l5 5"/>',
  running: '<circle cx="15" cy="4" r="2"/><path d="m5 10 4-3 4 2 3 4h4M13 9l-3 6 5 2v4m-5-6-3 4H3"/>',
  cycling: '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="m5.5 16 5-7 4 7h-3m7 0-3-10h3M9 7h3"/>',
  swimming: '<circle cx="17" cy="7" r="2"/><path d="m4 13 6-5 4 3m-4-3 3-3h3M2 17c2-2 4 2 6 0s4 2 6 0 4 2 8 0M2 21c2-2 4 2 6 0s4 2 6 0 4 2 8 0"/>',
  hiking: '<path d="m2 19 7-12 4 6 3-4 6 10H2Zm5-9 2 2 2-2"/>',
  fitness: '<path d="M12 21s-9-5.5-9-11a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 5.5-9 11-9 11Z"/>',
  crossfit: '<path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>',
  edit: '<path d="m14 5 5 5m-14 9 4-1L21 6l-4-4L5 14l-1 5Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  spark: '<path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Zm7 13v6m-3-3h6"/>',
  moon: '<path d="M20 15A8 8 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
};
const pages = {
  dashboard: ['داشبورد', 'dashboard'],
  journal: ['دفتر تمرین', 'journal'],
  plan: ['برنامهٔ من', 'plan'],
  connections: ['ورود اطلاعات', 'connections'],
};
const sources = { manual: 'ثبت دستی', 'apple-health': 'Apple Health', strava: 'Strava' };
const weekdays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const fa = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
const storageKey = 'ritm-workout-v1';
const view = document.querySelector('#view');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
let store = loadStore();
let filter = 'all';
let visibleCount = 40;
let coachEnabled = false;
let coachPending = false;
let coachResult = null;
let toastTimer;

function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.pulse}</svg>`;
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function dateLabel(date, format = shortDate) {
  return format.format(new Date(date + 'T12:00:00'));
}

function sportLabel(sport) {
  return Object.hasOwn(SPORTS, sport) ? SPORTS[sport].label : 'ورزش';
}

function sportBadge(sport) {
  return `<span class="sport-icon sport-${escape(sport)}">${icon(sport, 19)}</span>`;
}

function demoState(finished = false) {
  const today = todayKey();
  const startDate = dateShift(today, finished ? -29 : -17);
  const sample = [
    [0, 'strength', 51, 6], [1, 'running', 28, 4, 4.2], [3, 'strength', 58, 6],
    [5, 'cycling', 75, 5, 22.4], [6, 'strength', 43, 6], [8, 'strength', 56, 7],
    [9, 'running', 36, 5, 5.4], [11, 'strength', 65, 6], [12, 'cycling', 52, 4, 16.2],
    [14, 'strength', 47, 6], [15, 'running', 32, 5, 4.8], [17, 'strength', 57, 6],
  ];
  if (finished) sample.push([19, 'running', 31, 4, 4.6], [21, 'strength', 51, 6], [23, 'cycling', 55, 5, 17], [24, 'strength', 45, 6], [27, 'strength', 55, 6], [29, 'running', 35, 4, 5.2]);
  return {
    demo: true,
    profile: { name: 'آرمان', primarySport: 'strength', secondarySports: ['running', 'cycling'], days: [0, 2, 4, 6], startDate },
    activities: sample.map(([offset, sport, duration, effort, distance], index) => ({
      id: 'demo-' + index, sport, date: dateShift(startDate, offset), duration, effort, distance: distance ?? null,
      source: index === 10 ? 'strava' : index === 8 ? 'apple-health' : 'manual',
    })),
  };
}

function loadStore() {
  try {
    const state = JSON.parse(localStorage.getItem(storageKey));
    if (state?.profile && Array.isArray(state.activities)) return state;
  } catch {
    // A disabled or empty store can still display the example.
  }
  return demoState();
}

function save(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    notify('ذخیره انجام نشد. فضای ذخیره‌سازی مرورگر را بررسی کن.');
    return false;
  }
  store = next;
  coachResult = null;
  return true;
}

function notify(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5400);
}

function pageKey() {
  const key = location.hash.slice(1);
  return Object.hasOwn(pages, key) ? key : 'dashboard';
}

function render() {
  const page = pageKey();
  const stats = trackingStats(store.profile, store.activities);
  document.querySelector('#nav').innerHTML = Object.entries(pages).map(([key, [label, glyph]]) =>
    `<a href="#${key}" class="nav-link${key === page ? ' current' : ''}" ${key === page ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`
  ).join('');
  document.querySelector('#section-title').textContent = pages[page][0];
  document.querySelector('#today-label').textContent = dateLabel(todayKey(), longDate);
  document.querySelector('#profile-name').textContent = store.profile.name || 'ورزشکار';
  document.querySelector('#avatar').textContent = Array.from(store.profile.name || 'و')[0];
  view.innerHTML = ({
    dashboard: () => dashboard(stats),
    journal,
    plan,
    connections,
  })[page]();
}

function demoBanner() {
  return store.demo ? `<div class="demo-banner"><span>${icon('info', 17)} در حال مشاهدهٔ داده‌های نمونه هستی.</span><button class="text-button" data-action="start" type="button">شروع ثبت واقعی ${icon('arrow', 16)}</button></div>` : '';
}

function dashboard(stats) {
  const { profile } = store;
  const elapsed = Math.min(stats.elapsedDays, 30);
  return `
    <section class="greeting">
      <div><div class="eyebrow"><span class="status-dot"></span> مرور تمرین‌های تو</div><h1>سلام، ${escape(profile.name || 'ورزشکار')}!</h1><p>ورزش‌هایی که دوست داری، در یک دفتر.</p></div>
      <button class="button button-soft dashboard-profile" type="button" data-action="profile">${icon('edit', 17)} تنظیم ورزش‌ها</button>
    </section>
    ${demoBanner()}
    <section class="hero" aria-label="دورهٔ ثبت تمرین">
      <svg class="hero-art" viewBox="0 0 650 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="hero-grid" width="23" height="23" patternUnits="userSpaceOnUse"><path d="M 23 0 H 0 V 23" fill="none" stroke="#dcff9d" stroke-opacity=".09"/></pattern><radialGradient id="glow"><stop stop-color="#94d462" stop-opacity=".31"/><stop offset="1" stop-color="#94d462" stop-opacity="0"/></radialGradient></defs>
        <rect width="650" height="250" fill="url(#glow)"/><rect width="650" height="250" fill="url(#hero-grid)"/>
        <g transform="rotate(-24 242 130)" fill="none" stroke="#c8f76f">
          <rect x="-25" y="18" width="534" height="222" rx="111" opacity=".12"/><rect x="-13" y="30" width="510" height="198" rx="99" opacity=".20"/>
          <rect x="-1" y="42" width="486" height="174" rx="87" opacity=".31"/><rect x="11" y="54" width="462" height="150" rx="75" opacity=".22"/>
          <rect x="23" y="66" width="438" height="126" rx="63" opacity=".32"/><rect x="35" y="78" width="414" height="102" rx="51" opacity=".25"/>
          <rect x="47" y="90" width="390" height="78" rx="39" opacity=".16"/>
          <path d="M75 42h323a87 87 0 0 1 87 87" stroke-width="2" stroke-dasharray="3 7" opacity=".72"/>
          <circle cx="331" cy="42" r="6" fill="#cef276" stroke="#263c29" stroke-width="2"/><circle cx="76" cy="192" r="4" fill="#cef276" stroke="none"/>
        </g>
        <path d="M80 195h27l11-30 13 55 12-25h34" fill="none" stroke="#cbf36d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".73"/>
      </svg>
      <div class="hero-copy">
        <span class="hero-tag">${icon(stats.ready ? 'check' : 'pulse', 16)} ${stats.ready ? 'آمادهٔ برنامه‌ریزی' : 'دورهٔ شناخت روتین'}</span>
        <h2>مسیر ۳۰ روزهٔ تو</h2>
        <p>با ثبت هر تمرین، برنامه‌ای نزدیک‌تر به ریتم واقعی زندگی‌ات می‌سازی.</p>
        <div class="hero-progress">
          <span class="progress-track" role="progressbar" aria-label="روزهای دورهٔ ثبت" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${elapsed}"><span style="width:${elapsed / 30 * 100}%"></span></span>
          <span>روز ${fa.format(elapsed)} از ۳۰</span>
        </div>
      </div>
    </section>
    <section class="metrics" aria-label="آمار تمرین">
      ${metric('جلسهٔ تمرین', stats.sessionCount, 'ثبت‌شده در بازهٔ نمودار', 'pulse', 'green')}
      ${metric('دقیقهٔ تمرین', stats.totalMinutes, 'مجموع زمان تمرین‌ها', 'clock', 'yellow')}
      ${metric('روز فعال', stats.activeDays, 'روزهایی با دست‌کم یک تمرین', 'journal', 'blue')}
      ${metric('رشتهٔ تمرینی', stats.sports.length, 'ورزش‌های ثبت‌شده در این بازه', 'layers', 'pink')}
    </section>
    <div class="dashboard-grid">
      ${chart(stats)}
      ${roadmap(stats)}
    </div>
    <section class="panel recent">
      <div class="panel-head"><div><h2>آخرین تمرین‌ها</h2><p>تازه‌ترین جلسه‌های دفتر تمرین تو</p></div><a class="text-button" href="#journal">همهٔ تمرین‌ها ${icon('arrow', 16)}</a></div>
      ${activityRows(sortedActivities().slice(0, 4), false)}
    </section>`;
}

function metric(label, value, description, glyph, tone) {
  return `<div class="metric panel"><div class="metric-title"><span class="metric-icon ${tone}">${icon(glyph, 19)}</span><span>${label}</span></div><strong>${fa.format(value)}</strong><small>${description}</small></div>`;
}

function chart(stats) {
  const today = todayKey();
  const dates = new Map(stats.recentDays.map(day => [day.date, day]));
  const start = stats.elapsedDays > 30 ? dateShift(today, -29) : store.profile.startDate;
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = dateShift(start, index);
    const record = dates.get(date);
    return { date, minutes: record?.minutes ?? 0, count: record?.count ?? 0 };
  });
  const peak = Math.max(30, Math.ceil(Math.max(...days.map(day => day.minutes)) / 30) * 30);
  const rows = [peak, peak * 2 / 3, peak / 3, 0];
  return `
    <section class="panel chart">
      <div class="panel-head"><div><h2>نمودار فعالیت</h2><p>مدت تمرین در هر روز</p></div><span class="pill">${icon('journal', 15)} بازهٔ ۳۰ روزه</span></div>
      <div class="chart-body" aria-label="نمودار دقیقه‌های تمرین در سی روز">
        <div class="chart-scale" aria-hidden="true">${rows.map(row => `<span>${fa.format(row)}</span>`).join('')}</div>
        <div class="chart-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="bars">${days.map(day => {
          const future = day.date > today;
          const label = `${dateLabel(day.date)}، ${future ? 'پیش رو' : fa.format(day.minutes) + ' دقیقه در ' + fa.format(day.count) + ' جلسه'}`;
          return `<div class="bar-col"><div class="bar ${future ? 'future' : day.minutes ? 'trained' : 'off'}${day.date === today ? ' today' : ''}" style="--height:${day.minutes / peak * 100}%" title="${label}" aria-label="${label}" role="img"></div></div>`;
        }).join('')}</div>
        <div class="chart-dates" aria-hidden="true">${[0, 7, 14, 21, 29].map(index => `<span>${dateLabel(days[index].date)}</span>`).join('')}</div>
      </div>
      <div class="legend"><span><i></i> زمان تمرین</span><span><i></i> بدون ثبت</span><span><i></i> روزهای پیش رو</span></div>
    </section>`;
}

function roadmap(stats) {
  const title = stats.ready ? 'برنامهٔ هفتگی آماده است' : 'تا برنامهٔ هفتگی';
  return `
    <section class="panel roadmap">
      <div class="panel-head"><div class="roadmap-icon">${icon(stats.ready ? 'check' : 'lock', 21)}</div><span class="pill ${stats.ready ? 'pill-green' : ''}">${stats.ready ? 'آماده' : 'در حال ثبت'}</span></div>
      <h2>${title}</h2>
      <p>${stats.ready ? 'دادهٔ کافی برای ساختن هفتهٔ بعد ثبت شده است.' : 'زمان و تعداد ثبت‌ها تعیین می‌کنند برنامه کی آماده شود.'}</p>
      <div class="roadmap-lines">
        ${roadmapLine('زمان دوره', Math.min(stats.elapsedDays, 30), 30)}
        ${roadmapLine('تعداد جلسه‌ها', stats.sessionCount, stats.evidenceGoal)}
        ${roadmapLine('جلسه‌های ورزش اصلی', stats.primaryCount, stats.primaryEvidenceGoal)}
        ${roadmapLine('روزهای فعال', stats.activeDays, stats.evidenceDaysGoal)}
      </div>
      <a class="button button-soft wide" href="#plan">${stats.ready ? 'مشاهدهٔ برنامه' : 'مسیر آماده شدن برنامه'} ${icon('arrow', 16)}</a>
    </section>`;
}

function roadmapLine(label, count, target) {
  return `<div><span>${count >= target ? icon('check', 15) : '<i></i>'}${label}</span><strong>${fa.format(Math.min(count, target))} از ${fa.format(target)}</strong></div>`;
}

function sortedActivities() {
  return store.activities.slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
}

function activityRows(activities, editable) {
  if (!activities.length) return `<div class="empty">${icon('journal', 27)}<strong>تمرینی در این فهرست ثبت نشده.</strong><p>می‌توانی یک تمرین ثبت کنی یا فایل ورزشی‌ات را وارد کنی.</p><button class="button button-soft" type="button" data-action="log">${icon('plus', 16)} ثبت تمرین</button></div>`;
  return `<div class="activity-list">${activities.map(activity => `
    <article class="activity">
      <div class="activity-name">${sportBadge(activity.sport)}<div><strong>${sportLabel(activity.sport)}</strong><small>${dateLabel(activity.date)} · <bdi>${sources[activity.source] ?? sources.manual}</bdi></small></div></div>
      <div class="activity-stat"><strong>${fa.format(activity.duration)}</strong> دقیقه</div>
      <div class="activity-stat distance">${activity.distance != null ? `<strong>${fa.format(activity.distance)}</strong> کیلومتر` : '<span class="dash">—</span>'}</div>
      <div class="activity-stat effort">${activity.effort != null ? `شدت <strong>${fa.format(activity.effort)}</strong> از ۱۰` : '<span class="dash">—</span>'}</div>
      ${editable ? `<div class="row-actions">${activity.source === 'manual' ? `<button class="icon-button" type="button" aria-label="ویرایش تمرین" data-action="edit-log" data-id="${escape(activity.id)}">${icon('edit', 17)}</button>` : ''}<button class="icon-button" type="button" aria-label="حذف تمرین" data-action="delete-log" data-id="${escape(activity.id)}">${icon('trash', 17)}</button></div>` : ''}
      ${editable && activity.notes ? `<p class="activity-note">${escape(activity.notes)}</p>` : ''}
    </article>`).join('')}</div>`;
}

function journal() {
  const activities = sortedActivities().filter(activity => filter === 'all' || activity.sport === filter);
  return `
    <section class="greeting"><div><div class="eyebrow"><span class="status-dot"></span> ثبت و مرور</div><h1>دفتر تمرین</h1><p>زمان، شدت و مسافت جلسه‌هایی را که انجام داده‌ای ثبت کن.</p></div></section>
    ${demoBanner()}
    <section class="panel recent"><div class="panel-head"><div><h2>تمرین‌های ثبت‌شده</h2><p>${fa.format(activities.length)} جلسه در این فهرست</p></div>
    <label class="filter-label">ورزش<select id="sport-filter"><option value="all">همهٔ ورزش‌ها</option>${sportOptions(filter)}</select></label></div>
    ${activityRows(activities.slice(0, visibleCount), true)}
    ${activities.length > visibleCount ? `<button type="button" class="button button-soft more" data-action="more">نمایش تمرین‌های بیشتر</button>` : ''}</section>`;
}

function plan() {
  const current = buildPlan(store.profile, store.activities);
  return `
    <section class="greeting"><div><div class="eyebrow"><span class="status-dot"></span> هفتهٔ پیش رو</div><h1>برنامهٔ من</h1><p>ورزش اصلی‌ات در اولویت است و هر جلسهٔ مکمل یک هدف مشخص دارد.</p></div></section>
    ${demoBanner()}
    ${current.ready ? `${planWeek(current)}${coachPanel()}` : `
      <section class="panel plan-gate">
        <span class="roadmap-icon">${icon('lock', 26)}</span><h2>برنامه بعد از دورهٔ ثبت آماده می‌شود</h2>
        <ul>${current.rationale.map(line => `<li>${escape(line)}</li>`).join('')}</ul>
        <div class="gate-actions"><button class="button button-dark" data-action="log" type="button">${icon('plus', 17)} ثبت تمرین</button>
        <button class="button button-soft" data-action="preview-plan" type="button">دیدن برنامهٔ نمونه ${icon('arrow', 16)}</button></div>
      </section>`}
  `;
}

function planWeek(plan) {
  return `<div class="week">${plan.week.map(session => `
    <article class="panel session ${session.sport ? '' : 'recovery'}">
      <div class="session-date">${dateLabel(session.date, longDate)}</div>
      <div class="session-main">${session.sport ? sportBadge(session.sport) : `<span class="sport-icon">${icon('moon', 19)}</span>`}<div><h3>${escape(session.title)}</h3><p>${escape(session.purpose)}</p></div></div>
      ${session.sport ? `<span class="pill session-time">${icon('clock', 15)} ${fa.format(session.duration)} دقیقه · شدت ${fa.format(session.effort)} از ۱۰</span>` : ''}
      ${session.details?.length ? `<details><summary>جزئیات جلسه</summary><ul>${session.details.map(line => `<li>${escape(line)}</li>`).join('')}</ul></details>` : ''}
    </article>`).join('')}</div>
    ${plan.rationale.length ? `<section class="panel coach"><div class="panel-head"><div><h2>منطق برنامهٔ این هفته</h2><p>براساس تمرین‌های ثبت‌شده و روزهای انتخابی تو</p></div>${icon('plan', 22)}</div><ul>${plan.rationale.map(line => `<li>${escape(line)}</li>`).join('')}</ul></section>` : ''}`;
}

function manualSummary() {
  const dateOffsets = new Map(Array.from({ length: 30 }, (_, offset) => [dateShift(todayKey(), -offset), offset]));
  return sortedActivities()
    .filter(activity => activity.source === 'manual' && activity.date >= store.profile.startDate && dateOffsets.has(activity.date))
    .slice(0, 90)
    .map(({ sport, date, duration, effort }) => ({ sport, daysAgo: dateOffsets.get(date), duration, effort }));
}

function coachPanel() {
  if (store.demo) return '';
  const count = manualSummary().length;
  const caption = coachEnabled ? (count ? 'با درخواست تو، رشته‌های انتخابی و خلاصهٔ ثبت‌های دستی شامل رشته، مدت، شدت و فاصلهٔ زمانی به OpenAI فرستاده می‌شود.' : 'برای دریافت پیشنهاد هوش مصنوعی، دست‌کم یک جلسه را دستی ثبت کن.') : 'راهنمای هوش مصنوعی پس از پیکربندی OpenAI در سرور فعال می‌شود.';
  return `
    <section class="panel coach">
      <div class="panel-head"><div><h2>تمرکز پیشنهادی مربی هوش مصنوعی</h2><p>${caption}</p></div><span class="roadmap-icon">${icon('spark', 20)}</span></div>
      ${coachResult ? `<dl class="coach-result"><dt>مرور روتین</dt><dd>${escape(coachResult.summary)}</dd><dt>ورزش اصلی</dt><dd>${escape(coachResult.primaryFocus)}</dd><dt>ورزش‌های مکمل</dt><dd>${escape(coachResult.secondaryFocus)}</dd></dl>` : ''}
      <button type="button" class="button button-soft" data-action="coach" ${!coachEnabled || !count || coachPending ? 'disabled' : ''}>${icon('spark', 17)} ${coachPending ? 'در حال بررسی تمرین‌ها…' : 'ارسال خلاصه و دریافت پیشنهاد'}</button>
    </section>`;
}

function connections() {
  return `
    <section class="greeting"><div><div class="eyebrow"><span class="status-dot"></span> تمرین‌های قبلی</div><h1>ورود اطلاعات</h1><p>تمرین‌های ثبت‌شده در برنامه‌های ورزشی‌ات را به دفتر تمرین اضافه کن.</p></div></section>
    ${demoBanner()}
    <div class="import-grid">
      ${importCard('apple-health', 'Apple Health', 'از پروفایل خود در اپ Health گزینهٔ Export All Health Data را بزن و فایل ZIP یا XML را انتخاب کن.', '.zip,.xml', 'health')}
      ${importCard('strava', 'Strava', 'از تنظیمات حساب Strava خروجی بگیر و فایل activities.csv داخل بستهٔ دانلودی را انتخاب کن.', '.csv', 'strava')}
    </div>
    <section class="panel coach"><div class="panel-head"><div><h2>داده‌ها کجا می‌مانند؟</h2><p>فایل‌ها در همین مرورگر خوانده می‌شوند. فقط اطلاعات جلسه‌های ورزشی در دفتر تمرین ذخیره می‌شود. برای تهیهٔ پیشنهاد هوش مصنوعی تنها خلاصهٔ ثبت‌های دستی، آن هم با درخواست خودت، ارسال می‌شود.</p></div>${icon('lock', 22)}</div></section>`;
}

function importCard(provider, title, description, accept, tone) {
  const count = store.activities.filter(activity => activity.source === provider).length;
  return `<section class="panel import-card">
    <div class="panel-head"><span class="provider-icon ${tone}">${icon(tone === 'health' ? 'fitness' : 'plan', 24)}</span><span class="pill">${fa.format(count)} جلسه وارد شده</span></div>
    <h2><bdi>${title}</bdi></h2><p>${description}</p>
    <input type="file" hidden id="file-${provider}" data-provider="${provider}" accept="${accept}">
    <button class="button button-soft" type="button" data-action="import" data-provider="${provider}">${icon('upload', 18)} انتخاب فایل</button>
  </section>`;
}

function sportOptions(selected) {
  return Object.entries(SPORTS).map(([key, sport]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${sport.label}</option>`).join('');
}

function openDialog(title, contents, extraClass = '') {
  dialog.className = extraClass;
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" type="button" aria-label="بستن" data-action="close">${icon('close', 21)}</button></div>${contents}`;
  if (!dialog.open) dialog.showModal();
}

function showProfile(start = false) {
  const profile = start ? { name: '', primarySport: 'strength', secondarySports: [], days: [0, 2, 4], startDate: todayKey() } : store.profile;
  openDialog(start ? 'شروع دفتر تمرین تو' : 'تنظیمات تمرین', `
    <form id="profile-form" data-start="${start}">
      ${start ? '<p>با ذخیرهٔ این فرم، یک دفتر خالی برای تمرین‌های خودت باز می‌شود.</p>' : ''}
      <div class="form-grid">
        <label>نام <input name="name" maxlength="40" required placeholder="نام کوچک" value="${escape(profile.name)}"></label>
        <label>ورزش اصلی <select name="primarySport" required>${sportOptions(profile.primarySport)}</select></label>
      </div>
      <fieldset><legend>ورزش‌های مکمل</legend><div class="choices">${Object.entries(SPORTS).map(([key, { label }]) => `<label class="choice"><input type="checkbox" name="secondary" value="${key}" ${profile.secondarySports.includes(key) ? 'checked' : ''} ${key === profile.primarySport ? 'disabled' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>روزهایی که معمولاً وقت تمرین داری</legend><div class="choices">${[6, 0, 1, 2, 3, 4, 5].map(day => `<label class="choice"><input type="checkbox" name="day" value="${day}" ${profile.days.includes(day) ? 'checked' : ''}><span>${weekdays[day]}</span></label>`).join('')}</div></fieldset>
      <label>تاریخ شروع دوره <input name="startDate" type="date" max="${todayKey()}" required value="${profile.startDate}"></label>
      <small>برای استفاده از تمرین‌های قبلی، تاریخ شروع را روی روز آغاز آن دوره بگذار.</small>
      <p class="form-error" role="alert" hidden></p>
      <div class="dialog-actions"><button class="button button-dark" type="submit">${icon('check', 17)} ذخیرهٔ تنظیمات</button></div>
    </form>`);
}

function showLog(activity = null) {
  openDialog(activity ? 'ویرایش تمرین' : 'ثبت تمرین', `
    <form id="log-form" data-id="${escape(activity?.id)}">
      ${store.demo ? '<p>این تمرین در دفتر نمونه ذخیره می‌شود. برای ساختن دفتر خودت، «شروع ثبت واقعی» را انتخاب کن.</p>' : ''}
      <div class="form-grid">
        <label>ورزش <select name="sport" required>${sportOptions(activity?.sport || store.profile.primarySport)}</select></label>
        <label>تاریخ تمرین <input type="date" name="date" max="${todayKey()}" value="${activity?.date ?? todayKey()}" required></label>
        <label>مدت (دقیقه) <input type="number" name="duration" min="1" max="1440" step="any" inputmode="decimal" placeholder="۴۵" value="${activity?.duration ?? ''}" required></label>
        <label>شدت حس‌شده (۱ تا ۱۰) <input type="number" name="effort" min="1" max="10" step="1" inputmode="numeric" placeholder="اختیاری" value="${activity?.effort ?? ''}"></label>
        <label>مسافت (کیلومتر) <input type="number" name="distance" min="0" max="3000" step="any" inputmode="decimal" placeholder="اختیاری" value="${activity?.distance ?? ''}"></label>
      </div>
      <label>یادداشت <textarea name="notes" maxlength="500" rows="2" placeholder="این جلسه چطور گذشت؟">${escape(activity?.notes)}</textarea></label>
      <div class="dialog-actions"><button class="button button-dark" type="submit">${icon('check', 17)} ذخیرهٔ تمرین</button></div>
    </form>`);
}

function showDelete(activity) {
  openDialog('حذف تمرین', `<p>جلسهٔ ${sportLabel(activity.sport)} در ${dateLabel(activity.date)} از دفتر تمرین حذف می‌شود.</p>
    <div class="dialog-actions"><button class="button button-danger" type="button" data-action="confirm-delete" data-id="${escape(activity.id)}">حذف تمرین</button><button class="button button-soft" type="button" data-action="close">انصراف</button></div>`);
}

async function runCoach() {
  if (!coachEnabled || coachPending || store.demo || !buildPlan(store.profile, store.activities).ready) return;
  const sessions = manualSummary();
  if (!sessions.length) return;
  const current = store;
  const { primarySport, secondarySports } = current.profile;
  coachPending = true;
  render();
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primarySport, secondarySports, sessions }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'دریافت پیشنهاد انجام نشد.');
    if (store === current) coachResult = result;
  } catch (error) {
    notify(error.message);
  } finally {
    coachPending = false;
    render();
  }
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, id, provider } = control.dataset;
  const activity = id ? store.activities.find(item => item.id === id) : null;
  if (action === 'profile') showProfile();
  if (action === 'start') showProfile(true);
  if (action === 'log') showLog();
  if (action === 'edit-log' && activity?.source === 'manual') showLog(activity);
  if (action === 'delete-log' && activity) showDelete(activity);
  if (action === 'close') dialog.close();
  if (action === 'confirm-delete' && activity && save({ ...store, activities: store.activities.filter(item => item.id !== id) })) {
    dialog.close();
    render();
    notify('تمرین حذف شد.');
  }
  if (action === 'preview-plan') {
    const example = demoState(true);
    openDialog('نمونهٔ برنامهٔ یک هفته', planWeek(buildPlan(example.profile, example.activities)), 'dialog-wide');
  }
  if (action === 'more') {
    visibleCount += 40;
    render();
  }
  if (action === 'import') {
    if (store.demo) {
      showProfile(true);
      notify('ابتدا دفتر واقعی خودت را بساز تا فایل به آن اضافه شود.');
    } else {
      document.querySelector('#file-' + provider)?.click();
    }
  }
  if (action === 'coach') void runCoach();
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['profile-form', 'log-form'].includes(form.id)) return;
  event.preventDefault();
  const data = new FormData(form);
  if (form.id === 'profile-form') {
    const start = form.dataset.start === 'true';
    const name = data.get('name').trim();
    const primarySport = data.get('primarySport');
    const days = data.getAll('day').map(Number);
    const message = form.querySelector('.form-error');
    if (!days.length || !name) {
      message.textContent = !name ? 'نام را وارد کن.' : 'حداقل یک روز تمرین انتخاب کن.';
      message.hidden = false;
      return;
    }
    const profile = { name, primarySport, days, secondarySports: data.getAll('secondary').filter(sport => sport !== primarySport), startDate: data.get('startDate') };
    if (!save({ ...store, profile, demo: start ? false : store.demo, activities: start ? [] : store.activities })) return;
    notify(start ? 'دفتر تمرین تو آماده است.' : 'تنظیمات ذخیره شد.');
  } else {
    const optionalNumber = name => data.get(name) === '' ? null : Number(data.get(name));
    const activity = {
      id: form.dataset.id || crypto.randomUUID(),
      sport: data.get('sport'), date: data.get('date'), duration: Number(data.get('duration')),
      effort: optionalNumber('effort'), distance: optionalNumber('distance'), notes: data.get('notes').trim(), source: 'manual',
    };
    const activities = form.dataset.id ? store.activities.map(item => item.id === activity.id ? activity : item) : [...store.activities, activity];
    if (!save({ ...store, activities })) return;
    notify(activity.date < store.profile.startDate ? 'تمرین ذخیره شد. تاریخش قبل از شروع دوره است.' : 'تمرین ذخیره شد.');
  }
  dialog.close();
  render();
});

document.addEventListener('change', async event => {
  const input = event.target;
  if (input.id === 'sport-filter') {
    filter = input.value;
    visibleCount = 40;
    render();
    document.querySelector('#sport-filter').focus();
  }
  if (input.name === 'primarySport' && input.form?.id === 'profile-form') {
    for (const checkbox of input.form.querySelectorAll('[name="secondary"]')) {
      checkbox.disabled = checkbox.value === input.value;
      if (checkbox.disabled) checkbox.checked = false;
    }
  }
  if (input.type !== 'file' || !input.dataset.provider || !input.files.length || store.demo) return;
  const file = input.files[0];
  const provider = input.dataset.provider;
  const button = view.querySelector(`[data-action="import"][data-provider="${provider}"]`);
  button.disabled = true;
  button.textContent = 'در حال خواندن فایل…';
  try {
    const { activities, skipped } = await parseImport(file, provider);
    const known = new Set(store.activities.map(item => item.id));
    let duplicates = 0;
    let future = 0;
    const additions = activities.filter(activity => {
      if (activity.date > todayKey()) {
        future++;
        return false;
      }
      if (known.has(activity.id)) {
        duplicates++;
        return false;
      }
      known.add(activity.id);
      return true;
    });
    if (!additions.length || save({ ...store, activities: [...store.activities, ...additions] })) {
      const extra = [duplicates && fa.format(duplicates) + ' تکراری', (skipped + future) && fa.format(skipped + future) + ' ردشده'].filter(Boolean);
      notify(fa.format(additions.length) + ' جلسه اضافه شد.' + (extra.length ? ' ' + extra.join('، ') + '.' : ''));
    }
  } catch (error) {
    notify(error.message || 'خواندن فایل انجام نشد.');
  } finally {
    render();
  }
});

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});
document.querySelector('#header-add').innerHTML = icon('plus', 18) + '<span>ثبت تمرین</span>';
document.querySelector('#side-icon').innerHTML = icon('pulse', 20);
document.querySelector('#profile-chevron').innerHTML = icon('chevron', 15);
render();
fetch('/api/coach/status').then(response => response.json()).then(status => {
  coachEnabled = status.enabled === true;
  if (pageKey() === 'plan') render();
}).catch(() => {});
