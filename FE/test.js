console.log('outer');

// setTimeout(() => {
//   setTimeout(() => {
//     console.log('setTimeout');
//   }, 0);
//   setImmediate(() => {
//     console.log('setImmediate');
//   });
// }, 0);

for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    console.log('setTimeout');
  }, 0);
  setImmediate(() => {
    console.log('setImmediate');
  });
}