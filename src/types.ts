import { TOMLError } from './errors.js';

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Day =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;

const isYear = (value: number) => {
  return 0 <= value && value <= 9999;
};

const isMonth = (value: number): value is Month => {
  return 0 < value && value <= 12;
};

const isDay = (value: number): value is Day => {
  return 0 < value && value <= 31;
};

export class LocalDate {
  private constructor(readonly year: number, readonly month: Month, readonly day: Day) {}

  static fromString(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new TOMLError(`invalid local date format "${value}"`);
    }

    const [year, month, day] = value.split('-').map((component) => parseInt(component, 10));

    if (!isYear(year) || !isMonth(month) || !isDay(day)) {
      throw new TOMLError(`invalid local date format "${value}"`);
    }

    return new LocalDate(year, month, day);
  }
}

export type Hour =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

export type Minute =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59;

export type Second = Minute;

const isHour = (value: number): value is Hour => {
  return 0 <= value && value < 24;
};

const isMinute = (value: number): value is Minute => {
  return 0 <= value && value < 60;
};

const isSecond = (value: number): value is Second => {
  return 0 <= value && value < 60;
};

export class LocalTime {
  private constructor(
    readonly hour: Hour,
    readonly minute: Minute,
    readonly second: Second,
    readonly millisecond: number,
  ) {
    // If the value contains greater precision than the implementation
    // can support, the additional precision must be truncated, not rounded.
    //
    // https://toml.io/en/v1.0.0#local-time
    this.millisecond = parseInt(millisecond.toString(10).slice(0, 3), 10);
  }

  static fromString(value: string) {
    if (!/^\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
      throw new TOMLError(`invalid local time format "${value}"`);
    }

    const components = value.split(':');

    const [hour, minute] = components.slice(0, 2).map((component) => parseInt(component, 10));
    const [second, millisecond] = components[2].split('.').map((component) => parseInt(component, 10));

    if (!isHour(hour) || !isMinute(minute) || !isSecond(second)) {
      throw new TOMLError(`invalid local time format "${value}"`);
    }

    return new LocalTime(hour, minute, second, isNaN(millisecond) ? 0 : millisecond);
  }
}

export class LocalDateTime {
  private constructor(
    readonly year: number,
    readonly month: Month,
    readonly day: Day,
    readonly hour: Hour,
    readonly minute: Minute,
    readonly second: Second,
    readonly millisecond: number,
  ) {}

  static fromString(value: string) {
    // Per [...] ISO8601, the "T" [...] in this syntax may alternatively be lower case "t" [...]
    //
    // ISO 8601 defines date and time separated by "T".
    // Applications using this syntax may choose, for the sake of
    // readability, to specify a full-date and full-time separated by
    // (say) a space character.
    //
    // https://datatracker.ietf.org/doc/html/rfc3339#section-5.6
    const components = value.split(/[tT ]/);

    if (components.length !== 2) {
      throw new TOMLError(`invalid local date-time format "${value}"`);
    }

    const date = LocalDate.fromString(components[0]);
    const time = LocalTime.fromString(components[1]);

    return new LocalDateTime(date.year, date.month, date.day, time.hour, time.minute, time.second, time.millisecond);
  }
}
