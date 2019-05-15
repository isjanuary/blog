##### 写在前面

React Fiber 已经不是一个新鲜概念了，网上讲解 Fiber 的文章有很多，但 React 官方团队并没有像
[Reconciliation](https://reactjs.org/docs/reconciliation.html) 一样在官方文档中正式给出 Fiber 的具体细节，只是
在 [React v16.0](https://reactjs.org/blog/2017/09/26/react-v16.0.html) 的官方博客中概念性地阐述了
Fiber 的概念。

尽管如此，React 团队还是在 [Codebase Overview](https://reactjs.org/docs/codebase-overview.html#fiber-reconciler)
里推荐了两篇社区博客：

* [react fiber architecture](https://github.com/acdlite/react-fiber-architecture)
* [fiber in depth](https://medium.com/react-in-depth/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react-e1c04700ef6e)

作为 Fiber 的深入阅读。本文即是第一篇 react fiber architecture 的译文。第二篇译文，个人推荐：

https://juejin.im/post/5c052f95e51d4523d51c8300

另外，个人还推荐一篇[黯羽轻扬](http://www.ayqy.net)的[完全理解 React Fiber](http://www.ayqy.net/blog/dive-into-react-fiber/)。好懂，讲得也更细

正文开始：

>原文地址： https://github.com/acdlite/react-fiber-architecture 作者 acdlite

## React Fiber 架构

### 介绍

React Fiber 是一项正在进行的对于 React 核心算法的重新实现，这是 React 团队过去两年研究的巅峰。

React Fiber 的目标是提升其在不同领域的适用性，如动画、布局和手势。它的主要特性是增量式渲染(incremental rendering)：一种将渲染工作
分解成块(chunk)并将它分布于多个帧。

其他关键的特性包括当有新的更新进入的时候，暂停、放弃或者重用工作的能力；给不同类型的更新赋予优先级的能力；以及新的并发原语
(concurrency primitive)。

#### 关于本文档

Fiber 引入了几项新奇的概念，它们很难光凭阅读代码就能体会其中真义。本文档以我在 React 项目中跟随 Fiber 实现的一系列笔记开始，
随着项目的进展，我意识到它也许对于其他人来说也是有所助益的资料。

我会尝试使用可能是最直白的语言，并尝试通过显式地定义关键术语来避免太过艰深晦涩的用词，我也会在可能的地方提供大量外部资源链接。

请注意我并不在 React 团队，而且也不以任何权威的方式发言。**本文不是一篇官方文档。**我已经请求 React 团队的成员来复核本文以保证
其准确性。

这也是一项正在进行的工作。**Fiber 是一个正在进行的项目，它很可能会在完成以前经历重大的重构。**同样正在进行的是记录其设计的我的
努力。任何改进和建议都热烈欢迎。

我的目标是在阅读本文之后，你将会充分理解 Fiber 以遵循其实现，并最终甚至能够向 React 贡献代码。

#### 预备知识

我强烈建议在继续阅读之前熟悉一下下面罗列的材料：

* [React Components, Elements and Instances](https://reactjs.org/blog/2015/12/18/react-components-elements-and-instances.html) - “组件” 这个词通常来说承载了过多的意义，充分理解这些术语非常重要
* [Reconciliation](https://reactjs.org/docs/reconciliation.html) - React 调和算法的抽象表述
* [React Basic Theoretical concepts](https://github.com/reactjs/react-basic) - 不含实现的 React 概念上的模型的表述。其中一些
也许在第一次阅读的时候不能理解，不要紧，你会慢慢理解的
* [React Design Principles](https://reactjs.org/docs/design-principles.html) - 对这一部分要尤其注意，它很好地解释了为什么会需要
React Fiber

### 复习

请看一遍预备知识的章节，如果你还没有的话

在我们深入新的知识以前，我们先来复习一些概念

#### 什么是 reconciliation

##### _reconciliation_

React 使用这种算法来 diff 两棵树，以决定 DOM 的哪些部分需要被更新的算法

##### _update_

用来渲染 React 应用中数据的变化，通常来说是 `setState` 的结果，最终会导致 re-render

React API 的核心想法是像 updates 引起整个应用 re-render 一样来思考 updates，这允许开发者能够声明式地推导，而不是担心怎样才能有效地
将应用从任一状态过渡到另一个(A 到 B，B 到 C，C 到 A，诸如此类)

实际上，每次改变的时候都 re-render 整个应用只对那些最最简单的应用有效；在真实的应用场景中，从性能角度讲，这样做的代价太高了。
React 做了一些优化，它们能够在保证优秀性能的前提下，创建整个应用 re-render 时的页面外观。这些优化的内容就是被称为是
**reconciliation** 过程的一部分。

reconciliation 是一种算法，这就是大家通常理解的 `Virtual DOM` 背后的算法。一个更为高阶的表述类似于：当你渲染一个 React 应用
的时候，一棵用来描述应用的 node 树在内存中生成和保存，然后这棵树会被推送到渲染环境————比如说，以浏览器应用为例，它被翻译成
一套 DOM 操作。当应用更新的时候(通常是通过 setState)，一棵新树生成了，这棵新树会被用来和之前的树做 diff，从而计算得出哪些操作
是需要用来更新渲染应用的。

虽然 Fiber 是对于 reconciler 的一种底层重写，但在[React 文档中提到的](https://reactjs.org/docs/reconciliation.html)
高阶算法却会是大部分相同的。关键点是：

* 不同组件类型假定会在实质上生成不同的树，React 不会尝试 diff 它们，而会完全替代旧的树
* list 的 diff 操作是通常 key 来执行的，key 应该是 **稳定的，可预测，且唯一**

#### Reconciliation vs. rendering

DOM 只是 React 可以渲染的渲染环境之一，其他的主要目标是通常 React Native 来做 native iOS 和 Android view.(这就是为什么
`Virtual DOM` 的说法不太恰当)

React 之所以能够支持这么多的目标是因为 React 被设计成 reconciliation 和 rendering 是相互独立的阶段，reconciler 处理了计算
树的哪一部分已经改变的工作；之后 renderer 使用那部分信息来实际更新已渲染的应用。

这种分离意味着 React DOM 和 React Native 可以在尽管共享同一个 reconciler 的情况下，使用它们各自的 renderer，由 React
核心提供。

Fiber 重新实现了 reconciler，它主要并不关心 render，虽然 renderer 会需要修改一些部分以支持(并利用)新的架构。

#### 计划(scheduling)

##### _scheduling_

决定什么时候 work 应该被执行的过程

##### _work_

任何必须被执行的计算，work 通常是 update 的结果 (比如： setState)

React 的 [Design Principle](https://reactjs.org/docs/design-principles.html#scheduling) 
文档在这个主题上说得很好，因此我在这里引用这部分内容：

>在目前实现中，React 在一个单独时间单位里，递归地遍历树，并且调用整个更新后的树的 render 函数，但是将来它有可能开始延迟
一些更新以避免掉帧
>
>这是一个 React 设计里的普遍宗旨，一些流行的库实现 _push_ 的方法，这些方法的特点是新数据准备好了就执行计算，但 React 坚持
_pull_ 的方法，这些方法的特点是计算可以被延迟到必要的时候才去执行
>
>React 不是一般的数据处理的工具库，它是用来构建用户界面的工具库，我们认为它被放在应用中一个独一无二的位置，能够知道哪些
计算现在是立即相关，而哪些不是
>
>如果有些东西暂时不在屏幕上，我们可以延迟和其相关的任何逻辑，如果数据比帧率来得还快，我们可以整合并批处理这些 updates。我们
可以优先处理来自用户交互的 work (比如由按钮点击引起的动画)，把次要一些的背景 work (比如把刚从网络加载完的新内容渲染出来)
排到后面，以避免掉帧。

关键点是:

* 在 UI 中，没必要立即执行每次更新；实际上，这么做可能是浪费的，会引起帧数的损失，以及降低用户体验
* 不同类型的更新有不同优级级 ———— 一次动画的更新需要更快地完成，相对于来自于数据存储的更新
* 基于 push 的方法要求应用(程序员)来决定如何 schedule work，基于 pull 的方法让框架(React)变得更智能并且替你做这些决定

React 现在还没有大规模地应用 schedule；一次 update 会导致整棵子树立即被重渲染。大改 React 的核心算法以利用 schedule 是
Fiber 背后的驱动想法。

---

现在我们已经准备好深入 Fiber 实现了，下一个章节会比目前的内容更加技术向一些，在继续之前，请先确认之前的材料你都已经消化了。

### 什么是 Fiber

我们马上要讨论 Fiber 架构的核心了。Fiber 是一种比应用开发者们通常认为的底层得多的抽象，如果你发现在尝试理解它的时候感到了
挫败感，别难过，继续尝试(理解它)，而且这最终会是有意义的。(当你最后理解它的时候，请你提出一些如何改进这个章节的建议)

让我们开始吧！

---

我们已经建立了一个 Fiber 的基础目标，那就是使 React 能够利用 schedule。具体来说，我们需要能够：

* 暂停 work，过一会再恢复
* 给不同类型的 work 分配优先级
* 重用之前完成的 work
* 放弃 work 如果该 work 不再需要的话

为了实现这其中的任何一点，我们首先需要一种把 work 分解成单位的方式，在某种意义上，那就是一个 fiber。一个 fiber，
代表了**一个单元的 work**(a unit of work)

为了更进一步，让我们回到这个概念：[React 组件是数据的函数](https://github.com/reactjs/react-basic#transformation)，
抽象表达成：

```
v = f(d)
```

结果就是，渲染一个 React 应用类似于调用这样一个函数，它的函数体包含了对其他函数的调用，依此类推。这种类比在我们
理解 fiber 的时候挺很有用。

计算机常用来追踪程序执行的方式是使用[调用栈(call stack)](https://en.wikipedia.org/wiki/Call_stack)，当一个函数执行的
时候，一个新的**栈帧(stack frame)**被添加到调用栈中，这个栈帧代表了被当前函数所执行的 work。

当处理 UI 的时候，问题在于如果一次执行了太多的 work，这有可能会引起动画掉帧和卡顿。而且，这个 work 中的一些部分有可能是
不必要的，如果它是由一个最近的更新带来的话，这就是 UI 组件和函数之间的差异会产生问题的地方，因为通常来说，相较函数而言，组件
有更多需要专门注意的点。

版本新一些的浏览器(以及 React Native)实现了能够有助于处理这个问题的 API：`requestIdleCallback` 会安排一个低优先级的函数在
空闲的时段才被调用，而 `requestAnimationFrame` 则会安排一个高优先级的函数在下一个动画帧的时候就被调用。问题在于，为了使用
这些 API，你需要一种方式能够把 rendering work 分割成增量式的单元，如果你只依赖调用栈的话，那么在栈为空之前它会一直做 work。

如果我们能自定义调用栈的行为以优化渲染 UI 的话，这不是很棒吗？如果我们能根据自己的意愿中断调用栈，并手动操作栈帧的话，这不是
很牛叉吗？

这就是 React Fiber 的目的。Fiber 是栈的重新实现，特别为 React 组件而做的，你可以把单个 fiber 想像成**虚拟的栈帧**。

重新实现栈的好处是你能够[把栈帧存放在内存里](https://www.facebook.com/groups/2003630259862046/permalink/2054053404819731/)，
并且在任何时候，以任何方式执行它们，这对于我们的 schedule 目标来说非常重要。

除了 schedule 以外，手动操纵栈帧解锁了并发和异常边界的潜能，我们会在以后的章节中谈到这些主题。

在下一章节中，我们会更多地关注 fiber 的结构。

#### fiber 的结构

具体来讲，fiber 是一个 JavaScript 对象，它包含了组件，其输入以及输出的信息。

一个 fiber 对应着一个栈帧，而且它也对应着一个组件实例。

这是一些 fiber 的关键字段。(这张列表不全)

`type` 和 `key`

fiber 的 type 和 key 和他们在 React 元素所起的作用是一样的，(实际上，当某个 fiber 被从元素中创建的时候，这两个字段直接
就被拷贝过来了)

fiber 的 type 描述了它所对应的组件，对于复合组件，type 是函数或者类组件自身(对应函数组件，class 组件，译者注)，对宿主
组件(`div`，`span`等等)而言，type 是一个 string。

概念上来说，type 是函数(就像在 `v = f(d)` 里的)，它的执行会被栈帧跟踪。

除了 type，key 在 reconciliation 会被用来决定 fiber 是否能被复用。

`child` 和 `sibling`

这两个字段指向其他 fiber，描述了某个 fiber 的递归树结构。

child fiber 对应的是组件的 `render` 方法的返回值，因此在下面的例子中

```js
function Parent() {
	return <Child />
}
```

`Parent` 的 child fiber 就是 Child。

sibling 字段则用来处理 `render` 返回多个 children 的情况 (Fiber 中的一个新特性!)：

```js
function Parent() {
	return [<Child1 />, <Child2 />]
}
```

child fibers 形成了一张单链表，它的 head 是第一个 child，因此在这个例子中，`Parent` 的 child 是 `Child1`，且 `Child1`
的 sibling 是 `Child2`。

回到我们的函数类比，你可以把 child fiber 想像成是一个[尾调用函数](https://en.wikipedia.org/wiki/Tail_call)

`return`

return fiber 是在处理完当前 fiber 以后，程序应该返回的那个 fiber。概念上讲，它和栈帧的返回地址是一样的，也可以被认为是
parent fiber。

如果一个 fiber 有多个 child fiber，那么每个 child fiber 的 return fiber 都是 parent，因此在我们之前章节的例子中，`Child1`
和 `Child2` 的 return fiber 就是 `Parent`。

`pendingProps` 和 `memoizedProps`

从概念上讲，props 是函数的参数，fiber 的 `pendingProps` 在 fiber 执行的最开始就被设定好了，而 `memoizedProps` 则是在最后
被设定好的。

当下一个 `pendingProps` 和 `memozizedProps` 相等的时候，它代表了 fiber 的上一个输出可以被复用，防止了不必要的 work。

`pendingWorkPriority`

这是一个表明由 fiber 所代表的 work 优先级的数字，[ReactPriorityLevel](https://github.com/facebook/react/blob/master/src/renderers/shared/fiber/ReactPriorityLevel.js) (此处 ReactPriorityLevel 的具体文件位置会调整，可自行在 react repo
中搜索，译者注) 模块列出了不同的优先级，以及它们分别代表什么。

除了 `NoWork`，也就是 0 的情况，更大的数字代表着更低的优先级。例如，你能用下面的函数来检查某个 fiber 的优先级是否和给定的等级
一样高：

```js
function matchesPriority(fiber, priority) {
	return fiber.pendingWorkPriority !== 0 &&
			fiber.pendingWorkPriority <= priority
}
```

这个函数只是用来展示的；它并不真的是 React 代码库的一部分。

调度程序使用优先级字段来搜索所要执行的下一单元 work，这个算法会在下一章节讨论。

`alternate`

**_flush_**

刷新(flush) fiber 指的是把 fiber 的输出渲染到屏幕上

**_work-in-progress_**

还没完成的 fiber；概念上讲，就是还没返回的栈帧

任何时候，一个组件实例至多有两个相对应的 fiber：当前的，刷新过的(flushed) fiber，和 work-in-progress 的 fiber。

当前 fiber 的 alternate 就是 work-in-progress，那么 work-in-progress 的 alternate 就是当前 fiber。

fiber 的 alternate 是用一个叫作 `cloneFiber` 的函数以懒汉式创建的，相较于总是创建一个新对象，`cloneFiber` 会试
着复用 fiber 的 alternate 如果存在的话，最小化内存分配。

你应该把 `alternate` 字段认为是一种实现细节，但它会在代码里经常弹出，因此在这里讨论这个字段是有价值的。

`output`

**_host component_**

React 应用的叶子节点。它们针对于不同的渲染环境(比如，在浏览器里，他们是 `div`、`span` 等等)，在 JSX 里，他们以小写
的标签名标记

每个 fiber 最后都会有 output，但 output 只会在叶子节点由 host component 创建，然后 output 会被传输到树上。

output 就是最后会给到 renderer 的东西，因此它能够把变更刷新到渲染环境里去(指浏览器等，译者注)，而定义 ouput 是如何
创建和更新则是 renderer 的职责。
