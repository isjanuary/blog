## 宏任务/微任务在 javascript 的调度顺序

面试/笔试中的一类常见题目是同步任务、宏任务、微任务的执行顺序，

##### 测试代码

1. 浏览器环境下：

##### 代码如下：

```javascript
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

await asyncInChrome()
```

##### 执行结果

```
promise 1
promise 2
console log 1
console log 2
async function start
promise then 1
async function end
promise then 2
console log 3
promise 2 then
promise 1 then
settimeout 1
settimeout 2
```

2. Node 环境

##### 代码如下

```jsx
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

asyncInNode()
```

##### 执行结果

```
promise 1
promise 2
console log 1
console log 2
async function start
promise then 1
async function end
promise then 2
console log 3
promise 2 then
promise 1 then
nexttick 1
settimeout 1
setimmediate 1
settimeout 2
```

3. Deepseek 给出的测试代码

Deepseek 给出了一个更复杂的调度场景，可以作为进阶测试来验证是否

##### 测试代码

```jsx
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

asyncInDeepseek()
```

##### 执行结果

```
1. 同步代码开始
2. Promise 构造器同步执行
3. async 函数内部同步代码
2. 同步代码结束
3. 复杂 async 函数开始
3. await 中的 Promise 构造器同步执行
2. 所有同步代码执行完毕
3. process.nextTick - 最高优先级微任务
4. Promise.resolve().then - 微任务1
5. async 函数 await 后 - 微任务，结果: await 返回值
4. 嵌套 Promise - 外层微任务
5. 第一个 await 后 - 微任务: 第一个结果
5. Promise 链式调用 - 微任务2，接收值: 微任务返回值
5. async 函数 then - 微任务，最终结果: await 返回值
5. 嵌套 Promise - 内层微任务
5. 第二个 await 后 - 微任务: 第二个结果
5. 复杂 async 函数完成: [ '第一个结果', '第二个结果' ]
6. setTimeout 回调 - 宏任务
8. 第二个 setTimeout - 宏任务
9. 宏任务中的微任务
7. setImmediate 回调 - 宏任务
```

总体分为以下几个阶段：
1.  同步任务：从 `1. 同步代码开始` 到 `2. 所有同步代码执行完毕`，包含所有同步 log 及异步任务声明中的 log
2.  最高优先级的 `process.nextTick`
3.  第一轮微任务：从 `4. Promise.resolve().then - 微任务1` 到 `5. 第一个 await 后 - 微任务: 第一个结果`
4.  第二轮微任务：从 `5. 嵌套 Promise - 内层微任务` 到 `5. 第二个 await 后 - 微任务: 第二个结果`
5.  第三轮微任务：`5. 复杂 async 函数完成: [ '第一个结果', '第二个结果' ]`
6.  宏任务：从 `setTimeout 回调 - 宏任务` 到 `setImmediate 回调 - 宏任务`

对于宏任务，特别要注意 `setTimeout(fn, 0)` 和 `setImmediate` 这两种近似的用法。在 deepseek 的例子里面， `setImmediate` 后调用，而在我自己给出的 Node.js 的例子里面，
这两者的执行顺序其实是不定的，有可能如我给出的结果那样，
```
settimeout 1
setimmediate 1
settimeout 2
```
也有可能是像下面这样：
```
setimmediate 1
settimeout 1
settimeout 2
```

其中的原理可以参考 [这篇文章](https://www.cnblogs.com/dennisj/p/12550996.html)，比较详细地解释了 Event loop 中 `setImmediate` 的触发时机

另外，注意 `process.nextTick` 在 `asyncInNode` 和 `asyncInDeepseek` 这两个函数中调用时机的区别，
- 在 `asyncInNode` 中，`nextTick` 是在 `await` 后面调用的
- 在 `asyncInDeepseek` 则不需要等待异步任务完成后再执行

