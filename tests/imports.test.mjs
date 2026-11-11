import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { parseAppleHealthXml, parseImport, parseStravaCsv } from '../public/imports.mjs';

const RUN = `<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="42" durationUnit="min"
  sourceName="Watch" startDate="2026-10-09 23:50:00 +0330" endDate="2026-10-10 00:32:00 +0330">
  <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="160" unit="count/min"/>
  <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" sum="6000" unit="m"/>
</Workout>`;

test('Apple XML keeps workout summaries and skips unsupported sports', () => {
  const xml = `<?xml version="1.0"?><HealthData>
    <Record type="HKQuantityTypeIdentifierHeartRate" value="156"/>
    <!-- ${RUN} -->
    ${RUN}
    <Workout workoutActivityType='HKWorkoutActivityTypeYoga' startDate='2026-10-10 07:00:00 +0330'
      endDate='2026-10-10 07:25:00 +0330'/>
    <Workout workoutActivityType='HKWorkoutActivityTypeCycling' startDate='2026-10-11 07:00:00 +0330'
      endDate='2026-10-11 08:15:00 +0330' totalDistance='10' totalDistanceUnit='mi'/>
  </HealthData>`;
  const result = parseAppleHealthXml(xml);
  assert.equal(result.skipped, 1);
  assert.equal(result.activities.length, 2);
  const [run, ride] = result.activities;
  assert.deepEqual(run, {
    id: run.id, sport: 'running', date: '2026-10-09', duration: 42, effort: null,
    distance: 6, source: 'apple-health',
  });
  assert.equal(ride.sport, 'cycling');
  assert.equal(ride.duration, 75);
  assert.equal(ride.distance, 16.093);
  assert.deepEqual(parseAppleHealthXml(xml), result);
});

test('Apple XML handles tags and comments split across chunks and rejects truncation', async () => {
  const xml = `<HealthData><!-- ${RUN} -->${RUN}</HealthData>`;
  const input = new Blob([xml]);
  input.stream = () => {
    const bytes = new TextEncoder().encode(xml);
    let offset = 0;
    return new ReadableStream({
      pull(controller) {
        if (offset >= bytes.length) controller.close();
        else controller.enqueue(bytes.slice(offset, offset += 7));
      },
    });
  };
  assert.deepEqual(await parseImport(input, 'apple-health'), parseAppleHealthXml(xml));
  await assert.rejects(parseImport(new Blob([`<HealthData>${RUN}`]), 'apple-health'), /XML/);
});

function zipWorkoutXml(xml, name = 'apple_health_export/export.xml') {
  const filename = Buffer.from(name);
  const data = Buffer.from(xml);
  const compressed = deflateRawSync(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);

  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50, 0);
  directory.writeUInt16LE(20, 6);
  directory.writeUInt16LE(8, 10);
  directory.writeUInt32LE(compressed.length, 20);
  directory.writeUInt32LE(data.length, 24);
  directory.writeUInt16LE(filename.length, 28);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(directory.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length + compressed.length, 16);
  return new Blob([local, filename, compressed, directory, filename, end]);
}

test('Apple ZIP selects and decompresses export.xml', async () => {
  const xml = `<HealthData>${RUN}</HealthData>`;
  assert.deepEqual(await parseImport(zipWorkoutXml(xml), 'apple-health'), parseAppleHealthXml(xml));
  await assert.rejects(parseImport(zipWorkoutXml(xml, 'export_cda.xml'), 'apple-health'), /export\.xml/);
});

test('Strava CSV handles quoted multiline fields, stable IDs and raw distance in metres', async () => {
  const csv = [
    '\ufeffActivity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Moving Time,Distance,Perceived Exertion,Activity Private Note',
    '431,"Oct 10, 2026, 11:47:26 PM","Run, today",Trail Run,"note: ""hi""\nprivate",1955,4.55,1780,4551.3198,5,private',
    '432,2026-10-11,Swim,Swim,,1850,"1,000",1800,1000,0,',
    '433,2026-10-12,Gym,Weight Training,,3600,0,600,,7,',
    '434,2026-10-12,Walk,Walk,,3600,4,600,,2,',
    '435,2026-02-30,Bad date,Run,,3600,4,600,,2,',
  ].join('\r\n');
  const expected = {
    activities: [
      { id: 'strava:431', sport: 'running', date: '2026-10-10', duration: 29.67, distance: 4.551, effort: 5, source: 'strava' },
      { id: 'strava:432', sport: 'swimming', date: '2026-10-11', duration: 30, distance: 1, effort: null, source: 'strava' },
      { id: 'strava:433', sport: 'strength', date: '2026-10-12', duration: 60, distance: null, effort: 7, source: 'strava' },
    ],
    skipped: 2,
  };
  assert.deepEqual(parseStravaCsv(csv), expected);
  assert.deepEqual(await parseImport(new Blob([csv]), 'strava'), expected);
  assert.throws(() => parseStravaCsv(csv + '\r\n"incomplete'), /activities\.csv/);
});
