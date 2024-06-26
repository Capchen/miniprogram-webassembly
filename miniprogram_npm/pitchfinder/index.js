module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1718767165056, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
var yin_1 = require("./detectors/yin");
exports.YIN = yin_1.YIN;
var amdf_1 = require("./detectors/amdf");
exports.AMDF = amdf_1.AMDF;
var acf2plus_1 = require("./detectors/acf2plus");
exports.ACF2PLUS = acf2plus_1.ACF2PLUS;
var dynamic_wavelet_1 = require("./detectors/dynamic_wavelet");
exports.DynamicWavelet = dynamic_wavelet_1.DynamicWavelet;
var macleod_1 = require("./detectors/macleod");
exports.Macleod = macleod_1.Macleod;
var frequencies_1 = require("./tools/frequencies");
exports.frequencies = frequencies_1.frequencies;
exports.default = {
    YIN: yin_1.YIN,
    AMDF: amdf_1.AMDF,
    ACF2PLUS: acf2plus_1.ACF2PLUS,
    DynamicWavelet: dynamic_wavelet_1.DynamicWavelet,
    Macleod: macleod_1.Macleod,
    frequencies: frequencies_1.frequencies,
};

}, function(modId) {var map = {"./detectors/yin":1718767165057,"./detectors/amdf":1718767165058,"./detectors/acf2plus":1718767165059,"./detectors/dynamic_wavelet":1718767165060,"./detectors/macleod":1718767165061,"./tools/frequencies":1718767165062}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1718767165057, function(require, module, exports) {

/*
  Copyright (C) 2003-2009 Paul Brossier <piem@aubio.org>
  This file is part of aubio.
  aubio is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  aubio is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  You should have received a copy of the GNU General Public License
  along with aubio.  If not, see <http://www.gnu.org/licenses/>.
*/
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var DEFAULT_YIN_PARAMS = {
    threshold: 0.1,
    sampleRate: 44100,
    probabilityThreshold: 0.1,
};
function YIN(params) {
    if (params === void 0) { params = {}; }
    var config = __assign(__assign({}, DEFAULT_YIN_PARAMS), params);
    var threshold = config.threshold, sampleRate = config.sampleRate, probabilityThreshold = config.probabilityThreshold;
    return function YINDetector(float32AudioBuffer) {
        // Set buffer size to the highest power of two below the provided buffer's length.
        var bufferSize;
        for (bufferSize = 1; bufferSize < float32AudioBuffer.length; bufferSize *= 2)
            ;
        bufferSize /= 2;
        // Set up the yinBuffer as described in step one of the YIN paper.
        var yinBufferLength = bufferSize / 2;
        var yinBuffer = new Float32Array(yinBufferLength);
        var probability = 0, tau;
        // Compute the difference function as described in step 2 of the YIN paper.
        for (var t = 0; t < yinBufferLength; t++) {
            yinBuffer[t] = 0;
        }
        for (var t = 1; t < yinBufferLength; t++) {
            for (var i = 0; i < yinBufferLength; i++) {
                var delta = float32AudioBuffer[i] - float32AudioBuffer[i + t];
                yinBuffer[t] += delta * delta;
            }
        }
        // Compute the cumulative mean normalized difference as described in step 3 of the paper.
        yinBuffer[0] = 1;
        yinBuffer[1] = 1;
        var runningSum = 0;
        for (var t = 1; t < yinBufferLength; t++) {
            runningSum += yinBuffer[t];
            yinBuffer[t] *= t / runningSum;
        }
        // Compute the absolute threshold as described in step 4 of the paper.
        // Since the first two positions in the array are 1,
        // we can start at the third position.
        for (tau = 2; tau < yinBufferLength; tau++) {
            if (yinBuffer[tau] < threshold) {
                while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
                    tau++;
                }
                // found tau, exit loop and return
                // store the probability
                // From the YIN paper: The threshold determines the list of
                // candidates admitted to the set, and can be interpreted as the
                // proportion of aperiodic power tolerated
                // within a periodic signal.
                //
                // Since we want the periodicity and and not aperiodicity:
                // periodicity = 1 - aperiodicity
                probability = 1 - yinBuffer[tau];
                break;
            }
        }
        // if no pitch found, return null.
        if (tau === yinBufferLength || yinBuffer[tau] >= threshold) {
            return null;
        }
        // If probability too low, return -1.
        if (probability < probabilityThreshold) {
            return null;
        }
        /**
         * Implements step 5 of the AUBIO_YIN paper. It refines the estimated tau
         * value using parabolic interpolation. This is needed to detect higher
         * frequencies more precisely. See http://fizyka.umk.pl/nrbook/c10-2.pdf and
         * for more background
         * http://fedc.wiwi.hu-berlin.de/xplore/tutorials/xegbohtmlnode62.html
         */
        var betterTau, x0, x2;
        if (tau < 1) {
            x0 = tau;
        }
        else {
            x0 = tau - 1;
        }
        if (tau + 1 < yinBufferLength) {
            x2 = tau + 1;
        }
        else {
            x2 = tau;
        }
        if (x0 === tau) {
            if (yinBuffer[tau] <= yinBuffer[x2]) {
                betterTau = tau;
            }
            else {
                betterTau = x2;
            }
        }
        else if (x2 === tau) {
            if (yinBuffer[tau] <= yinBuffer[x0]) {
                betterTau = tau;
            }
            else {
                betterTau = x0;
            }
        }
        else {
            var s0 = yinBuffer[x0];
            var s1 = yinBuffer[tau];
            var s2 = yinBuffer[x2];
            // fixed AUBIO implementation, thanks to Karl Helgason:
            // (2.0f * s1 - s2 - s0) was incorrectly multiplied with -1
            betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        return sampleRate / betterTau;
    };
}
exports.YIN = YIN;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1718767165058, function(require, module, exports) {

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var DEFAULT_AMDF_PARAMS = {
    sampleRate: 44100,
    minFrequency: 82,
    maxFrequency: 1000,
    ratio: 5,
    sensitivity: 0.1,
};
function AMDF(params) {
    if (params === void 0) { params = {}; }
    var config = __assign(__assign({}, DEFAULT_AMDF_PARAMS), params);
    var sampleRate = config.sampleRate;
    var minFrequency = config.minFrequency;
    var maxFrequency = config.maxFrequency;
    var sensitivity = config.sensitivity;
    var ratio = config.ratio;
    var amd = [];
    /* Round in such a way that both exact minPeriod as
     exact maxPeriod lie inside the rounded span minPeriod-maxPeriod,
     thus ensuring that minFrequency and maxFrequency can be found
     even in edge cases */
    var maxPeriod = Math.ceil(sampleRate / minFrequency);
    var minPeriod = Math.floor(sampleRate / maxFrequency);
    return function AMDFDetector(float32AudioBuffer) {
        var maxShift = float32AudioBuffer.length;
        var t = 0;
        var minval = Infinity;
        var maxval = -Infinity;
        var frames1, frames2, calcSub, i, j, u, aux1, aux2;
        // Find the average magnitude difference for each possible period offset.
        for (i = 0; i < maxShift; i++) {
            if (minPeriod <= i && i <= maxPeriod) {
                for (aux1 = 0, aux2 = i, t = 0, frames1 = [], frames2 = []; aux1 < maxShift - i; t++, aux2++, aux1++) {
                    frames1[t] = float32AudioBuffer[aux1];
                    frames2[t] = float32AudioBuffer[aux2];
                }
                // Take the difference between these frames.
                var frameLength = frames1.length;
                calcSub = [];
                for (u = 0; u < frameLength; u++) {
                    calcSub[u] = frames1[u] - frames2[u];
                }
                // Sum the differences.
                var summation = 0;
                for (u = 0; u < frameLength; u++) {
                    summation += Math.abs(calcSub[u]);
                }
                amd[i] = summation;
            }
        }
        for (j = minPeriod; j < maxPeriod; j++) {
            if (amd[j] < minval)
                minval = amd[j];
            if (amd[j] > maxval)
                maxval = amd[j];
        }
        var cutoff = Math.round(sensitivity * (maxval - minval) + minval);
        for (j = minPeriod; j <= maxPeriod && amd[j] > cutoff; j++)
            ;
        var searchLength = minPeriod / 2;
        minval = amd[j];
        var minpos = j;
        for (i = j - 1; i < j + searchLength && i <= maxPeriod; i++) {
            if (amd[i] < minval) {
                minval = amd[i];
                minpos = i;
            }
        }
        if (Math.round(amd[minpos] * ratio) < maxval) {
            return sampleRate / minpos;
        }
        else {
            return null;
        }
    };
}
exports.AMDF = AMDF;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1718767165059, function(require, module, exports) {

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var DEFAULT_PARAMS = {
    sampleRate: 44100,
};
function ACF2PLUS(params) {
    if (params === void 0) { params = DEFAULT_PARAMS; }
    var config = __assign(__assign({}, DEFAULT_PARAMS), params);
    var sampleRate = config.sampleRate;
    // Implements the ACF2+ algorithm
    return function ACF2PLUSDetector(float32AudioBuffer) {
        var maxShift = float32AudioBuffer.length;
        var rms = 0;
        var i, j, u, tmp;
        for (i = 0; i < maxShift; i++) {
            tmp = float32AudioBuffer[i];
            rms += tmp * tmp;
        }
        rms = Math.sqrt(rms / maxShift);
        if (rms < 0.01)
            // not enough signal
            return -1;
        /* Trimming cuts the edges of the signal so that it starts and ends near zero.
         This is used to neutralize an inherent instability of the ACF version I use.*/
        var aux1 = 0;
        var aux2 = maxShift - 1;
        var thres = 0.2;
        for (i = 0; i < maxShift / 2; i++)
            if (Math.abs(float32AudioBuffer[i]) < thres) {
                aux1 = i;
                break;
            }
        for (i = 1; i < maxShift / 2; i++)
            if (Math.abs(float32AudioBuffer[maxShift - i]) < thres) {
                aux2 = maxShift - i;
                break;
            }
        var frames = float32AudioBuffer.slice(aux1, aux2);
        var framesLength = frames.length;
        var calcSub = new Array(framesLength).fill(0);
        for (i = 0; i < framesLength; i++)
            for (j = 0; j < framesLength - i; j++)
                calcSub[i] = calcSub[i] + frames[j] * frames[j + i];
        u = 0;
        while (calcSub[u] > calcSub[u + 1])
            u++;
        var maxval = -1, maxpos = -1;
        for (i = u; i < framesLength; i++) {
            if (calcSub[i] > maxval) {
                maxval = calcSub[i];
                maxpos = i;
            }
        }
        var T0 = maxpos;
        /* Interpolation is parabolic interpolation. It helps with precision.
         We suppose that a parabola pass through the three points that comprise the peak.
         'a' and 'b' are the unknowns from the linear equation system
         and b/(2a) is the "error" in the abscissa.
         y1,y2,y3 are the ordinates.*/
        var y1 = calcSub[T0 - 1], y2 = calcSub[T0], y3 = calcSub[T0 + 1];
        var a = (y1 + y3 - 2 * y2) / 2;
        var b = (y3 - y1) / 2;
        if (a)
            T0 = T0 - b / (2 * a);
        return sampleRate / T0;
    };
}
exports.ACF2PLUS = ACF2PLUS;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1718767165060, function(require, module, exports) {

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var MAX_FLWT_LEVELS = 6;
var MAX_F = 3000;
var DIFFERENCE_LEVELS_N = 3;
var MAXIMA_THRESHOLD_RATIO = 0.75;
var DEFAULT_DYNAMIC_WAVELET_CONFIG = {
    sampleRate: 44100,
};
function DynamicWavelet(params) {
    if (params === void 0) { params = {}; }
    var config = __assign(__assign({}, DEFAULT_DYNAMIC_WAVELET_CONFIG), params);
    var sampleRate = config.sampleRate;
    return function DynamicWaveletDetector(float32AudioBuffer) {
        var mins = [];
        var maxs = [];
        var bufferLength = float32AudioBuffer.length;
        var freq = null;
        var theDC = 0;
        var minValue = 0;
        var maxValue = 0;
        // Compute max amplitude, amplitude threshold, and the DC.
        for (var i = 0; i < bufferLength; i++) {
            var sample = float32AudioBuffer[i];
            theDC = theDC + sample;
            maxValue = Math.max(maxValue, sample);
            minValue = Math.min(minValue, sample);
        }
        theDC /= bufferLength;
        minValue -= theDC;
        maxValue -= theDC;
        var amplitudeMax = maxValue > -1 * minValue ? maxValue : -1 * minValue;
        var amplitudeThreshold = amplitudeMax * MAXIMA_THRESHOLD_RATIO;
        // levels, start without downsampling...
        var curLevel = 0;
        var curModeDistance = -1;
        var curSamNb = float32AudioBuffer.length;
        var delta, nbMaxs, nbMins;
        // Search:
        while (true) {
            delta = ~~(sampleRate / (Math.pow(2, curLevel) * MAX_F));
            if (curSamNb < 2)
                break;
            var dv = void 0;
            var previousDV = -1000;
            var lastMinIndex = -1000000;
            var lastMaxIndex = -1000000;
            var findMax = false;
            var findMin = false;
            nbMins = 0;
            nbMaxs = 0;
            for (var i = 2; i < curSamNb; i++) {
                var si = float32AudioBuffer[i] - theDC;
                var si1 = float32AudioBuffer[i - 1] - theDC;
                if (si1 <= 0 && si > 0)
                    findMax = true;
                if (si1 >= 0 && si < 0)
                    findMin = true;
                // min or max ?
                dv = si - si1;
                if (previousDV > -1000) {
                    if (findMin && previousDV < 0 && dv >= 0) {
                        // minimum
                        if (Math.abs(si) >= amplitudeThreshold) {
                            if (i > lastMinIndex + delta) {
                                mins[nbMins++] = i;
                                lastMinIndex = i;
                                findMin = false;
                            }
                        }
                    }
                    if (findMax && previousDV > 0 && dv <= 0) {
                        // maximum
                        if (Math.abs(si) >= amplitudeThreshold) {
                            if (i > lastMaxIndex + delta) {
                                maxs[nbMaxs++] = i;
                                lastMaxIndex = i;
                                findMax = false;
                            }
                        }
                    }
                }
                previousDV = dv;
            }
            if (nbMins === 0 && nbMaxs === 0) {
                // No best distance found!
                break;
            }
            var d = void 0;
            var distances = [];
            for (var i = 0; i < curSamNb; i++) {
                distances[i] = 0;
            }
            for (var i = 0; i < nbMins; i++) {
                for (var j = 1; j < DIFFERENCE_LEVELS_N; j++) {
                    if (i + j < nbMins) {
                        d = Math.abs(mins[i] - mins[i + j]);
                        distances[d] += 1;
                    }
                }
            }
            var bestDistance = -1;
            var bestValue = -1;
            for (var i = 0; i < curSamNb; i++) {
                var summed = 0;
                for (var j = -1 * delta; j <= delta; j++) {
                    if (i + j >= 0 && i + j < curSamNb) {
                        summed += distances[i + j];
                    }
                }
                if (summed === bestValue) {
                    if (i === 2 * bestDistance) {
                        bestDistance = i;
                    }
                }
                else if (summed > bestValue) {
                    bestValue = summed;
                    bestDistance = i;
                }
            }
            // averaging
            var distAvg = 0;
            var nbDists = 0;
            for (var j = -delta; j <= delta; j++) {
                if (bestDistance + j >= 0 && bestDistance + j < bufferLength) {
                    var nbDist = distances[bestDistance + j];
                    if (nbDist > 0) {
                        nbDists += nbDist;
                        distAvg += (bestDistance + j) * nbDist;
                    }
                }
            }
            // This is our mode distance.
            distAvg /= nbDists;
            // Continue the levels?
            if (curModeDistance > -1) {
                if (Math.abs(distAvg * 2 - curModeDistance) <= 2 * delta) {
                    // two consecutive similar mode distances : ok !
                    freq = sampleRate / (Math.pow(2, curLevel - 1) * curModeDistance);
                    break;
                }
            }
            // not similar, continue next level;
            curModeDistance = distAvg;
            curLevel++;
            if (curLevel >= MAX_FLWT_LEVELS || curSamNb < 2) {
                break;
            }
            //do not modify original audio buffer, make a copy buffer, if
            //downsampling is needed (only once).
            var newFloat32AudioBuffer = float32AudioBuffer.subarray(0);
            if (curSamNb === distances.length) {
                newFloat32AudioBuffer = new Float32Array(curSamNb / 2);
            }
            for (var i = 0; i < curSamNb / 2; i++) {
                newFloat32AudioBuffer[i] =
                    (float32AudioBuffer[2 * i] + float32AudioBuffer[2 * i + 1]) / 2;
            }
            float32AudioBuffer = newFloat32AudioBuffer;
            curSamNb /= 2;
        }
        return freq;
    };
}
exports.DynamicWavelet = DynamicWavelet;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1718767165061, function(require, module, exports) {

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var DEFAULT_MACLEOD_PARAMS = {
    bufferSize: 1024,
    cutoff: 0.97,
    sampleRate: 44100,
};
function Macleod(params) {
    if (params === void 0) { params = {}; }
    var config = __assign(__assign({}, DEFAULT_MACLEOD_PARAMS), params);
    var bufferSize = config.bufferSize, cutoff = config.cutoff, sampleRate = config.sampleRate;
    /**
     * For performance reasons, peaks below this cutoff are not even considered.
     */
    var SMALL_CUTOFF = 0.5;
    /**
     * Pitch annotations below this threshold are considered invalid, they are
     * ignored.
     */
    var LOWER_PITCH_CUTOFF = 80;
    /**
     * Contains a normalized square difference function value for each delay
     * (tau).
     */
    var nsdf = new Float32Array(bufferSize);
    /**
     * Contains a sum of squares of the Buffer, for improving performance
     * (avoids redoing math in the normalized square difference function)
     */
    var squaredBufferSum = new Float32Array(bufferSize);
    /**
     * The x and y coordinate of the top of the curve (nsdf).
     */
    var turningPointX;
    var turningPointY;
    /**
     * A list with minimum and maximum values of the nsdf curve.
     */
    var maxPositions = [];
    /**
     * A list of estimates of the period of the signal (in samples).
     */
    var periodEstimates = [];
    /**
     * A list of estimates of the amplitudes corresponding with the period
     * estimates.
     */
    var ampEstimates = [];
    /**
     * Implements the normalized square difference function. See section 4 (and
     * the explanation before) in the MPM article. This calculation can be
     * optimized by using an FFT. The results should remain the same.
     */
    function normalizedSquareDifference(float32AudioBuffer) {
        var acf;
        var divisorM;
        squaredBufferSum[0] = float32AudioBuffer[0] * float32AudioBuffer[0];
        for (var i = 1; i < float32AudioBuffer.length; i += 1) {
            squaredBufferSum[i] =
                float32AudioBuffer[i] * float32AudioBuffer[i] + squaredBufferSum[i - 1];
        }
        for (var tau = 0; tau < float32AudioBuffer.length; tau++) {
            acf = 0;
            divisorM =
                squaredBufferSum[float32AudioBuffer.length - 1 - tau] +
                    squaredBufferSum[float32AudioBuffer.length - 1] -
                    squaredBufferSum[tau];
            for (var i = 0; i < float32AudioBuffer.length - tau; i++) {
                acf += float32AudioBuffer[i] * float32AudioBuffer[i + tau];
            }
            nsdf[tau] = (2 * acf) / divisorM;
        }
    }
    /**
     * Finds the x value corresponding with the peak of a parabola.
     * Interpolates between three consecutive points centered on tau.
     */
    function parabolicInterpolation(tau) {
        var nsdfa = nsdf[tau - 1], nsdfb = nsdf[tau], nsdfc = nsdf[tau + 1], bValue = tau, bottom = nsdfc + nsdfa - 2 * nsdfb;
        if (bottom === 0) {
            turningPointX = bValue;
            turningPointY = nsdfb;
        }
        else {
            var delta = nsdfa - nsdfc;
            turningPointX = bValue + delta / (2 * bottom);
            turningPointY = nsdfb - (delta * delta) / (8 * bottom);
        }
    }
    // Finds the highest value between each pair of positive zero crossings.
    function peakPicking() {
        var pos = 0;
        var curMaxPos = 0;
        // find the first negative zero crossing.
        while (pos < (nsdf.length - 1) / 3 && nsdf[pos] > 0) {
            pos++;
        }
        // loop over all the values below zero.
        while (pos < nsdf.length - 1 && nsdf[pos] <= 0) {
            pos++;
        }
        // can happen if output[0] is NAN
        if (pos == 0) {
            pos = 1;
        }
        while (pos < nsdf.length - 1) {
            if (nsdf[pos] > nsdf[pos - 1] && nsdf[pos] >= nsdf[pos + 1]) {
                if (curMaxPos == 0) {
                    // the first max (between zero crossings)
                    curMaxPos = pos;
                }
                else if (nsdf[pos] > nsdf[curMaxPos]) {
                    // a higher max (between the zero crossings)
                    curMaxPos = pos;
                }
            }
            pos++;
            // a negative zero crossing
            if (pos < nsdf.length - 1 && nsdf[pos] <= 0) {
                // if there was a maximum add it to the list of maxima
                if (curMaxPos > 0) {
                    maxPositions.push(curMaxPos);
                    curMaxPos = 0; // clear the maximum position, so we start
                    // looking for a new ones
                }
                while (pos < nsdf.length - 1 && nsdf[pos] <= 0) {
                    pos++; // loop over all the values below zero
                }
            }
        }
        if (curMaxPos > 0) {
            maxPositions.push(curMaxPos);
        }
    }
    return function Macleod(float32AudioBuffer) {
        // 0. Clear old results.
        var pitch;
        maxPositions = [];
        periodEstimates = [];
        ampEstimates = [];
        // 1. Calculute the normalized square difference for each Tau value.
        normalizedSquareDifference(float32AudioBuffer);
        // 2. Peak picking time: time to pick some peaks.
        peakPicking();
        var highestAmplitude = -Infinity;
        for (var i = 0; i < maxPositions.length; i++) {
            var tau = maxPositions[i];
            // make sure every annotation has a probability attached
            highestAmplitude = Math.max(highestAmplitude, nsdf[tau]);
            if (nsdf[tau] > SMALL_CUTOFF) {
                // calculates turningPointX and Y
                parabolicInterpolation(tau);
                // store the turning points
                ampEstimates.push(turningPointY);
                periodEstimates.push(turningPointX);
                // remember the highest amplitude
                highestAmplitude = Math.max(highestAmplitude, turningPointY);
            }
        }
        if (periodEstimates.length) {
            // use the overall maximum to calculate a cutoff.
            // The cutoff value is based on the highest value and a relative
            // threshold.
            var actualCutoff = cutoff * highestAmplitude;
            var periodIndex = 0;
            for (var i = 0; i < ampEstimates.length; i++) {
                if (ampEstimates[i] >= actualCutoff) {
                    periodIndex = i;
                    break;
                }
            }
            var period = periodEstimates[periodIndex], pitchEstimate = sampleRate / period;
            if (pitchEstimate > LOWER_PITCH_CUTOFF) {
                pitch = pitchEstimate;
            }
            else {
                pitch = -1;
            }
        }
        else {
            // no pitch detected.
            pitch = -1;
        }
        return {
            probability: highestAmplitude,
            freq: pitch,
        };
    };
}
exports.Macleod = Macleod;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1718767165062, function(require, module, exports) {

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FREQUENCIES_PARAMS = {
    tempo: 120,
    quantization: 4,
    sampleRate: 44100,
};
function pitchConsensus(detectors, chunk) {
    var pitches = detectors
        .map(function (fn) { return fn(chunk); })
        .filter(function (value) { return value !== null; })
        .sort(function (a, b) { return a - b; });
    // In the case of one pitch, return it.
    if (pitches.length === 1) {
        return pitches[0];
        // In the case of two pitches, return the geometric mean if they
        // are close to each other, and the lower pitch otherwise.
    }
    else if (pitches.length === 2) {
        var first = pitches[0], second = pitches[1];
        return first * 2 > second ? Math.sqrt(first * second) : first;
        // In the case of three or more pitches, filter away the extremes
        // if they are very extreme, then take the geometric mean.
    }
    else {
        var first = pitches[0];
        var second = pitches[1];
        var secondToLast = pitches[pitches.length - 2];
        var last = pitches[pitches.length - 1];
        var filtered1 = first * 2 > second ? pitches : pitches.slice(1);
        var filtered2 = secondToLast * 2 > last ? filtered1 : filtered1.slice(0, -1);
        return Math.pow(filtered2.reduce(function (t, p) { return t * p; }, 1), 1 / filtered2.length);
    }
}
function frequencies(detector, float32AudioBuffer, options) {
    if (options === void 0) { options = {}; }
    var config = __assign(__assign({}, exports.DEFAULT_FREQUENCIES_PARAMS), options);
    var tempo = config.tempo, quantization = config.quantization, sampleRate = config.sampleRate;
    var bufferLength = float32AudioBuffer.length;
    var chunkSize = Math.round((sampleRate * 60) / (quantization * tempo));
    var getPitch;
    if (Array.isArray(detector)) {
        getPitch = pitchConsensus.bind(null, detector);
    }
    else {
        getPitch = detector;
    }
    var pitches = [];
    for (var i = 0, max = bufferLength - chunkSize; i <= max; i += chunkSize) {
        var chunk = float32AudioBuffer.slice(i, i + chunkSize);
        var pitch = getPitch(chunk);
        pitches.push(pitch);
    }
    return pitches;
}
exports.frequencies = frequencies;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1718767165056);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map