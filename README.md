# 接入流程

对于音量和音调的计算，是基于C++编写的，所以我们需要将他们转成wasm

## 参考链接

- [微信小程序WXWebAssembly文档](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/wasm.html)

- [WebAssembly官网](https://webassembly.org/getting-started/developers-guide/)

- [C to WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly/C_to_Wasm)

## C转Wasm

按照[MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/C_to_Wasm)上的提示，我们可以得到三个文件

1. html
2. js
3. wasm

其中html是使用js的演示页面，js是胶水代码，wasm就是浏览器识别的二进制代码，我们主要是使用胶水代码去调用wasm。

在小程序中也是这样

## 接入小程序

从代码可以看到，我们声明了小程序中的workers，但是我们没有使用，我们是将胶水代码放在了index页面上。将main.wasm放在了workers目录外面，为什么放在外面？

> 在 Worker 内使用 WXWebAssembly 时，.wasm 文件需要放置在 worker 目录外，因为 worker 目录只会打包 .js 文件，非 .js 文件会被忽略

## 修改胶水代码 main.js

emscripten编译出来的js胶水代码是适应浏览器使用的，如果我们的宿主环境是小程序，我们需要对胶水代码做一些调整。

主要几个点：

1. 使用 WXWebAssembly 代替 WebAssembly
2. wasm文件的加载方式调整
3. 不支持的方法调整

可以看控制台报错，调整。最后需要在我们的胶水代码js中暴露出模块，供小程序的js使用

```js
module.exports = {
  Module: Module
}
```

可参考文章：

- [在微信小程序中使用 WebAssembly 调用 OpenCV](https://gsj987.github.io/posts/webassembly-in-wechat/)
- [C/C++转WebAssembly及微信小程序调用](https://blog.csdn.net/qq_29517595/article/details/135292114)
- [C/C++语言转WebAssembly篇（一）](https://blog.csdn.net/A123638/article/details/123890287)

## 具体的调用

调用代码可以看`index.js`中的`RM.onFrameRecorded`回调

关键点就是，利用C代码暴露出了一些转化音频数据的方法，然后利用指针的方式提供wasm调用，这里需要注意的是对内存的分配。

C代码和编译过后的结果代码可以看webassembly文件夹
