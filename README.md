# css-flat-loader

## CSS Flat

CSS Flat（CSS 扁平化）是一种模块化解决方案，基于Post CSS生态开发。

主要解决问题：
1. 达到模块化CSS的能力
2. 解决由于业务的持续迭代，导致的CSS样式文件的线性增长问题（CSS Modules尤其明显）

CSS Flat 将CSS样式格式化为单条样式，开发时只需要按照正常文件书写：

```css
.className {
    display: block;
    color: red;
    margin: 0 auto;
}
.className:hover {
    color: green;
    magin-top: 10px;
}
```
Flat化之后：
```css
.a-d-b {
    display: block;
}
.a-c-1 {
    color: red;
}
.a-m-2 {
    margin: 0 auto;
} 
.a-c_h-3:hover {
    color: green;
}
.css-flat .a-mt_h-4:hover {
    margin-top: 10px;
}
```
当你在js文件中 import CSS Flat文件时，会export一个对象，该对象包含Flat化之后
的信息（className: newClassNames）:

```js
import styles from "./style.css"; // { classNames: 'a-d-b a-c-1 a-m-2 a-c_h-3 a-mt_h-4 '}
// import { className } from "./style.css";

element.innerHTML = '<div class="' + styles.className + '">';
```

### 原则

1. 仅处理单层类选择器

```css
/* 不支持 */
.main.home-main {}
.main .title {}
.main span {}
#main {}
```
2. 简写权重小于非简写权重
3. 媒体查询权重大于普通样式，不同条件的媒体查询权重需自行配置

### 使用方法
```bash
 npm install --save-dev css-flat-loader
```
目前依赖在CSS Modules的基础上来判断是否需要Flat话，后续会独立出来，详见demo
```js
{
    test: /\.less$/,
    // loader: "style-loader!css-flat-loader!css-loader?modules!less-loader",
    loader: ExtractTextPlugin.extract("css-flat-loader!css?modules&localIdentName=_[local]_!less")
},
```

### API

```js
// 配置文件css-flat.config.js
module.exports = {
  plugins: [
    require('precss')(),
    require('autoprefixer')(),
  ]
}
```
注：对于px2rem, autoprefixer等推荐在css-flat.config.js的plugins中配置

flat后的样式公式如下：

```text
    .htmlClass*n .prefix-declProp(_(pseudo)(_atRule))-declValue {}
```
1. htmlClass 根节点类名，用来增加权重，如margin-top的权重大于margin，n为'-'的个数
2. 当atRule存在，但无伪类时，pseudo为空字符，但下划线(_)保留，避免冲突
3. 当提供的map映射无相关属性时，脚本会自动从1自增分配，所以如需自定义提供map，不要提供数字，以免冲突

|    属性    | 类型 | 默认值 | 描述 |
| ---------- | --- | --- | --- |
|**`htmlClass`**|`{string}`|`'css-flat'`|根节点类名，请自行在html标签上添加|
|**`prefix`**|`{string}`|`'a'`|类名前缀|
|**`declPropMap`**|`{Object}`|见[属性映射](https://github.com/tangjinzhou/css-flat-loader/blob/master/src/declPropMap.js)|属性映射|
|**`pseudoMap`**|`{Object}`|见[伪类映射](https://github.com/tangjinzhou/css-flat-loader/blob/master/src/pseudoMap.js)|伪类映射|
|**`atRules`**|`{Array}`|`[]`|@规则的映射，如@media等，数组顺序代表权重|
|**`declValueMap`**|`{Object}`|见[值映射](https://github.com/tangjinzhou/css-flat-loader/blob/master/src/declValueMap.js)|值映射|
|**`plugins`**|`{Array}`|`[]`|插件|
|**`sourceMap`**|`{Bool}`|`false`|sourceMap为true时，会保留css modules hash之后的类，但属性会改变成`--sourceMap-xxx`, 间接达到sourceMap的功能|

### 更多
对于一些大型webview APP可按照规则容器内置通用common.css, 上线时做一次diff，仅需线上加载common.css不包含的CSS，
进一步降低样式文件，提升加载速度。

## 疑惑
1. css文件减少，那html或js文件增大了
答：没错，这是肯定的，不过不知你是否注意到，当你打开浏览器控制台查看元素，发现在元素上生效的样式并没有那么多条，更多的是层层覆盖。
      针对该问题做了如下优化：
      1. 扁平化之前会使用cssnano进行合并
      2. 扁平化之后处理prefixer
      3. 规则尽可能简短
      4. 经过扁平化处理后注入到js中的也仅仅是一个对象，标签上也只是个对象值的引用

2. DOM节点的操作
答：经过处理后的类名是不具有可读性的，如果你使用的是react，那么也没必要操作dom，类名的可读性不再那么重要。如果你依然有操作dom的需求，你可以在模板中自行写类名。

3. sourceMap
答：这块的确不是特别好搞，目前的方案是开启sourceMap后，会保留css-modules hash后的类名，并将该类名下的样式自定义化使其不生效（如：--sourceMap-color: red），用于定位当前节点样式源文件的位置，基本可以满足需求。

4. 简写和非简写的处理
答：优先使用cssnona进行合并，合并不了的遵循以下规则：非简写权重大于简写
      如margin-top 会被处理成 .css-flat .xxx {margin-top: ...}
         border-top-left-radius 会被处理成 .css-flat.css-flat.css-falt  .xxx {margin-top: ...}
  所以你需要在html根节点上手动添加css-flat类名(可自定义)
  对于媒体查询规则类似，只是权重可自定义，更加灵活

5. 不支持嵌套，只支持类
答：对，该方案的核心思想就是扁平化处理css，对于嵌套我们不推荐，也不支持，如果你的项目已经组件化处理，单个组件的模板不会太大，也不应该太大，非嵌套的类方式不管从项目的后期可维护性上，还是浏览器的渲染上，都是利大于弊的。

6. 样式合并 如style.button + style.disabled
答：推荐使用less如下方式：
```css
.button{
} 
.button-diabled{
  .button()
}
```
 
因扁平化处理后的样式顺序改变不应该影响最终的渲染结果，所以单个html标签上的类名不应该出现相同属性的样式，直接使用style.button + style.disabled的方式是不安全的。
细心的朋友可能已经注意到我们的规则.prefix-declProp(_(pseudo)(_atRule))-declValue {} 既有-又有_ 这两种分隔符，这里就是预留给处理相同属性的，你可以自己处理declProp(_(pseudo)(_atRule))相同的部分。

### 存在的问题

因开发中要支持样式文件的按需加载及热更新，无法过滤浏览器中已加载的样式，会很多重复的样式，在控制台中看着很不爽。上线时还需自行添加plugin处理重复样式。




