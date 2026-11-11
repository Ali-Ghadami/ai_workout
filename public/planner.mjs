export const SPORTS = Object.freeze({
  strength: { label: 'بدنسازی', icon: 'dumbbell' },
  crossfit: { label: 'کراس‌فیت', icon: 'flame' },
  fitness: { label: 'فیتنس', icon: 'activity' },
  running: { label: 'دویدن', icon: 'footprints' },
  cycling: { label: 'دوچرخه‌سواری', icon: 'bike' },
  swimming: { label: 'شنا', icon: 'waves' },
  hiking: { label: 'کوه‌پیمایی', icon: 'mountain' },
});

const TRACKING_DAYS = 30;
const MIN_SESSIONS = 4;
const MIN_PRIMARY_SESSIONS = 2;
const MIN_ACTIVE_DAYS = 3;
const DAY_MS = 86_400_000;
const formatNumber = new Intl.NumberFormat('fa-IR');

const WORKOUTS = {
  strength: [
    {
      title: 'اسکوات و فشار بالاتنه',
      blocks: [
        'برای پایین‌تنه، اسکوات وزن بدن یا پرس پای آشنا را انتخاب کن. بین نوبت‌ها به‌اندازهٔ نیاز استراحت کن.',
        'برای فشار بالاتنه، پرس سینهٔ دستگاه یا شنا روی سطح مرتفع را انتخاب کن. وزنه یا ارتفاع را طوری تنظیم کن که تکرارها روان بمانند.',
      ],
      metric: 'حرکت، وزنه یا ارتفاع تکیه‌گاه، تکرارها و شدت حس‌شده را ثبت کن. نوبت بعد همین حرکت را با تنظیمات مشابه مقایسه کن.',
      purpose: 'تمرین کنترل حرکت در اسکوات و فشار بالاتنه',
    },
    {
      title: 'تمرین لگن و عضلات پشت',
      blocks: [
        'برای تمرین لگن، پل باسن با وزن بدن یا ددلیفت رومانیایی با دمبل سبک را در صورت آشنایی انتخاب کن.',
        'برای تمرین عضلات پشت، قایقی با کش یا پارویی با دمبل و تکیه‌گاه را انتخاب کن. بین نوبت‌ها استراحت کن و ریتم تکرارها را یکنواخت نگه دار.',
      ],
      metric: 'حرکت، مقاومت، تکرارها و شدت حس‌شده را ثبت کن. نوبت بعد همین حرکت را با تنظیمات مشابه مقایسه کن.',
      purpose: 'تمرین حرکت لگن و کشیدن با کنترل',
    },
  ],
  crossfit: [
    {
      title: 'دورهای تکنیکی اسکوات و فشار',
      blocks: [
        'یک دور کوتاه با اسکوات وزن بدن و شنای سوئدی با دست‌ها روی سطح مرتفع بساز. چند تکرار روان از هر حرکت انجام بده و برای دور بعد استراحت کن.',
        'همان دور را با ریتم راحت تکرار کن. اگر حفظ فرم سخت شد، تکرار کمتر یا استراحت بیشتری انتخاب کن.',
      ],
      metric: 'حرکت‌ها، تکرار هر دور و شدت حس‌شده را ثبت کن. در جلسهٔ مشابه همین ترکیب و مدت را تکرار کن و ریتم دورها را مقایسه کن.',
      purpose: 'تمرین حفظ کیفیت حرکت در دورهای کوتاه',
    },
    {
      title: 'حرکت لگن و کشیدن در دورهای آرام',
      blocks: [
        'خم‌شدن از لگن با وزن بدن یا ددلیفت با کتل‌بل سبک را، اگر فرم آن را می‌شناسی، در نوبت‌های کوتاه تمرین کن.',
        'همان حرکت را با قایقی با کش ترکیب کن. هر دور را آرام شروع کن و برای حفظ کیفیت حرکت بین دورها مکث کن.',
      ],
      metric: 'حرکت‌ها، مقاومت، تکرار هر دور و شدت حس‌شده را ثبت کن. جلسهٔ بعد با همان ترکیب و مقاومت مقایسه کن.',
      purpose: 'تمرین جابه‌جایی آرام بین دو الگوی حرکتی',
    },
  ],
  fitness: [
    {
      title: 'تمرین ترکیبی با ریتم یکنواخت',
      blocks: [
        'نشستن و برخاستن از صندلی یا اسکوات وزن بدن را با مکث‌های کوتاه انجام بده.',
        'پیاده‌روی یا رکاب‌زدن روی دوچرخهٔ ثابت را با ریتم راحت ادامه بده.',
      ],
      metric: 'تکرار حرکت قدرتی و مدت بخش هوازی را کنار شدت حس‌شده ثبت کن. دفعهٔ بعد همین ترکیب را مقایسه کن.',
      purpose: 'تمرین حفظ ریتم در یک جلسهٔ ترکیبی',
    },
    {
      title: 'کنترل گام و فشار بالاتنه',
      blocks: [
        'بالا رفتن از پلهٔ کوتاه یا راه‌رفتن درجا را با ریتم یکنواخت تمرین کن.',
        'فشار به دیوار یا شنا روی سطح مرتفع را در نوبت‌های کوتاه با مکث انجام بده.',
      ],
      metric: 'حرکت‌ها، زمان و تکرارهای هر بخش را ثبت کن. برای مقایسه، ارتفاع پله یا سطح تکیه‌گاه را ثابت نگه دار.',
      purpose: 'تمرین کنترل در حرکت‌های سبک پایین‌تنه و بالاتنه',
    },
  ],
  running: [
    {
      title: 'دویدن آرام در یک مسیر تکرارپذیر',
      blocks: [
        'یک قطعهٔ هموار و آشنا انتخاب کن. با ریتم راحت بدو و هر وقت لازم شد راه برو.',
        'در ادامه همان ریتم را نگه دار. اگر شدت حس‌شده بالا رفت، سرعت را کمتر کن یا بخشی را راه برو.',
      ],
      metric: 'مسیر، زمان حرکت، مسافت و شدت حس‌شدهٔ بخش اصلی را ثبت کن. ریتم را فقط در همان مسیر و در شرایط و شدت مشابه مقایسه کن.',
      purpose: 'تمرین حفظ ریتم راحت و ساختن یک معیار برای جلسهٔ بعد',
    },
    {
      title: 'نوبت‌های کوتاه دویدن و راه‌رفتن',
      blocks: [
        'در مسیر آشنا، چند بخش کوتاه دویدن آرام را با راه‌رفتن بین آن‌ها ترکیب کن.',
        'همان الگو را ادامه بده و زمان بخش‌های دویدن را تا جای ممکن شبیه هم نگه دار.',
      ],
      metric: 'زمان بخش‌های دویدن و راه‌رفتن و شدت حس‌شده را ثبت کن. در جلسهٔ بعد با همان مسیر و الگو مقایسه کن.',
      purpose: 'تمرین تکرار ریتم راحت در نوبت‌های کوتاه',
    },
  ],
  cycling: [
    {
      title: 'رکاب‌زنی با ریتم ثابت',
      blocks: [
        'یک قطعهٔ آشنا و هموار را با دنده‌ای راحت طی کن. روی یکنواختی رکاب‌ها تمرکز کن.',
        'در ادامه با همان ریتم حرکت کن. اگر شدت حس‌شده بالا رفت، دندهٔ سبک‌تری انتخاب کن.',
      ],
      metric: 'مسیر، زمان حرکت، مسافت و شدت حس‌شدهٔ بخش اصلی را ثبت کن. سرعت را فقط در همان مسیر و در شرایط و شدت مشابه مقایسه کن.',
      purpose: 'تمرین حفظ ریتم رکاب‌زدن و ساختن یک معیار برای جلسهٔ بعد',
    },
    {
      title: 'تنظیم دنده برای حفظ ریتم',
      blocks: [
        'روی مسیر آشنا یا دوچرخهٔ ثابت با مقاومت کم، یک ریتم راحت برای رکاب‌زدن پیدا کن.',
        'با تغییر ملایم شیب یا مقاومت، دنده یا مقاومت را طوری تنظیم کن که همان ریتم راحت را حفظ کنی.',
      ],
      metric: 'دنده یا مقاومت، مسیر و شدت حس‌شده را ثبت کن. دفعهٔ بعد روی همان مسیر یا همان دوچرخهٔ ثابت مقایسه کن.',
      purpose: 'تمرین تنظیم مقاومت هنگام تغییر شیب یا ریتم',
    },
  ],
  swimming: [
    {
      title: 'طول‌های کوتاه با ریتم آرام',
      blocks: [
        'با سبک شنای آشنا چند طول کوتاه یا بخش کوتاه از مسیر استخر را شنا کن و بین آن‌ها استراحت کن.',
        'همان سبک را ادامه بده و سعی کن ریتم حرکت دست‌ها از شروع تا انتهای هر طول یکنواخت بماند.',
      ],
      metric: 'سبک شنا، طول مسیر، تعداد تکرارها و شدت حس‌شده را ثبت کن. در همان استخر و با الگوی استراحت مشابه مقایسه کن.',
      purpose: 'تمرین یکنواختی حرکت در طول‌های کوتاه',
    },
    {
      title: 'تکرار طول‌های هم‌ریتم',
      blocks: [
        'یک طول کوتاه را با شروع آرام و سرعت راحت شنا کن. در پایان استراحت کن.',
        'همان طول را تکرار کن و از ابتدا تا انتهای هر تکرار ریتمی نزدیک به تکرار قبلی نگه دار.',
      ],
      metric: 'زمان هر طول، مدت استراحت و شدت حس‌شده را ثبت کن. طول مسیر و سبک شنا را هنگام مقایسه ثابت نگه دار.',
      purpose: 'تمرین تکرار یک ریتم راحت از طولی به طول بعد',
    },
  ],
  hiking: [
    {
      title: 'کوه‌پیمایی در یک مسیر آشنا',
      blocks: [
        'بخشی از مسیر آشنا با زمان رفت‌وبرگشت متناسب با جلسه را انتخاب کن و با گام‌های یکنواخت پیش برو.',
        'در شیب گام‌ها را متناسب با شدت هدف تنظیم کن و زمان کافی برای برگشت کنار بگذار.',
      ],
      metric: 'بخش مسیر، مدت پیمایش و شدت حس‌شده را ثبت کن. همان بخش را در شرایط و شدت مشابه مقایسه کن.',
      purpose: 'تمرین تنظیم ریتم گام‌ها در مسیر آشنا',
    },
    {
      title: 'تمرین ریتم در شیب ملایم',
      blocks: [
        'روی یک شیب کوتاه و آشنا، ریتمی انتخاب کن که بتوانی تا پایان آن بخش راحت حفظ کنی.',
        'در برگشت یا بخش هموارتر، با گام‌های آرام ادامه بده و شدت حس‌شده را بررسی کن.',
      ],
      metric: 'زمان پیمایش همان شیب و شدت حس‌شده را ثبت کن. جلسهٔ مشابه بعدی را روی همان بخش مسیر مقایسه کن.',
      purpose: 'تمرین حفظ ریتم راحت هنگام بالا رفتن',
    },
  ],
};

export function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function dateTime(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN;
  // UTC is a stable day index. Only todayKey reads the local clock.
  const value = Date.parse(`${key}T00:00:00Z`);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === key ? value : NaN;
}

export function dateShift(date, days) {
  const shifted = dateTime(date) + days * DAY_MS;
  return Number.isFinite(shifted) ? new Date(shifted).toISOString().slice(0, 10) : '';
}

function hasSport(sport) {
  return Object.hasOwn(SPORTS, sport);
}

function recentActivities(profile, activities, today) {
  if (!Number.isFinite(dateTime(profile?.startDate))) return [];

  const chartStart = dateShift(today, 1 - TRACKING_DAYS);
  const start = profile.startDate > chartStart ? profile.startDate : chartStart;
  return activities.filter(activity => activity
    && hasSport(activity.sport)
    && Number.isFinite(dateTime(activity.date))
    && activity.date >= start
    && activity.date <= today
    && Number.isFinite(activity.duration)
    && activity.duration > 0);
}

export function trackingStats(profile, activities = [], today = todayKey()) {
  const startTime = dateTime(profile?.startDate);
  const daySpan = (dateTime(today) - startTime) / DAY_MS + 1;
  const elapsedDays = Number.isFinite(daySpan) ? Math.max(0, daySpan) : 0;
  const daysRemaining = Math.max(0, TRACKING_DAYS - elapsedDays);
  const sessions = recentActivities(profile, activities, today);
  const byDay = new Map();
  const bySport = new Map();
  for (const { date, sport, duration } of sessions) {
    const day = byDay.get(date) ?? { date, count: 0, minutes: 0 };
    day.count += 1;
    day.minutes += duration;
    byDay.set(date, day);
    const totals = bySport.get(sport) ?? { sport, count: 0, minutes: 0 };
    totals.count += 1;
    totals.minutes += duration;
    bySport.set(sport, totals);
  }

  const sessionCount = sessions.length;
  const primaryCount = bySport.get(profile?.primarySport)?.count ?? 0;
  const activeDays = byDay.size;
  const blockers = [];
  if (daysRemaining > 0) {
    blockers.push(`${formatNumber.format(daysRemaining)} روز تا پایان دورهٔ ثبت تمرین باقی مانده است.`);
  }
  if (sessionCount < MIN_SESSIONS) {
    blockers.push(`برای شناخت روال تمرین، ${formatNumber.format(MIN_SESSIONS - sessionCount)} جلسهٔ دیگر در بازهٔ ۳۰ روز اخیر ثبت کن.`);
  }
  if (primaryCount < MIN_PRIMARY_SESSIONS) {
    blockers.push(`${formatNumber.format(MIN_PRIMARY_SESSIONS - primaryCount)} جلسهٔ دیگر از ورزش اصلی ثبت کن.`);
  }
  if (activeDays < MIN_ACTIVE_DAYS) {
    blockers.push(`تمرین‌ها را دست‌کم در ${formatNumber.format(MIN_ACTIVE_DAYS)} روز متفاوت ثبت کن.`);
  }

  return {
    elapsedDays,
    daysRemaining,
    durationGoalDays: TRACKING_DAYS,
    trackingEnd: dateShift(profile?.startDate, TRACKING_DAYS - 1) || null,
    evidenceGoal: MIN_SESSIONS,
    primaryEvidenceGoal: MIN_PRIMARY_SESSIONS,
    evidenceDaysGoal: MIN_ACTIVE_DAYS,
    primaryCount,
    sessionCount,
    activeDays,
    evidenceDays: activeDays,
    totalMinutes: sessions.reduce((total, activity) => total + activity.duration, 0),
    sports: [...bySport.values()].sort((first, second) => second.count - first.count),
    recentDays: Array.from({ length: TRACKING_DAYS }, (_, index) => {
      const date = dateShift(today, index - TRACKING_DAYS + 1);
      return byDay.get(date) ?? { date, count: 0, minutes: 0 };
    }),
    blockers,
    ready: blockers.length === 0,
  };
}

function median(values) {
  if (values.length === 0) return undefined;
  const ordered = [...values].sort((first, second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  return (ordered[middle] + ordered[Math.floor((ordered.length - 1) / 2)]) / 2;
}

function nextSevenDays(today) {
  return Array.from({ length: 7 }, (_, index) => dateShift(today, index + 1));
}

function spreadDays(eligible, count) {
  if (count === 1) return [eligible[0]];
  return Array.from({ length: count }, (_, index) => (
    eligible[Math.round(index * (eligible.length - 1) / (count - 1))]
  ));
}

function chooseSecondary(profile, sessions) {
  const latestPractice = new Map();
  for (const { sport, date } of sessions) {
    if (date > (latestPractice.get(sport) ?? '')) latestPractice.set(sport, date);
  }
  return [...new Set(profile.secondarySports ?? [])]
    .filter(sport => hasSport(sport) && sport !== profile.primarySport)
    .sort((first, second) => (latestPractice.get(first) ?? '').localeCompare(latestPractice.get(second) ?? ''));
}

function sessionDetails(workout, duration) {
  const edgeMinutes = Math.floor(duration / 5);
  const practiceMinutes = duration - edgeMinutes * 2;
  const firstBlockMinutes = Math.ceil(practiceMinutes / 2);
  const blocks = [
    [edgeMinutes, 'با نسخهٔ سبک‌تر حرکت اول شروع کن.'],
    [firstBlockMinutes, workout.blocks[0]],
    [practiceMinutes - firstBlockMinutes, workout.blocks[1]],
    [edgeMinutes, 'ریتم را پایین بیاور و جلسه را با حرکت سبک تمام کن.'],
  ];
  return [
    ...blocks.filter(([minutes]) => minutes > 0)
      .map(([minutes, instruction]) => `${formatNumber.format(minutes)} دقیقه. ${instruction}`),
    workout.metric,
  ];
}

export function buildPlan(profile, activities = [], today = todayKey()) {
  const stats = trackingStats(profile, activities, today);
  if (!stats.ready) {
    return { ready: false, reason: stats.blockers[0], week: [], rationale: stats.blockers };
  }

  const weekDates = nextSevenDays(today);
  const selectedWeekdays = new Set(profile.days ?? []);
  const eligible = weekDates.filter(date => selectedWeekdays.has(new Date(dateTime(date)).getUTCDay()));
  if (eligible.length === 0) {
    const reason = 'برای چیدن برنامه، دست‌کم یک روز تمرین انتخاب کن.';
    return { ready: false, reason, week: [], rationale: [reason] };
  }

  const sessions = recentActivities(profile, activities, today);
  const secondary = chooseSecondary(profile, sessions);
  const weeklyBudget = Math.max(1, Math.floor(stats.totalMinutes * 7 / TRACKING_DAYS));
  const typicalDays = Math.round(stats.activeDays * 7 / TRACKING_DAYS);
  const preferredCount = secondary.length ? Math.max(2, typicalDays) : Math.max(1, typicalDays);
  const count = Math.min(eligible.length, 6, preferredCount, Math.max(1, Math.floor(weeklyBudget / 10)));
  const scheduled = spreadDays(eligible, count);
  const secondaryCount = Math.min(secondary.length, count === 2 ? 1 : Math.floor((count - 1) / 2));
  const secondaryOn = new Map(secondary.slice(0, secondaryCount).map((sport, index) => [
    scheduled[Math.floor((index + 1) * count / (secondaryCount + 1))],
    sport,
  ]));
  const sessionBudget = Math.floor(weeklyBudget / count);
  let previousSessionDate = '';
  let primarySessions = 0;

  const week = weekDates.map(date => {
    if (!scheduled.includes(date)) {
      return {
        date,
        sport: null,
        duration: 0,
        effort: null,
        title: 'استراحت',
        details: [],
        purpose: 'فاصله بین جلسه‌های تمرین',
      };
    }

    const sport = secondaryOn.get(date) ?? profile.primarySport;
    const primary = sport === profile.primarySport;
    const workouts = WORKOUTS[sport];
    const workout = workouts[primary ? primarySessions % workouts.length : 0];
    if (primary) primarySessions += 1;
    const sportSessions = sessions.filter(activity => activity.sport === sport);
    const typicalDuration = median(sportSessions.map(activity => activity.duration)) ?? 20;
    const duration = Math.max(1, Math.floor(Math.min(sessionBudget, typicalDuration, primary ? 75 : 45)));
    const recordedEfforts = sportSessions.map(activity => activity.effort)
      .filter(effort => Number.isFinite(effort) && effort >= 1 && effort <= 10);
    const previousEffort = median(recordedEfforts);
    const typicalEffort = previousEffort === undefined ? (primary ? 5 : 3) : Math.round(previousEffort) - 1;
    const adjacent = previousSessionDate === dateShift(date, -1);
    const effort = Math.max(1, Math.min(typicalEffort, primary && !adjacent ? 6 : 4));
    previousSessionDate = date;

    return { date, sport, duration, effort, title: workout.title, details: sessionDetails(workout, duration), purpose: workout.purpose };
  });

  const rationale = [
    `سهم ${SPORTS[profile.primarySport].label} در این هفته ${formatNumber.format(count - secondaryCount)} جلسه از ${formatNumber.format(count)} جلسه است.`,
    'مدت و تعداد جلسه‌ها بر اساس تمرین‌های ثبت‌شده در ۳۰ روز اخیر تنظیم شده‌اند.',
  ];
  if (secondaryCount > 0) {
    rationale.push('جلسه‌های مکمل هدف مشخصی دارند. مدت و شدت حس‌شده را ثبت کن تا بتوانی جلسه‌های مشابه را مقایسه کنی.');
  }
  return { ready: true, reason: '', week, rationale };
}
