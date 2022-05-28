import { TOMLError } from '../errors';

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
