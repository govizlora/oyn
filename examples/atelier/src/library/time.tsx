import { useId, useState } from 'react';
import { Surface } from '../controls';
import { Calendar } from '../everyday';
import { Field, Rail, Readout } from './shared';

export function DateTiles() {
  const [date, setDate] = useState('2026-11-18');
  return <Calendar value={date} onChange={setDate} />;
}
export function DateWindow() {
  const [range, setRange] = useState(['2026-11-18', '2026-11-24']);
  const length =
    Math.round((Date.parse(range[1]) - Date.parse(range[0])) / 86400000) + 1;
  return (
    <div className="obj-stack">
      <Readout caption="days, inclusive">
        {Number.isFinite(length) ? length : '—'}
      </Readout>
      <div className="obj-date-bar" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} data-on={i < length} />
        ))}
      </div>
      {['From', 'Until'].map((label, i) => (
        <Field key={label} label={label}>
          <input
            type="date"
            aria-label={label}
            value={range[i]}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setRange(([a, b]) =>
                i === 0
                  ? [value, value > b ? value : b]
                  : [value < a ? value : a, value],
              );
            }}
          />
        </Field>
      ))}
    </div>
  );
}
export function WeekSlots() {
  const radioName = useId();
  const [day, setDay] = useState('Wed'),
    [slot, setSlot] = useState('10:30');
  return (
    <div className="obj-stack">
      <Rail
        label="Weekday"
        options={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
        value={day}
        onChange={setDay}
      />
      <Readout caption={`${day} · available time`}>{slot}</Readout>
      <div className="obj-slot-grid" role="radiogroup" aria-label="Time slots">
        {['09:00', '10:30', '13:00', '14:30', '16:00', '17:30'].map((time) => (
          <label key={time}>
            {slot === time && (
              <Surface className="obj-row-plate" elevation={5} tone="sage" />
            )}
            <input
              type="radio"
              name={radioName}
              aria-label={`${time} slot`}
              checked={slot === time}
              onChange={() => setSlot(time)}
            />
            <span>{time}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
export function TimeBlocks() {
  const [time, setTime] = useState('09:41');
  const [h, m] = time.split(':');
  const period = +h >= 12 ? 'PM' : 'AM';
  return (
    <div className="obj-stack">
      <div className="obj-time-blocks">
        <Surface elevation={7}>
          {String(+h % 12 || 12).padStart(2, '0')}
        </Surface>
        <b>:</b>
        <Surface elevation={7}>{m}</Surface>
      </div>
      <Field label="LOCAL TIME">
        <input
          type="time"
          aria-label="Time"
          value={time}
          onChange={(e) => {
            if (e.target.value) {
              setTime(e.target.value);
            }
          }}
        />
      </Field>
      <Rail
        label="Period"
        options={['AM', 'PM']}
        value={period}
        onChange={(v) => {
          setTime(
            `${String((+h % 12) + (v === 'PM' ? 12 : 0)).padStart(2, '0')}:${m}`,
          );
        }}
      />
    </div>
  );
}
const zones: Record<string, string> = {
  Vancouver: 'America/Vancouver',
  London: 'Europe/London',
  Tokyo: 'Asia/Tokyo',
};
export function WorldClock() {
  const [city, setCity] = useState('Tokyo'),
    [utc, setUtc] = useState('12:00');
  const date = new Date(`2026-11-18T${utc}:00Z`);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zones[city],
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .split(':');
  const h = +parts[0],
    m = +parts[1];
  return (
    <div className="obj-stack">
      <Surface className="obj-clock" elevation={7}>
        <div className="obj-clock-ticks" />
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`obj-clock-hand ${i ? 'minute' : 'hour'}`}
            style={{
              transform: `rotate(${i ? m * 6 : (h % 12) * 30 + m / 2}deg)`,
            }}
          />
        ))}
        <i />
        <small>{parts.join(':')}</small>
      </Surface>
      <Rail
        label="City"
        options={Object.keys(zones)}
        value={city}
        onChange={setCity}
      />
      <Field label="18 NOV 2026 · UTC">
        <input
          type="time"
          aria-label="Reference UTC time"
          value={utc}
          onChange={(e) => {
            if (e.target.value) setUtc(e.target.value);
          }}
        />
      </Field>
    </div>
  );
}
export function ActivityTiles() {
  const [selected, setSelected] = useState(18),
    [period, setPeriod] = useState('Month');
  return (
    <div className="obj-stack">
      <div className="obj-activity-grid">
        {Array.from({ length: 35 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Activity day ${i + 1}`}
            aria-pressed={selected === i + 1}
            onClick={() => setSelected(i + 1)}
          >
            <Surface
              elevation={selected === i + 1 ? 7 : 1}
              tone={
                selected === i + 1
                  ? 'orange'
                  : (i * 7 + (period === 'Month' ? 3 : 1)) % 5 > 2
                    ? 'sage'
                    : 'porcelain'
              }
            />
          </button>
        ))}
      </div>
      <div className="obj-row">
        <span className="obj-caption">Day {selected}</span>
        <span className="obj-activity-legend">
          <i />
          <i />
          <i />
        </span>
      </div>
      <Rail
        label="Activity pattern"
        options={['Month', 'Season']}
        value={period}
        onChange={setPeriod}
      />
    </div>
  );
}
