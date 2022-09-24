#### 注意点
v15.4.2，在 `ReactClass.js` 的注释中提到，componentDidMount 并不保证某 DOM 已经存在了：`However, there is no guarantee that the DOM node is in the document.`  也许这就是为什么 componentDidMount 处理 DOM 的时候经常需要 setTimeout 的原因

## React 渲染机制

### JSX

我们在写 React 时，一般会通过 JSX 代码来描述 DOM，像这样:
```
const element = (
  <h1 className="greeting">
    Hello, world!
  </h1>
); 
```
React 官方文档在开篇的时候就已经介绍了 JSX:
```
Babel compiles JSX down to React.createElement() calls.
```
就是说 Babel 会把 JSX 编译成 React.createElement() 调用。对于 element 这个例子而言，上面的 JSX 写法和下面这种 React.createElement 形式等价:
```
const element = React.createElement(
  'h1',
  {className: 'greeting'},
  'Hello, world!'
);
```
我们可以想像，在生命周期的 render 方法里，我们 return JSX，实际上是调用了 return React.createElement()，比如说
```
render() {
	return <div className="wrapper">
		<h1>hello world</h1>
		<p bgColor='red'>I'm the description</p>
	</div>
}
```
实际上经过 Babel 编译成了以下的代码:
```
render() {
	return React.createElement(
		'div',
		{className: 'wrapper'},
		[
			React.createElement(
				'h1',
				{},
				'hello world'
			),
			React.createElement(
				'p',
				{bgColor: 'red'},
				"I'm the description"
			),
		]
	)
}
```
React.createElement 函数原型如下:
```
React.createElement(
  type,
  [props],
  [...children]
)
```
有了这个基础，之后在源码里我们如果看到生命周期的 render 方法调用，自行将其扩展为
```
render() {
	return React.createElement(
		type,
		[props],
		[...children DOM]
	)
}
```
方便理解.

### 首次加载 ———— ReactDOM.render

首先给出主要方法及文件位置:

* ReactDOM.render: `src\renderers\dom\ReactDOM.js`
* ReactMount.render: `src\renderers\dom\client\ReactMount.js`
* \_renderSubtreeIntoContainer: `src\renderers\dom\client\ReactMount.js`
* \_renderNewRootComponent: `src\renderers\dom\client\ReactMount.js`

对于一个 React App 而言，总会在 index.js 里有 ReactDOM.render，这其实就是主入口，加载 DOM。追踪 ReactDOM.render 
的调用函数，会发现核心函数是 `_renderSubtreeIntoContainer`，这里我们分两部分来分析这个函数。

#### 计算将要渲染的组件参数

\_renderNewRootComponent 是最核心逻辑，下面会讲，之前都是需要参数的准备工作，这里写的有点啰嗦了，没兴趣同学可以略过.

先来看看调用 render 时传入的参数和函数原型，
```
ReactDOM.render(
  <App />,		(这里用 ReactComponent，当然也可以是 <h2>Hello World!</h2> 等 DOM node)
  document.getElementById('root')
);

render: function(nextElement, container, callback) {
  return ReactMount._renderSubtreeIntoContainer(null, nextElement, container, callback);
},
```
还有核心函数 \_renderSubtreeIntoContainer，
```
_renderSubtreeIntoContainer: function(parentComponent, nextElement, container, callback) {
    // ......

    var nextWrappedElement = React.createElement(
      TopLevelWrapper,
      { child: nextElement }
    );

    var nextContext;
    if (parentComponent) {
      var parentInst = ReactInstanceMap.get(parentComponent);
      nextContext = parentInst._processChildContext(parentInst._context);
    } else {
      nextContext = emptyObject;
    }

    var prevComponent = getTopLevelWrapperInContainer(container);

    if (prevComponent) {
      var prevWrappedElement = prevComponent._currentElement;
      var prevElement = prevWrappedElement.props.child;
      if (shouldUpdateReactComponent(prevElement, nextElement)) {
        var publicInst = prevComponent._renderedComponent.getPublicInstance();
        var updatedCallback = callback && function() {
          callback.call(publicInst);
        };
        ReactMount._updateRootComponent(
          prevComponent,
          nextWrappedElement,
          nextContext,
          container,
          updatedCallback
        );
        return publicInst;
      } else {
        ReactMount.unmountComponentAtNode(container);
      }
    }

    var reactRootElement = getReactRootElementInContainer(container);
    var containerHasReactMarkup =
      reactRootElement && !!internalGetID(reactRootElement);
    var containerHasNonRootReactChild = hasNonRootReactChild(container);

		// ......
    var shouldReuseMarkup =
      containerHasReactMarkup &&
      !prevComponent &&
      !containerHasNonRootReactChild;
    var component = ReactMount._renderNewRootComponent(
      nextWrappedElement,
      container,
      shouldReuseMarkup,
      nextContext
    )._renderedComponent.getPublicInstance();
    if (callback) {
      callback.call(component);
    }
    return component;
  }
```
1. 首先，创建 wrapper，用来容纳其所有子节点(等进一步确认)
2. 处理 nextContext
3. 计算 prevComponent = getTopLevelWrapperInContainer(container)，顾名思义，在 container 里获取最外层的包装壳子。
这里传入的参数是 container，实际就是 ReactDOM.render 里的第二个参数: `document.getElementById('root')`
(简作 div#root)。先来看看 getTopLevelWrapperInContainer 相关的逻辑:
```
function getReactRootElementInContainer(container) {
  if (!container) {
    return null;
  }

  if (container.nodeType === DOC_NODE_TYPE) {
    return container.documentElement;
  } else {
    return container.firstChild;
  }
}

function getHostRootInstanceInContainer(container) {
  var rootEl = getReactRootElementInContainer(container);
  var prevHostInstance =
    rootEl && ReactDOMComponentTree.getInstanceFromNode(rootEl);
  return (
    prevHostInstance && !prevHostInstance._hostParent ?
    prevHostInstance : null
  );
}

function getTopLevelWrapperInContainer(container) {
  var root = getHostRootInstanceInContainer(container);
  return root ? root._hostContainerInfo._topLevelWrapper : null;
}
```
container 还是上面说的 div#root，可以看到，最先执行的是 getReactRootElementInContainer(container):
* 若 container 的 nodeType 是 DOC_NODE_TYPE(9，document 对象)，则返回 container.documentElement(实际就是 document)
* 若 container 不是 document node，则返回 container 的第一个子节点
这里的 div#root 显然不是 document node，因此返回 firstChild，但最开始加载的时候，div#root 下是什么也没有的，所以返回
null。顺着这个结果，不难发现最开始 getTopLevelWrapperInContainer 返回的是 null。很显然，这也是符合实际情况的，最开始只有
div#root，怎么可能在它里面找到 hostRoot.

所以 prevComponent 就是 null 了.

4. 计算 reactRootElement、containerHasReactMarkup、containerHasNonRootReactChild。顺着 step 3 的思路，结果分别是
* reactRootElement = null
* containerHasReactMarkup = false
* containerHasNonRootReactChild = false
从变量的字面义上看，这个结果也很容易接受，开始除了 div#root 啥都没有，reactRootElement 自然是 null 了，container 下也不会有
React markup 和 非根 React 子节点。后面的 shouldReuseMarkup = false.

#### 核心逻辑 \_renderNewRootComponent
首先根据之前计算的参数，先来看看调用:
```
var component = ReactMount._renderNewRootComponent(
    nextWrappedElement,		// 含 <App/> 的 ReactElement 对象
    container,						// div#root
    shouldReuseMarkup,		// false
    nextContext						// emptyObject
  )._renderedComponent.getPublicInstance();
```
`_renderNewRootComponent`返回一个 ReactComponent 实例，`getPublicInstance`返回 ReactComponent 的 node，也就是实际需要渲染的 HTML.

接下来我们来看具体的逻辑.

惯例先给出主要调用函数
batchedUpdates: `renderers/shared/stack/reconciler/ReactUpdates.js`
batchedMountComponentIntoNode: `src\renderers\dom\client\ReactMount.js`
mountComponentIntoNode: `src\renderers\dom\client\ReactMount.js`
ReactReconciler.mountComponent: `src\renderers\shared\stack\reconciler\ReactReconciler.js`
ReactCompositeComponent.mountComponent: `src\renderers\shared\stack\reconciler\ReactCompositeComponent.js`

batchedUpdates，之前在 setState 已经见过了，用来构造批量更新的 transaction，不同的是，setState 里包装的 method 是
ReactUpdates 的 enqueueUpdate，而这里需要包装的 method 则是 batchedMountComponentIntoNode。

对于 setState，ReactUpdateQueue 的 enqueueSetState 已经把 state 更新入队了，还要做的事情是把 component 推入队列
dirtyComponents，从而保证 component state 和 UI 两者的更新保持一致；而在处理 diff 算法的时候呢，需要批处理的则是将
component 转化成 DOM
的过程。

batchedMountComponentIntoNode 这个函数其实本质上也是一个 transaction

### 更新的情形

### Reconcilation 调度算法

这里讲的的 diff 算法基于 version < 16.0 的 stack reconcilation，version > 16.0 的 fiber reconcilation 之后再讲.

1. 对于不同类型的 elements diff，很简单，重新来过。旧的 virtual DOM node 全部推倒，完全重建新的 virtual DOM node.
2. 同类型的 elements diff 处理，分成两类:
	* 对于 DOM 类型的 element，比较 attributes，若 attributes 不同，则优先处理 DOM node 的 attributes 更新，处理完 node attributes 更新以后，再递归处理子节点.
	* 对于 Component 类型的 element，React 更新子组件的 props，执行当前组件的 componentWillUpdate 和 componentWillReceiveProps，调用 render 方法渲染当前组件，最后递归 diff 子节点.
3. list 的处理。对于单个子结点的递归处理，复用上面的 step 1 和 step 2 即可，这里讲一讲对于类似 ul/ol 套 li tag 的结构，即
多个同级同类子结节的情形。


讲完了 React 的渲染机制，我们来看看 React 中的 Reconcilation 概念。React 官方博文里有一篇专门介绍 Reconcilation:

https://reactjs.org/docs/reconciliation.html

文章的最后，Reconcilation 描述为一种具体的实现细节：
>It is important to remember that the reconciliation algorithm is an implementation detail.



## reconciler 工作机制

### render

它是如何渲染的？渲染出来的是什么，虚拟 DOM 还是真实 DOM？虚拟 DOM 和真实 DOM 之间的关系是什么？

### reconciler 和 dom 的关系

### reconciler 与生命周期