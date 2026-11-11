const APPLE_SPORTS = new Map(Object.entries({
  running: 'running',
  cycling: 'cycling',
  swimming: 'swimming',
  hiking: 'hiking',
  traditionalstrengthtraining: 'strength',
  functionalstrengthtraining: 'strength',
  crosstraining: 'fitness',
  highintensityintervaltraining: 'fitness',
  mixedcardio: 'fitness',
  coretraining: 'fitness',
  pilates: 'fitness',
  elliptical: 'fitness',
}));

const STRAVA_SPORTS = new Map(Object.entries({
  run: 'running',
  trailrun: 'running',
  virtualrun: 'running',
  ride: 'cycling',
  virtualride: 'cycling',
  gravelride: 'cycling',
  mountainbikeride: 'cycling',
  ebikeride: 'cycling',
  emountainbikeride: 'cycling',
  handcycle: 'cycling',
  velomobile: 'cycling',
  swim: 'swimming',
  hike: 'hiking',
  weighttraining: 'strength',
  crossfit: 'crossfit',
  workout: 'fitness',
  highintensityintervaltraining: 'fitness',
  hiit: 'fitness',
  pilates: 'fitness',
  elliptical: 'fitness',
}));

const TIME_TO_MINUTES = { s: 1 / 60, sec: 1 / 60, min: 1, h: 60, hr: 60 };
const LENGTH_TO_KM = { m: 0.001, km: 1, mi: 1.609344, yd: 0.0009144, ft: 0.0003048 };
const APPLE_DISTANCE_TYPES = new Set([
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierDistanceCycling',
  'HKQuantityTypeIdentifierDistanceSwimming',
]);
const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const XML_INVALID = 'فایل XML معتبر Apple Health پیدا نشد. فایل export.xml یا خروجی ZIP را انتخاب کنید.';
const ZIP_INVALID = 'فایل ZIP خوانده نشد. فایل export.xml را از آن خارج کنید و دوباره وارد کنید.';
const CSV_INVALID = 'فایل activities.csv خروجی Strava با سرستون‌های انگلیسی را انتخاب کنید.';

class ImportError extends Error {}

const compact = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const round = (value, precision) => Number(value.toFixed(precision));

function decimal(value) {
  const clean = value?.trim();
  if (!clean) return null;
  const numeric = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(clean) ? clean.replace(/,/g, '') : clean;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numeric)) return null;
  const number = Number(numeric);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function convert(value, unit, units) {
  const number = decimal(value);
  if (number === null || !unit || !Object.hasOwn(units, unit)) return null;
  const converted = number * units[unit];
  return Number.isFinite(converted) ? converted : null;
}

function calendarDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function appleTimestamp(value) {
  const parts = value?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:\s*(Z|[+-]\d{2}:?\d{2}))?$/);
  if (!parts || !calendarDate(parts[1])) return null;
  const zone = (parts[3] || 'Z').replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
  const time = Date.parse(`${parts[1]}T${parts[2]}${zone}`);
  return Number.isFinite(time) ? time : null;
}

function appleId(parts) {
  let hash = 0xcbf29ce484222325n;
  for (const char of JSON.stringify(parts)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(char.codePointAt(0))) * 0x100000001b3n);
  }
  return `apple-health:${hash.toString(36)}`;
}

function attributes(raw) {
  const pairs = raw.matchAll(/(?:^|\s)([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g);
  return Object.fromEntries(Array.from(pairs, ([, key, doubleQuoted, singleQuoted]) =>
    [key, doubleQuoted ?? singleQuoted]));
}

function createAppleReader() {
  const tag = /<!--|<!\[CDATA\[|<\?|<(\/?)(HealthData|WorkoutStatistics|Workout)(?=[\s/>])/g;
  const tail = /(?:[^<>"']|"[^"]*"|'[^']*')*>/y;
  const activities = [];
  let skipped = 0;
  let buffer = '';
  let blockEnd = '';
  let rootOpen = false;
  let rootClosed = false;
  let workout;

  function finishWorkout() {
    const { info, distance } = workout;
    const type = compact((info.workoutActivityType ?? '').replace(/^HKWorkoutActivityType/, ''));
    const sport = APPLE_SPORTS.get(type);
    const start = appleTimestamp(info.startDate);
    const end = appleTimestamp(info.endDate);
    const duration = round(convert(info.duration, info.durationUnit, TIME_TO_MINUTES)
      || (start !== null && end !== null ? (end - start) / 60_000 : 0), 2);

    if (!sport || start === null || !Number.isFinite(duration) || duration <= 0) {
      skipped += 1;
    } else {
      activities.push({
        id: appleId([type, info.sourceName, start, end]),
        sport,
        date: info.startDate.slice(0, 10),
        duration,
        effort: null,
        distance: distance > 0 ? round(distance, 3) : null,
        source: 'apple-health',
      });
    }
    workout = null;
  }

  function push(chunk) {
    buffer += chunk;
    let cursor = 0;
    while (cursor < buffer.length) {
      if (blockEnd) {
        const end = buffer.indexOf(blockEnd, cursor);
        if (end < 0) {
          buffer = buffer.slice(Math.max(cursor, buffer.length - blockEnd.length + 1));
          return;
        }
        cursor = end + blockEnd.length;
        blockEnd = '';
      }

      tag.lastIndex = cursor;
      const marker = tag.exec(buffer);
      if (!marker) {
        // Keep enough characters for a tag or comment opener split across chunks.
        buffer = buffer.slice(Math.max(cursor, buffer.length - 24));
        return;
      }
      cursor = tag.lastIndex;
      const [start, closing, name] = marker;
      if (!name) {
        blockEnd = { '<!--': '-->', '<![CDATA[': ']]>', '<?': '?>' }[start];
        continue;
      }

      tail.lastIndex = cursor;
      const end = tail.exec(buffer);
      if (!end) {
        buffer = buffer.slice(marker.index);
        if (buffer.length > 65_536) throw new ImportError(XML_INVALID);
        return;
      }
      cursor = tail.lastIndex;
      const selfClosing = end[0].endsWith('/>');

      if (name === 'HealthData') {
        if (workout || rootClosed || Boolean(closing) !== rootOpen) throw new ImportError(XML_INVALID);
        rootOpen = !(closing || selfClosing);
        rootClosed = !rootOpen;
      } else if (rootOpen && name === 'Workout') {
        if (closing) {
          if (!workout) throw new ImportError(XML_INVALID);
          finishWorkout();
        } else {
          if (workout) throw new ImportError(XML_INVALID);
          const info = attributes(end[0]);
          workout = { info, distance: convert(info.totalDistance, info.totalDistanceUnit, LENGTH_TO_KM) };
          if (selfClosing) finishWorkout();
        }
      } else if (workout && !closing && name === 'WorkoutStatistics' && !(workout.distance > 0)) {
        const stats = attributes(end[0]);
        if (APPLE_DISTANCE_TYPES.has(stats.type)) {
          workout.distance = convert(stats.sum, stats.unit, LENGTH_TO_KM);
        }
      }
    }
    buffer = '';
  }

  function finish() {
    if (!rootClosed || workout || blockEnd) throw new ImportError(XML_INVALID);
    return { activities, skipped };
  }

  return { push, finish };
}

export function parseAppleHealthXml(xml) {
  const reader = createAppleReader();
  reader.push(xml);
  return reader.finish();
}

function* csvRows(csv) {
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  for (let index = csv.charCodeAt(0) === 0xfeff ? 1 : 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += char;
      }
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field);
      field = '';
      afterQuote = false;
      if (char !== ',') {
        if (char === '\r' && csv[index + 1] === '\n') index += 1;
        if (row.some((value) => value.trim())) yield row;
        row = [];
      }
    } else if (char === '"' && !field && !afterQuote) {
      quoted = true;
    } else if (afterQuote || char === '"') {
      throw new ImportError(CSV_INVALID);
    } else {
      field += char;
    }
  }
  if (quoted) throw new ImportError(CSV_INVALID);
  row.push(field);
  if (row.some((value) => value.trim())) yield row;
}

function stravaDate(value) {
  const input = value?.trim() ?? '';
  const iso = input.match(/^\d{4}-\d{2}-\d{2}(?=[ T]|$)/);
  if (iso) return calendarDate(iso[0]);

  // Preserve the calendar date shown in the export, independent of browser time zone.
  const english = input.match(/^([a-z]{3})\s+(\d{1,2}),\s*(\d{4})(?:,|\s|$)/i);
  if (!english) return null;
  const [, month, day, year] = english;
  const monthNumber = MONTHS.indexOf(month.toLowerCase()) + 1;
  return calendarDate(`${year}-${String(monthNumber).padStart(2, '0')}-${day.padStart(2, '0')}`);
}

export function parseStravaCsv(csv) {
  const rows = csvRows(csv);
  const headers = rows.next().value?.map(compact) ?? [];
  const column = (name) => headers.indexOf(name);
  const idColumn = column('activityid');
  const dateColumn = column('activitydate');
  const typeColumn = column('activitytype');
  const movingColumn = column('movingtime');
  const elapsedColumn = column('elapsedtime');
  const distanceColumn = column('distance');
  const effortColumn = column('perceivedexertion');
  if ([idColumn, dateColumn, typeColumn].includes(-1) || (movingColumn < 0 && elapsedColumn < 0)) {
    throw new ImportError(CSV_INVALID);
  }
  // Strava exports a rounded display distance followed by raw distance in metres.
  const rawDistanceColumn = headers.indexOf('distance', distanceColumn + 1);
  const durationUsesElapsed = new Set(['strength', 'crossfit', 'fitness']);
  const activities = [];
  let skipped = 0;

  for (const row of rows) {
    const id = row[idColumn]?.trim();
    const date = stravaDate(row[dateColumn]);
    const sport = STRAVA_SPORTS.get(compact(row[typeColumn] ?? ''));
    const moving = decimal(row[movingColumn]);
    const elapsed = decimal(row[elapsedColumn]);
    const seconds = durationUsesElapsed.has(sport) ? elapsed || moving : moving || elapsed;
    const duration = round(seconds / 60, 2);
    if (!id || !/^\d+$/.test(id) || !date || !sport || !(duration > 0)) {
      skipped += 1;
      continue;
    }
    const distance = convert(row[rawDistanceColumn], 'm', LENGTH_TO_KM)
      || convert(row[distanceColumn], sport === 'swimming' ? 'm' : 'km', LENGTH_TO_KM);
    const effort = decimal(row[effortColumn]);
    activities.push({
      id: `strava:${id}`,
      sport,
      date,
      duration,
      effort: Number.isInteger(effort) && effort >= 1 && effort <= 10 ? effort : null,
      distance: distance > 0 ? round(distance, 3) : null,
      source: 'strava',
    });
  }
  return { activities, skipped };
}

async function fileView(file, offset, length) {
  return new DataView(await file.slice(offset, offset + length).arrayBuffer());
}

async function appleXmlStream(file) {
  const signature = await fileView(file, 0, 4);
  if (signature.byteLength < 4 || signature.getUint32(0, true) !== 0x04034b50) {
    return file.stream();
  }

  const tailLength = Math.min(file.size, 65_557);
  const tail = await fileView(file, file.size - tailLength, tailLength);
  let end = tail.byteLength - 22;
  while (end >= 0) {
    if (tail.getUint32(end, true) === 0x06054b50 && end + 22 + tail.getUint16(end + 20, true) === tail.byteLength) break;
    end -= 1;
  }
  if (end < 0 || tail.getUint32(end + 4, true) !== 0) throw new ImportError(ZIP_INVALID);

  const directorySize = tail.getUint32(end + 12, true);
  const directoryOffset = tail.getUint32(end + 16, true);
  const endOffset = file.size - tailLength + end;
  if (directorySize > 32_000_000 || directoryOffset + directorySize > endOffset) {
    throw new ImportError(ZIP_INVALID);
  }
  const directory = await fileView(file, directoryOffset, directorySize);
  const decoder = new TextDecoder();

  for (let offset = 0; offset + 46 <= directorySize;) {
    if (directory.getUint32(offset, true) !== 0x02014b50) throw new ImportError(ZIP_INVALID);
    const nameLength = directory.getUint16(offset + 28, true);
    const next = offset + 46 + nameLength + directory.getUint16(offset + 30, true)
      + directory.getUint16(offset + 32, true);
    if (next > directorySize) throw new ImportError(ZIP_INVALID);
    const name = decoder.decode(new Uint8Array(directory.buffer, offset + 46, nameLength));
    if (name === 'export.xml' || name.endsWith('/export.xml')) {
      const flags = directory.getUint16(offset + 8, true);
      const method = directory.getUint16(offset + 10, true);
      const size = directory.getUint32(offset + 20, true);
      const entry = directory.getUint32(offset + 42, true);
      if ((flags & 1) !== 0 || entry + 30 > directoryOffset) throw new ImportError(ZIP_INVALID);
      const local = await fileView(file, entry, 30);
      if (local.getUint32(0, true) !== 0x04034b50) throw new ImportError(ZIP_INVALID);
      const start = entry + 30 + local.getUint16(26, true) + local.getUint16(28, true);
      if (start + size > directoryOffset) throw new ImportError(ZIP_INVALID);
      const stream = file.slice(start, start + size).stream();
      if (method === 0) return stream;
      if (method === 8) return stream.pipeThrough(new DecompressionStream('deflate-raw'));
      throw new ImportError(ZIP_INVALID);
    }
    offset = next;
  }
  throw new ImportError('فایل export.xml داخل ZIP پیدا نشد.');
}

export async function parseImport(file, provider) {
  if (!file?.size) throw new ImportError('ابتدا یک فایل خروجی معتبر انتخاب کنید.');
  if (provider === 'strava') {
    try {
      return parseStravaCsv(await file.text());
    } catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError(CSV_INVALID);
    }
  }
  if (provider !== 'apple-health') throw new ImportError('منبع ورود تمرین‌ها ناشناخته است.');

  try {
    const stream = (await appleXmlStream(file)).pipeThrough(new TextDecoderStream());
    const reader = createAppleReader();
    const chunks = stream.getReader();
    try {
      let chunk = await chunks.read();
      while (!chunk.done) {
        reader.push(chunk.value);
        chunk = await chunks.read();
      }
      return reader.finish();
    } catch (error) {
      await chunks.cancel().catch(() => {});
      throw error;
    } finally {
      chunks.releaseLock();
    }
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(ZIP_INVALID);
  }
}
