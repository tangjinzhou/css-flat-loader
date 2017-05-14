# css-flat-loader

## CSS Flat

CSS Flat（CSS 扁平化）是一种模块化解决方案，基于Post CSS生态开发。
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
.a-c_h-3 {
    color: green;
}
.css-flat .a-mt_h-4 {
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
目前依赖在CSS Modules的基础上来判断是否需要Flat话，后续会独立出来，详见demo

### API




