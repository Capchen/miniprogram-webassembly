// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const dayjs = require('dayjs');

const wasm = require('./main.js')
let module = null

Page({
  data: {
    msg: 'Hello World',
    record: '开始录音',
  },

  onReady: function () {
    module = wasm.Module
  },

  startRecord() {
    const globalData = getApp().globalData
    if (this.data.record === '录音中') {
      globalData.RM.stop()
      this.setData({
        msg: '已停止录音',
        record: '开始录音'
      })
      return
    }
    const RM = wx.getRecorderManager()
    const audioCtx = wx.createWebAudioContext()
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    globalData.RM = RM
    RM.start({
      duration: 10000,
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 64000,
      format: 'mp3',
      frameSize: 10,
    })
    this.setData({
      msg: 'Recording...',
      record: '录音中'
    })

    RM.onFrameRecorded((res) => {
      try {
        const buffer = res.frameBuffer
        if (buffer) {
          audioCtx.decodeAudioData(
            buffer,
            function (res) {
              const float32Array = res.getChannelData(0);
              console.log('decodeAudioData success', float32Array)
              if (module.onRuntimeInitialized) {
                console.log('Module.onRuntimeInitialized', module.onRuntimeInitialized)
                // module.onRuntimeInitialized = () => {
                //   runYinPitchEstimation(float32Array, res.sampleRate);
                // };
              } else {
                try {
                  // Get the reference to the function
                  const yinPitchEstimation = module.cwrap('yinPitchEstimation', 'number', ['number', 'number']);
                  const calculateIntensity = module.cwrap('calculateIntensity', 'number', ['number', 'number']);
                  // Allocate memory in WebAssembly heap
                  const numBytes = float32Array.length * float32Array.BYTES_PER_ELEMENT;
                  const inputPtr = module._malloc(numBytes);

                  console.log({ float32Array, numBytes, numMBytes: `${numBytes / 1024 / 1024}M` });

                  module.HEAPF32.set(float32Array, inputPtr / float32Array.BYTES_PER_ELEMENT);
                  const pitch = yinPitchEstimation(inputPtr, float32Array.length, 44100);
                  const vol = calculateIntensity(inputPtr, float32Array.length);
                  console.log({ pitch, vol})

                  // Free the allocated memory
                  module._free(inputPtr);
                } catch (error) {
                  console.log(error)
                }
              }
            },
            function (res) {
              console.log('decodeAudioData fail', module)
            }
          )
        }
      } catch (error) {
        console.log(error)
      }
    })
  },
  runYinPitchEstimation(float32Array, sampleRate) {
    // Get the reference to the function
    const yinPitchEstimation = module.cwrap('yinPitchEstimation', 'number', ['number', 'number']);

    // Allocate memory in WebAssembly heap
    const numBytes = float32Array.length * float32Array.BYTES_PER_ELEMENT;
    const inputPtr = module._malloc(numBytes);

    console.log({ float32Array, numBytes, numMBytes: `${numBytes / 1024 / 1024}M` });

    module.HEAPF32.set(float32Array, inputPtr / float32Array.BYTES_PER_ELEMENT);
    console.time('yinPitchEstimation')
    const pitch = yinPitchEstimation(inputPtr, float32Array.length, sampleRate);
    console.timeEnd('yinPitchEstimation')

    console.log({ pitch })

    // Free the allocated memory
    module._free(inputPtr);
  },
  runCalculateIntensity(float32Array, sampleRate) {
    // Get the reference to the function
    const calculateIntensity = this.Module.cwrap('calculateIntensity', 'number', ['number', 'number']);

    // Allocate memory in WebAssembly heap
    const numBytes = float32Array.length * float32Array.BYTES_PER_ELEMENT;
    const inputPtr = this.Module._malloc(numBytes);

    console.log({ float32Array, numBytes, numMBytes: `${numBytes / 1024 / 1024}M` });

    this.Module.HEAPF32.set(float32Array, inputPtr / float32Array.BYTES_PER_ELEMENT);

    console.time('calculateIntensity')
    const volumn = calculateIntensity(inputPtr, float32Array.length);
    console.timeEnd('calculateIntensity')

    console.log({ volumn })

    // Free the allocated memory
    this.Module._free(inputPtr);
  },
})
