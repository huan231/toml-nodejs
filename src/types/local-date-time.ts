import { type Day, LocalDate, type Month } from './local-date';
import { type Hour, LocalTime, type Minute, type Second } from './local-time';
import { TOMLError } from '../errors';

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
