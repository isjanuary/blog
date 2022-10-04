vue 响应式

vue 会遍历 data 里的成员，通过 Object.defineProperty 转化为 getter/setter，这是 vue 响应式能力最基础的来源。Object.defineProperty 也是 es5 里面无法 shim 的特性，因此 vue 不支持 IE8 以下的浏览器

js 加载是阻塞的，css 加载是非阻塞的

base64 的图片真的比正常 load 图片要快吗？什么情况下 base64 数据的加载速度比正常图片要慢？

base64 字体具体又是什么原理？base64 实际上是编码映射, 将一段连续的二进制数据, 按每 6 个比特位作为一个单元, 重新映射到 base64 字符集中的一个字符. 一个 base64 字符集共有 64 个字符，由 26 个大写字母，26 个小写字母，以及其他 12 个 ASCII 码固定构成，有 =/ 啥的。所以一段 3 字节的数据，可以映射成 4 位 base64 编码. 3 * 8 = 4 * 6 
