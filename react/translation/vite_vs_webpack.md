这是一篇译文，主要比较 vite 和 webpack 两者在构建方式、构建效率、应用场景等诸多方面的异同点，这是[原文地址](https://kinsta.com/blog/vite-vs-webpack/)

# Vite vs. Webpack. 两者异同点

在现代前端动态变化的本质中，我们必须要记住`老的`(原文为 _old_)并不代表`过时的`(原文为 _outdated_)，而`新的`(原文为 _new_)也并不总是意味着`更好`(原文为 _better_)

选择正确技术的关键是它是不是能符合你项目的需求，这条原则在你研究 Javascript 打包工具的时候影响甚大。无论一个打包工具是经过了时间的检验，还是新出的，它们各自都有优势和局限。

这篇文章主要研究两个很重要的流行工具：Vite 和 Webpack。我们基于它们各自的特性、差异点、设计哲学，以及它们是如何集成进开发生态的这几个方面来评价它们

目录

- 什么是 Javascript 模块打包工具？(Javascript Module Bundler)
- Vite 与 Webpack：介绍与概览
- 两者异同点

### 什么是 Javascript 模块打包工具？(Javascript Module Bundler)

Javascript 打包工具(原文为 _bundler_) 是用来把多个 JS 文件组合成一个单一的文件的，这个单一的文件就是我们常说的 bundle。它通过减少你的 web 应用需要发出的请求数(通常是加载页面所需的资源数量，如 js/css/本地图片等，译者注)，以简化 JS 代码管理，以最终提升性能

举个栗子，假设我们有 2 个独立的 JS 文件：`module1.js` 和 `modules2.js`。

`module1.js` 如下：
```javascript
// module1.js
export const greet = (name) => {
    console.log(`Hello, ${name}!`);
}
```

`module2.js` 如下：
```javascript
// module2.js
export const farewell = (name) => {
    console.log(`Goodbye, ${name}!`);
}
```

为了把这两个文件打包成一个文件，你可以使用以下的打包工具，比如 Rollup、Webpack 或者 Parcel 之类的。具体来讲，如果你打算创建一个叫 `index.js` 的文件，如下所示：

```javascript
// index.js
import { greet } from './module1.js';
import { farewell } from './module2.js';

greet('Kinsta');
farewell('Server Troubles');
```

那么当使用打包工具的时候，它把 `module1.js`、`module2.js` 以及 `index.js` 合并起来，放进一个单独的、优化过的 bundle，这个 bundle 会根据 web 应用使用它们的方式进行裁剪

随着现代 web 浏览器开始支持 ES modules 和 HTTP/2 这些技术，也带来了请求开销逐步增加的焦虑，JS 打包工具在实现代码增强方面正在变得不可或缺。这些打包工具会执行必要的代码转换工作，包含代码的压缩简化、转化与优化工作

而且，JS 模块打包工具确保了不同浏览器的兼容性，它们帮助解决了不同浏览器的特定问题，并且无论用户选择了哪款浏览器，都保证了一致性的用户体验(bundler 应该只是解决了代码转换的部分，浏览器各自的 API 特性还是要专门解决，译者注)

这个打包的流程不只加快了 web 应用的加载时间，也保证了性能，特别是在生产环境的性能。现在你已经对 JS 打包工具以及它在 web 开发中的角色有了基本的认识，接下来我们把焦点转向 Vite 和 Webpack

### Vite 与 Webpack：介绍与概览



### 两者异同点
