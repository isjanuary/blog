代码版本:  Vue 2.6.12

代码入口:  从 package.json 开始入手，显然，打包流程在 build 这个脚本 "build": "node scripts/build.js”，通过 build.js 文件一路追索，不难发现 Vue 的代码入口在 src/core/index.js，其实看多了也能猜到，具体调用过程不贴了，大家可以从脚本自行入手，直接进入正题

什么是 Vue 的 Mixin ?

[Vue.js 揭秘](https://ustbhuangyi.github.io/vue-analysis/v2/prepare/)

生命周期

数据

状态 包括 data/watch/computed 这几个数据来源

