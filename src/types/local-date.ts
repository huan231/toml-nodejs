import { TOMLError } from '../errors';

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
