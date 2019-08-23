import { Scheduler } from '../src';

describe('scheduler', () => {
  let scheduler: Scheduler;
  beforeAll(() => {
    scheduler = new Scheduler();
  });
  afterEach(() => {
    scheduler.flush();
  });

  it('timeout should fire at least after the given delay', done => {
    const now = Date.now();
    scheduler.schedule(
      'key1',
      () => {
        expect(now + 400).toBeLessThanOrEqual(Date.now());
        done();
      },
      400
    );
  }, 1000);

  it('timeout should not fire if cancelled', done => {
    setTimeout(done, 800);

    scheduler.schedule(
      'key2',
      () => {
        throw new Error('the trigger was cancelled and should not have fired');
      },
      500
    );

    setTimeout(() => {
      scheduler.delete('key2');
    }, 200);
  }, 1000);

  it('multiple scheduled timeout should fire', done => {
    const now = Date.now();
    expect.assertions(2);

    scheduler.schedule(
      'key4',
      () => {
        expect(now + 400).toBeLessThanOrEqual(Date.now());
        done();
      },
      400
    );
    scheduler.schedule(
      'key3',
      () => {
        expect(now + 200).toBeLessThanOrEqual(Date.now());
      },
      200
    );
  }, 500);

  it('cancelled timeout should not impact others', done => {
    const now = Date.now();
    expect.assertions(2);

    scheduler.schedule(
      'key5',
      () => {
        expect(now + 200).toBeLessThanOrEqual(Date.now());
        scheduler.delete('key6');
      },
      200
    );
    scheduler.schedule(
      'key6',
      () => {
        throw new Error('key6 was canceled and should not have fired');
      },
      300
    );
    scheduler.schedule(
      'key7',
      () => {
        expect(now + 400).toBeLessThanOrEqual(Date.now());
        done();
      },
      400
    );
  }, 500);

  it('schedule, cancel, schedule a timeout should fire once and at the last scheduled time', done => {
    const now = Date.now();
    expect.assertions(1);
    scheduler.schedule(
      'key8',
      () => {
        expect('this').toBe('never called');
      },
      200
    );
    scheduler.delete('key8');
    scheduler.schedule(
      'key8',
      () => {
        expect(now + 400).toBeLessThanOrEqual(Date.now());
        done();
      },
      400
    );
  }, 500);

  it('calls everything on flush', done => {
    expect.assertions(2);
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    scheduler.schedule('task1', fn1, 1000);
    scheduler.schedule('task2', fn2, 1200);
    scheduler.schedule(
      'task3',
      () => {
        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);
      },
      1500
    );
    scheduler.schedule('last', done, 2000);
    scheduler.flush();
  }, 500);
});
