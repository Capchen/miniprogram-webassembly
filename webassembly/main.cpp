// src/main.cpp
#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
#include <fftw3.h>

#include <emscripten/emscripten.h>
#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

double calculateRMS(const std::vector<double>& audio) {
    double sumSquare = 0.0;
    double sampleVal;
    for (auto & sampleVal:audio) {
        sumSquare += sampleVal * sampleVal;
    }
    return sampleVal;
}

void spectralSubtraction(std::vector<double>& audio, double noiseThreshold = 0.1) {
    int N = audio.size();
    fftw_complex* in, * out;
    fftw_plan p;

    in = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * N);
    out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * N);

    // Copy audio data to FFTW input
    for (int i = 0; i < N; ++i) {
        in[i][0] = audio[i];
        in[i][1] = 0.0;
    }

    // Perform FFT
    p = fftw_plan_dft_1d(N, in, out, FFTW_FORWARD, FFTW_ESTIMATE);
    fftw_execute(p);

    // Spectral subtraction
    for (int i = 0; i < N; ++i) {
        double magnitude = sqrt(out[i][0] * out[i][0] + out[i][1] * out[i][1]);
        double phase = atan2(out[i][1], out[i][0]);
        magnitude = std::max(0.0, magnitude - noiseThreshold);
        out[i][0] = magnitude * cos(phase);
        out[i][1] = magnitude * sin(phase);
    }

    // Perform inverse FFT
    p = fftw_plan_dft_1d(N, out, in, FFTW_BACKWARD, FFTW_ESTIMATE);
    fftw_execute(p);

    // Copy FFTW output to audio data
    for (int i = 0; i < N; ++i) {
        audio[i] = in[i][0] / N;
    }

    fftw_destroy_plan(p);
    fftw_free(in);
    fftw_free(out);
}


void differenceFunction(const std::vector<float>& audio, std::vector<float>& diff) {
    int N = 1400;
    diff.resize(N / 2, 0.0);
    for (int tau = 0; tau < N / 2; ++tau) {
        for (int j = 0; j < N / 2; ++j) {
            diff[tau] += std::pow(audio[j] - audio[j + tau], 2);
        }
    }
}

// 计算累积均值归一化差异函数
void cumulativeMeanNormalizedDifferenceFunction(std::vector<float>& diff) {
    int N = diff.size();
    diff[0] = 1;
    double runningSum = 0.0;
    for (int tau = 1; tau < N; ++tau) {
        runningSum += diff[tau];
        diff[tau] *= tau / runningSum;
    }
}

// 使用绝对阈值获取音调周期
int absoluteThreshold(const std::vector<float>& diff, double threshold = 0.1) {
    int minTau = 1;  // 从1开始，因为diff[0]通常不代表音调周期
    double minValue = diff[minTau];
    for (int tau = 50; tau < diff.size(); ++tau) {
        if (diff[tau] < minValue) {
            minTau = tau;
            minValue = diff[tau];
        }
    }
    return minTau;
}

void printVector(const std::vector<float>& vec) {
    std::cout << "Vector contents: ";
    for (float val : vec) {
        std::cout << val << " ";
    }
    std::cout << std::endl;
}

// 使用抛物线插值微调音调周期
double parabolicInterpolation(const std::vector<float>& diff, int tauEstimate) {
    if (tauEstimate <= 0 || tauEstimate >= diff.size() - 1) {
        return tauEstimate;
    }
    double s0 = diff[tauEstimate - 1];
    double s1 = diff[tauEstimate];
    double s2 = diff[tauEstimate + 1];
    return tauEstimate + 0.5 * (s0 - s2) / (s0 - 2 * s1 + s2);
}

double getMedian(std::vector<double>& nums) {
  std::sort(nums.begin(), nums.end());
  int n1 = nums.size()/2;
  int n2 = nums.size() * 47 / 70;
  std::cout <<"half:"<< n1<<" median:" << n2 << std::endl;
  return nums[n2];
  //return (nums[n1]+nums[n2])/2;
}

// YIN算法主函数
EXTERN EMSCRIPTEN_KEEPALIVE double yinPitchEstimation(float* audioPtr, int length, double sampleRate) {
  int segment_length = 10000;
  int num_segments = length / segment_length - 1;

  double pitch=0;
  std::vector<float> diff;
  std::vector<double> pitches;

  try {
    for (int i = 0; i < num_segments; i = i + 2) {
      std::vector<float> audio(audioPtr + i * segment_length, audioPtr + i * segment_length + segment_length);


      differenceFunction(audio, diff);
      cumulativeMeanNormalizedDifferenceFunction(diff);

      int tauEstimate = absoluteThreshold(diff, 0.5);

      if (tauEstimate < 0) {
        return -1;
      }

      double betterTau = parabolicInterpolation(diff, tauEstimate);
      pitch = sampleRate / betterTau;

      if (pitch < 700 and pitch > 80) {
        pitches.push_back(pitch);
      }
    }
    if (pitches.size() > 2) {
      pitch = getMedian(pitches);
    }
    else {
      pitch = 0;
    }
  }catch(...) {
    pitch = 0;
  }

  return pitch;
}

double getVolumeMean(std::vector<double>& nums) {
  std::sort(nums.begin(), nums.end());
  int n1 = nums.size() * 0.95;
  int n2 = nums.size() * 0.955;
  int n3 = nums.size() * 0.965;
  double v =    61.743199941304844 + -14.9631666 *nums[n1] + 15.43081662 * nums[n2] + 0.36531984 * nums[n3];
  if (v < 65) {
    v = v - (65 - v);
  }
  return v;
}


EXTERN EMSCRIPTEN_KEEPALIVE double calculateIntensity(float* audioPtr, int length) {
    int frame_length = 256;
    int hop_length = 400;
    std::vector<float> audio_data(audioPtr, audioPtr + length);
    int num_frames = 1 + (audio_data.size() - frame_length) / hop_length;
    std::vector<double> intensity_db(num_frames);

    fftw_complex* in, * out;
    fftw_plan p;

    in = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * frame_length);
    out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * frame_length);

    for (int i = 0; i < num_frames; ++i) {
        // Copy frame to FFTW input
        for (int j = 0; j < frame_length; ++j) {
            int idx = i * hop_length + j;
            in[j][0] = (idx < audio_data.size()) ? audio_data[idx] : 0.0;  // Zero-padding
            in[j][1] = 0.0;
        }

        // Perform FFT
        p = fftw_plan_dft_1d(frame_length, in, out, FFTW_FORWARD, FFTW_ESTIMATE);
        fftw_execute(p);

        // Calculate energy
        double energy = 0.0;
        for (int j = 0; j < frame_length; ++j) {
            energy += out[j][0] * out[j][0] + out[j][1] * out[j][1];
        }

        // Convert to intensity (dB)
        intensity_db[i] = 10 * log10(energy / frame_length + std::numeric_limits<double>::epsilon());
        //intensity_db[i] = energy / frame_length + std::numeric_limits<double>::epsilon();
    }

    fftw_destroy_plan(p);
    fftw_free(in);
    fftw_free(out);

    return getVolumeMean(intensity_db);
}

int main() {
    // std::cout << "Hello, WebAssembly!" << std::endl;
    // std::vector<double> segment;
    // double sample_rate = 44100;
    // auto volume = yinPitchEstimation(segment, sample_rate);
    // auto pitch = yinPitchEstimation(segment, sample_rate);
    // return 0;
}
