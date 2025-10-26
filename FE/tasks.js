async function asyncInChrome() {
  const p1 = new Promise(resolve => {
    console.log('promise 1')
    resolve()
  })

  const p2 = new Promise(resolve => {
    console.log('promise 2')
    resolve()
  })

  console.log('console log 1')
  setTimeout(() => {
    console.log('settimeout 1')
  }, 0)

  Promise.resolve()
    .then(() => {
      console.log('promise then 1')
    })
    .then(() => {
      console.log('promise then 2')
    })

  console.log('console log 2')
  const asyncF = async () => {
    console.log('async function start')
    await Promise.resolve()
    console.log('async function end')
  }

  await asyncF()
  setTimeout(() => {
    console.log('settimeout 2')
  }, 0)

  p2.then(() => {
    console.log('promise 2 then')
  })

  p1.then(() => {
    console.log('promise 1 then')
  })
  console.log('console log 3')
}

async function asyncInNode() {
  const p1 = new Promise(resolve => {
    console.log('promise 1')
    resolve()
  })

  const p2 = new Promise(resolve => {
    console.log('promise 2')
    resolve()
  })

  console.log('console log 1')
  setTimeout(() => {
    console.log('settimeout 1')
  }, 0)

  setImmediate(() => {
    console.log('setimmediate 1')
  })

  Promise.resolve()
    .then(() => {
      console.log('promise then 1')
    })
    .then(() => {
      console.log('promise then 2')
    })

  console.log('console log 2')
  const asyncF = async () => {
    console.log('async function start')
    await Promise.resolve()
    console.log('async function end')
  }

  await asyncF()
  process.nextTick(() => {
    console.log('nexttick 1')
  })

  setTimeout(() => {
    console.log('settimeout 2')
  }, 0)

  p2.then(() => {
    console.log('promise 2 then')
  })

  p1.then(() => {
    console.log('promise 1 then')
  })
  console.log('console log 3')
}

async function asyncInDeepseek() {
  // 同步代码 - 优先执行
  console.log('1. 同步代码开始');

  // 宏任务 - setTimeout
  setTimeout(() => {
    console.log('6. setTimeout 回调 - 宏任务');
  }, 0);

  // 宏任务 - setImmediate (Node.js 环境)
  if (typeof setImmediate !== 'undefined') {
    setImmediate(() => {
      console.log('7. setImmediate 回调 - 宏任务');
    });
  }

  // Promise - 同步执行的部分
  console.log('2. Promise 构造器同步执行');

  // Promise - 微任务
  Promise.resolve()
    .then(() => {
      console.log('4. Promise.resolve().then - 微任务1');
      return '微任务返回值';
    })
    .then((value) => {
      console.log('5. Promise 链式调用 - 微任务2，接收值:', value);
    });

  // async 函数 - 微任务
  async function asyncFunction() {
    console.log('3. async 函数内部同步代码');
    const result = await Promise.resolve('await 返回值');
    console.log('5. async 函数 await 后 - 微任务，结果:', result);
    return result;
  }

  // 调用 async 函数
  asyncFunction().then(result => {
    console.log('5. async 函数 then - 微任务，最终结果:', result);
  });

  // 嵌套的 Promise 微任务
  Promise.resolve()
    .then(() => {
      console.log('4. 嵌套 Promise - 外层微任务');
      return Promise.resolve().then(() => {
        console.log('5. 嵌套 Promise - 内层微任务');
      });
    });

  // process.nextTick (Node.js 环境) - 优先级最高的微任务
  if (typeof process !== 'undefined' && process.nextTick) {
    process.nextTick(() => {
      console.log('3. process.nextTick - 最高优先级微任务');
    });
  }

  // MutationObserver (浏览器环境) - 微任务
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      console.log('5. MutationObserver 回调 - 微任务');
    });
    const element = document.createElement('div');
    observer.observe(element, { attributes: true });
    element.setAttribute('data-test', 'value');
  }

  // 同步代码结束
  console.log('2. 同步代码结束');

  // 额外的宏任务示例
  setTimeout(() => {
    console.log('8. 第二个 setTimeout - 宏任务');

    // 在宏任务中创建的微任务
    Promise.resolve().then(() => {
      console.log('9. 宏任务中的微任务');
    });
  }, 0);

  // 复杂的 async/await 示例
  const complexAsync = async function() {
    console.log('3. 复杂 async 函数开始');

    // 第一个 await - 创建微任务
    const result1 = await new Promise(resolve => {
      console.log('3. await 中的 Promise 构造器同步执行');
      resolve('第一个结果');
    });
    console.log('5. 第一个 await 后 - 微任务:', result1);

    // 第二个 await - 另一个微任务
    const result2 = await Promise.resolve('第二个结果');
    console.log('5. 第二个 await 后 - 微任务:', result2);

    return [result1, result2];
  }

  complexAsync().then(results => {
    console.log('5. 复杂 async 函数完成:', results);
  });

  console.log('2. 所有同步代码执行完毕');
}

// asyncInChrome()
asyncInNode()
// asyncInDeepseek()
