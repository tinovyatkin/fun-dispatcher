[![codecov](https://codecov.io/gh/tinovyatkin/fun-dispatcher/branch/master/graph/badge.svg)](https://codecov.io/gh/tinovyatkin/fun-dispatcher)

# fun-dispatcher

Tiny ES6 class to run functions after a given delay. Uses just on timer at any time and setImmediate to execute functions.

Written in Typescript, 100% test coverage, targeting current LTS Node.JS

Example:

```js
const { Scheduler } = require('fun-dispatcher');

const fd = new Scheduler();

fd.schedule('task1', () => { console.log('Will run after about 600ms') }, 600);
fd.schedule('task2', () => {
    console.log('Tasks can be cancelled by id');
    fd.delete('task1')
}, 400)

// can forcefully execute all tasks
fd.flush();

```
