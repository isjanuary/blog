## state 工作机制

### setState v15.4.2

react v15.4.2 中，this.setState 之后发生了什么，具体调用了什么函数？

* setState: `isomorphic/modern/class/ReactComponent.js`
* enqueueSetState: `renderers/shared/stack/reconciler/ReactUpdateQueue.js`
* enqueueUpdate: `renderers/shared/stack/reconciler/ReactUpdates.js`
* batchedUpdates: `renderers/shared/stack/reconciler/ReactDefaultBatchingStrategy.js`
	* batching strategy 的注入. ReactDOM: `renderers/dom/ReactDOM.js`
	* inject: `renderers/dom/shared/ReactDefaultInjection.js`
* perform: `renderers/shared/utils/Transaction.js`
* flushBatchedUpdates: `renderers/shared/stack/reconciler/ReactUpdates.js`
* runBatchedUpdates: `renderers/shared/stack/reconciler/ReactUpdates.js`
* ReactReconciler.performUpdateIfNecessary: `renderers/shared/stack/reconciler/ReactReconciler.js`
* componentInst.performUpdateIfNecessary: `renderers/shared/stack/reconciler/ReactCompositeComponent.js`
* updateComponent: `renderers/shared/stack/reconciler/ReactCompositeComponent.js`
* \_performComponentUpdate: `renderers/shared/stack/reconciler/ReactCompositeComponent.js`


1. `componentInstance.setState`. 调用 enqueueSetState.
2. `componentInstance.updater.enqueueSetState`. 把用户的 state 更新推入队列`_pendingStateQueue`，注意这个队列是属于 componentInstance 的. 这里的 updater 对象是`ReactComponent`构造函数里的第三个参数，它是一个 ReactUpdateQueue 对象，内部结构参见`ReactUpdateQueue.js`，updater 不存在时，会去初始化一个`ReactNoopUpdateQueue`对象. 

3. `ReactUpdates.enqueueUpdate`. 
* 若批处理正在执行，把当前组件推入 dirtyComponents 数组，也可以理解成对当前组件做一个脏标记(**Mark a component as needing a rerender**)；
* 若没有批处理正在执行，执行批处理策略(batchingStrategy.batchedUpdates). 这里的 batchingStrategy 是通过依赖注入的方式得到的(依赖注入是 React 常见的一种构造方式)，因此 batchingStrategy 取决于注入时所传入的参数 \_batchingStrategy. 

4. 那么问题来了，什么时候调用的注入？其实注入在我们使用 ReactDOM 的时候就发生了，在 `ReactDOM.js` 中，有这样一段：
```
var ReactDefaultInjection = require('ReactDefaultInjection');
ReactDefaultInjection.inject();
```
显而易见，这里的 `ReactDefaultInjection` 模块的作用是，完成所有依赖注入模块的默认注入，打开 `ReactDefaultInjection.js` 代码，会看到大量的 inject 函数调用。

5. 我们先来看看，step 3 中提到的 `ReactDefaultBatchingStrategy.batchedUpdates` 长啥样。
```
var ReactDefaultBatchingStrategy = {
  isBatchingUpdates: false,

  /**
   * Call the provided function in a context within which calls to `setState`
   * and friends are batched such that components aren't updated unnecessarily.
   */
  batchedUpdates: function(callback, a, b, c, d, e) {
    var alreadyBatchingUpdates = ReactDefaultBatchingStrategy.isBatchingUpdates;

    ReactDefaultBatchingStrategy.isBatchingUpdates = true;

    // The code is written this way to avoid extra allocations
    if (alreadyBatchingUpdates) {
      return callback(a, b, c, d, e);
    } else {
      return transaction.perform(callback, null, a, b, c, d, e);
    }
  },
};
```
同时我们再把 step 3 中的 batchedUpdates 函数结合起来看：
```
function enqueueUpdate(component) {
	// ......
  if (!batchingStrategy.isBatchingUpdates) {
    batchingStrategy.batchedUpdates(enqueueUpdate, component);
    return;
  }

  dirtyComponents.push(component);
  if (component._updateBatchNumber == null) {
    component._updateBatchNumber = updateBatchNumber + 1;
  }
}
```
enqueueUpdate 调用 batchedUpdates 会把自己作为 callback 参数传入，在 batchedUpdates 方法里会去调用这个 callback 参数，形成了递归。batchingStrategy 用一个标志位 isBatchingUpdates 来控制递归的开始与结束，从而避免出现死循环。要具体理清 batchedUpdates 的逻辑，需要首先解释什么是 Transaction 类.

6. 在 Transaction.js 中，React 官方对 Transaction 类的作用是这样解释的：
```
`Transaction` creates a black box that is able to wrap any method such that
certain invariants are maintained before and after the method is invoked
(Even if an exception is thrown while invoking the wrapped method)
```
翻译过来是：Transaction 创建了一个黑盒，这个黑盒能够包装任何方法，从而使得这个方法在被调用前以及调用后，某些 invariants 
可以被继续保持，这里的 invariants 应该指的是类似 Immutable 之类的概念，即使用 React 时更被推荐的不变性和一致性。所以
transaction 简单来说，就是执行了包装的方法之后，还能够继续保持包装类的某些不变特性的一种事务流。

Transaction.js 注释里已经给出了 transaction.perform(method) 内部的基本流程图，首先执行 wrapper 的 initialize，然后执行 method，最后是 wrapper 的 close，结果会保留包装类的 invariants 信息.

```
                      wrappers (injected at creation time)
                                     +        +
                                     |        |
                   +-----------------|--------|--------------+
                   |                 v        |              |
                   |      +---------------+   |              |
                   |   +--|    wrapper1   |---|----+         |
                   |   |  +---------------+   v    |         |
                   |   |          +-------------+  |         |
                   |   |     +----|   wrapper2  |--------+   |
                   |   |     |    +-------------+  |     |   |
                   |   |     |                     |     |   |
                   |   v     v                     v     v   | wrapper
                   | +---+ +---+   +---------+   +---+ +---+ | invariants
perform(anyMethod) | |   | |   |   |         |   |   | |   | | maintained
+----------------->|-|---|-|---|-->|anyMethod|---|---|-|---|-|-------->
                   | |   | |   |   |         |   |   | |   | |
                   | |   | |   |   |         |   |   | |   | |
                   | |   | |   |   |         |   |   | |   | |
                   | +---+ +---+   +---------+   +---+ +---+ |
                   |  initialize                    close    |
                   +-----------------------------------------+
```
对应在 transaction.perform 代码里，就是：
```
initializeAll();
method.call(scope, ....);
closeAll();
```
initializeAll 和 closeAll 自然就是遍历调用 transactionWrappers 里所定义的 intialize 和 close 方法。

7. 具体到 ReactBatchingDefaultStrategy 来说，其 wrappper 所定义的 initialize 和 close 方法定义如下：
```
var RESET_BATCHED_UPDATES = {
  initialize: emptyFunction,
  close: function() {
    ReactDefaultBatchingStrategy.isBatchingUpdates = false;
  },
};

var FLUSH_BATCHED_UPDATES = {
  initialize: emptyFunction,
  close: ReactUpdates.flushBatchedUpdates.bind(ReactUpdates),
};
var TRANSACTION_WRAPPERS = [FLUSH_BATCHED_UPDATES, RESET_BATCHED_UPDATES];
```
对于某个组件实例而言:  
* 第一次调用到 enqueueUpdate 时，ReactDefaultBatchingStrategy.isBatchingUpdates 初值是 false，所以会去调 batchedUpdates(enqueueUpdate)
* batchedUpdates 把 isBatchingUpdates 置 true，然后调用 transaction.perform(method).
* perform 如前所说，会先走 transaction wrapper 的 init，init 走完以后，再去 call 传进来的 callback，也就是 enqueueUpdate
* 此时，isBatchingUpdates 为 true，因此执行 dirtyComponents.push，并更新 \_updateBatchNumber
* method 调完以后执行 transaction wrappers 的 close，FLUSH.close 则是 flushBatchedUpdates.

依流程图示意如下:

**此处应有流程图**

8. 接下来就是 flushBatchedUpdates 的逻辑了，从字面上看，这块应该是真正更新的逻辑所在了，之前的工作主要是
a) 将 state 的更新推入队列. `queue.push(partialState);`
b) 将组件的更新推入队列，即脏标记. `dirtyComponents.push(component);`

flushBatchedUpdates 的代码这里就不贴了，主要是:
```
transaction.perform(runBatchedUpdates, null, transaction);
```
按照之前对于 transaction 的分析，这个 transaction 应该也有 transaction wrapper 和相应的 init 和 close。其实，这个 transaction 的 wrapper 就在这个 ReactUpdates.js 文件里，除此以外还额外加入了一些方法，大家可以自行阅读源码，这里更关心更新
是怎么做的。

9. runBatchedUpdates 的代码大致如下:
```
function runBatchedUpdates(transaction) {
	// ......

  for (var i = 0; i < len; i++) {
    var component = dirtyComponents[i];

    // If performUpdateIfNecessary happens to enqueue any new updates, we
    // shouldn't execute the callbacks until the next render happens, so
    // stash the callbacks first
    var callbacks = component._pendingCallbacks;
    component._pendingCallbacks = null;

    // ......

    ReactReconciler.performUpdateIfNecessary(
      component,
      transaction.reconcileTransaction,
      updateBatchNumber
    );

    // ......

    if (callbacks) {
      for (var j = 0; j < callbacks.length; j++) {
        transaction.callbackQueue.enqueue(
          callbacks[j],
          component.getPublicInstance()
        );
      }
    }
  }
}
```
runBatchedUpdates 会遍历所有的 dirtyComponents。对于每个 dirtyComponent，首先缓存其 \_pendingCallbacks，
这是因为如果接下来的 performUpdateIfNecessary 碰巧也 enqueue 了一些新的 updates，那所有回调的触发时机就不是都在
state 更新完之后了，应该等到下次 render 发生的时候才去执行，而不是现在就执行。

接下来的工作就很明了了，reconciler 更新组件(最后会到 render)，更新完执行回调.

10. updateComponent。step 9 中提到的 performUpdateIfNecessary 最后会用到 updateComponent，细节不再赘述，其主要逻辑如下:
* 处理 componentWillReceiveProps。先判断 parentElement 有无变化，若有变化，且定义了该勾子，则执行.
* 处理 state 更新。合并 \_pendingStateQueue 所有的状态更新，若要替换原 state，则合并给该队列的第一项；若不替换原 state，则合并到原 state obj.
* 计算 shouldUpdate。
	* 默认值为 true；
	* 不需要 forceUpdate 的情形下，若定义了 shouldComponentUpdate 勾子，则将其返回值赋给 shouldUpdate；
	* 否则，如果是组件类型是 PureClass，则将 props 和 state 的 shallowEqual 值赋给 shoudUpdate
* \_performComponentUpdate。shouldUpdate 为 true，更新组件.

setState 是不会触发该组件的 componentWillReceiveProps 勾子的大家都知道，其实在代码里也是有线索的，setState 调用到的
updateComponent 所传入的 prevParentElement 和 nextParentElement 是同一个，所以这里会直接进入 state 的合并和更新。

另外，从上面也可以看到 state 的合并其实是发生在 shouldComponent 之前，componentWillReceiveProps 之后的，
这一点从生命周期来看，也能够理解，state 批处理没完成或不完整，shouldComponentUpdate 其实意义就不大了.

11. 最后我们来看 \_performComponentUpdate，和 updateComponent 类似，也包含逻辑以及生命周期勾子的触发，不同的是，
updateComponent 更像是准备阶段，或者说是 state and props prepare，而 \_performComponentUpdate 则更像是 render 的执行者，包含了 before render、render 以及 after render 三个阶段，其实也就对应 componentWillUpdate、
\_updateRenderedComponent 和 componentDidUpdate。\_updateRenderedComponent 之后我们在 dom 和 reconciler 部分具体再说。

#### 总结

回过头来看，写了太多 setState 逻辑的细节了。其实主要的部分就那么几步：

* 把 state 更新请求推入 \_pendingStateQueue. (step 1 和 2)
* 为当前组件进行脏标记，推入需要更新的组件队列. (step 5、7)
* 在 shouldComponentUpdate 之前，合并所有队列中的 state 更新. (step 10)
* 更新组件(render). (step 11)

enqueueUpdate 其实包含了两部分，一是 state 更新的入队，二是组件更新的入队。更新的执行过程中，也就是 flushBatchedUpdates 和
runBatchedUpdates 部分，代码中有个很重要的变量：`updateBatchNumber`，来标记当前正在更新哪个组件，updateBatchNumber 有点
像更新中的组件 id 标识，通过比较 updateBatchNumber 和 dirtyComponent.length 来确定是否所有队列中的组件都更新完毕，有兴趣的
可以进一步阅读代码。

分析完 setState，我们也可以从代码角度分析一下，setState 应用在不同生命周期里的效果。这是 updateComponent 的流程图:

**此处应有流程图**

可以看到，\_pendingStateQueue (下作 queue) 不仅作为 state 队列的存储，同时也作为进入 updateComponent 逻辑的控制器。如果在 componentWillReceiveProps 做 setState，那么会将这个 state 更新入队，进入 state 更新流程，componentWillReceiveProps 之前的 state 合并并没有实际执行(state 的合并是在 \_processPendingState)，所以在 componentWillReceiveProps 里的 state 更新会在该勾子执行之后，在 \_processPendingState 里合并入之前的 state，将 queue 排空以后再进入 updateComponent，本次 render 完成。如果在 componentWillUpdate/render/componentDidUpdate 里做 setState，事实上本次 render 的 state 更新已经完成，且 queue 被排空，这次又进入 state 更新，亦即下一次的 render，再走一遍所有的更新流程，又会来到这些勾子，
形成死循环。这也就是 React 文档中为什么说 componentDidUpdate 可以 setState，但要控制好进入条件.

这些我们已经熟悉的特性也有了代码上的证据。

### fiber 之后的 setState

### functional component
