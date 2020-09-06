react 源码学习记录

目标：

* react 源码的目录结构
	* v15.4.2 前与 v16.3.1 后
* Component 与 Element
	* PureComponent/functional Component/class component
	* 基础 API createElement/createClass/clone 等等方法的实现原理，与 virtual DOM 的关系
* state 的工作机制
	* 不同生命周期状态下，state 的存续及状态
	* 引入 fiber 的 state 与之前 state(vxx < v16) 的工作差异
	* setState 如何工作，何时执行更新(多次 enqueue，一次批量执行的工作原理)
	* state 是如何更新的
	* setState 一定触发组件的更新吗？
* 生命周期
	* v16.3 引入的两个新的生命周期钩子函数
	* 引入 fiber 之后的生命周期与之前生命周期的差异
	* componentDidMount 与 componentDidUpdate 里调用 setState 发生了什么，为什么一定要做延时
* v16.3
	* 两个新的生命周期钩子函数(见生命周期)
	* 新的 contextAPI 的实现
* virtual DOM
	* 如何实现？
	* 引入 fiber 前后的 virtualDOM 差异
	* 扩展: react-virtualized
* diff 算法
	* 实现原理
	* 代码
* 性能优化
	* shouldComponentUpdate 优化原理，应用场景
	* fiber 机制的优化原理
	* 如何利用新的 fiber 机制做优化？
	* lazyLoading
* reconciler
	* v16 之前与 fiber 的差异
* 渲染机制
* react 中的 memoization 技术
https://en.wikipedia.org/wiki/Memoization

fiber 之前的源码我们主要用的是 15.4.2，fiber 之后的代码我们用的是 16.5.0