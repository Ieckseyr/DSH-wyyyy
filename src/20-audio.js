/**
 * Playback engine.
 *
 * Audio path decisions that matter for smooth playback:
 *  · The CDN sends `Access-Control-Allow-Origin: *`, so the element plays the real CDN
 *    URL with `crossOrigin="anonymous"` and still feeds an untainted Web Audio graph.
 *    That keeps the bytes out of the Node host — piping ~1 MB/s through the host's single
 *    thread competes with the agent itself — and halves the time from click to sound.
 *    When a host refuses CORS we fall back to the local proxy for that host only.
 *  · The convolver is built on demand and only fed while wet > 0. A 1.9s reverb IR keeps
 *    convolving even when nobody can hear it, and that is by far the most expensive node
 *    in this graph.
 *  · Everything else is a handful of biquads and gains, which cost almost nothing.
 */
(function (NT) {
  'use strict';

  var EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  function impulseBuffer(ac, seconds, decay) {
    var length = Math.max(1, Math.floor(ac.sampleRate * seconds));
    var buffer = ac.createBuffer(2, length, ac.sampleRate);
    for (var channel = 0; channel < 2; channel++) {
      var data = buffer.getChannelData(channel);
      for (var i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  NT.createEngine = function (options) {
    var onEvent = options.onEvent || function () {};
    var element = new Audio();
    element.preload = 'auto';
    element.setAttribute('playsinline', '');
    var audioContext = null;
    var graph = null;
    var graphFailed = false;
    var effects = options.getEffects ? options.getEffects() : {};
    var corsHosts = Object.create(null);
    var lastDirect = null;

    /** The element can only play this CDN host directly if it answers a CORS probe. */
    function probeCors(url) {
      var host;
      try {
        host = new URL(url).host;
      } catch (error) {
        return Promise.resolve(false);
      }
      if (host in corsHosts) return Promise.resolve(corsHosts[host]);
      return fetch(url, { headers: { Range: 'bytes=0-1' }, mode: 'cors', cache: 'no-store' })
        .then(function (response) {
          corsHosts[host] = response.ok || response.status === 206;
          return corsHosts[host];
        })
        .catch(function () {
          corsHosts[host] = false;
          return false;
        });
    }

    function buildGraph() {
      if (graph || graphFailed) return graph;
      try {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) throw new Error('no Web Audio');
        audioContext = new Ctor();
        var source = audioContext.createMediaElementSource(element);

        var preGain = audioContext.createGain();
        preGain.gain.value = 1;

        var bands = EQ_FREQS.map(function (freq) {
          var filter = audioContext.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.1;
          filter.gain.value = 0;
          return filter;
        });
        var bass = audioContext.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 105;
        var treble = audioContext.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 9800;

        // One 2x2 channel matrix covers width, mono, vocal removal and balance.
        var splitter = audioContext.createChannelSplitter(2);
        var merger = audioContext.createChannelMerger(2);
        var gLL = audioContext.createGain();
        var gLR = audioContext.createGain();
        var gRL = audioContext.createGain();
        var gRR = audioContext.createGain();

        var dry = audioContext.createGain();
        var wet = audioContext.createGain();
        wet.gain.value = 0;
        var reverbIn = audioContext.createGain();
        var convolver = null;
        var reverbConnected = false;

        var limiter = audioContext.createDynamicsCompressor();
        limiter.threshold.value = -1.5;
        limiter.knee.value = 4;
        limiter.ratio.value = 14;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;

        var analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;
        var scope = new Uint8Array(analyser.fftSize);
        var spectrum = new Uint8Array(analyser.frequencyBinCount);

        var cursor = source;
        cursor.connect(preGain);
        cursor = preGain;
        bands.forEach(function (filter) {
          cursor.connect(filter);
          cursor = filter;
        });
        cursor.connect(bass);
        bass.connect(treble);

        treble.connect(splitter);
        splitter.connect(gLL, 0, 0);
        splitter.connect(gLR, 1, 0);
        splitter.connect(gRL, 0, 0);
        splitter.connect(gRR, 1, 0);
        gLL.connect(merger, 0, 0);
        gLR.connect(merger, 0, 0);
        gRL.connect(merger, 0, 1);
        gRR.connect(merger, 0, 1);

        // Headphone crossfeed: a delayed, low-passed copy of each channel leaks into the
        // other one. Two delays and two filters cost almost nothing, and it is the one
        // "spatial" effect that actually reduces listening fatigue on headphones.
        var cfSplit = audioContext.createChannelSplitter(2);
        var cfMerge = audioContext.createChannelMerger(2);
        var cfDirectL = audioContext.createGain();
        var cfDirectR = audioContext.createGain();
        var cfCrossL = audioContext.createGain();
        var cfCrossR = audioContext.createGain();
        var cfDelayL = audioContext.createDelay(0.01);
        var cfDelayR = audioContext.createDelay(0.01);
        var cfLowL = audioContext.createBiquadFilter();
        var cfLowR = audioContext.createBiquadFilter();
        cfLowL.type = 'lowpass';
        cfLowL.frequency.value = 720;
        cfLowR.type = 'lowpass';
        cfLowR.frequency.value = 720;
        cfDelayL.delayTime.value = 0.00027;
        cfDelayR.delayTime.value = 0.00027;
        cfDirectL.gain.value = 1;
        cfDirectR.gain.value = 1;
        cfCrossL.gain.value = 0;
        cfCrossR.gain.value = 0;

        merger.connect(cfSplit);
        cfSplit.connect(cfDirectL, 0, 0);
        cfSplit.connect(cfDirectR, 1, 0);
        cfSplit.connect(cfDelayL, 0, 0);
        cfSplit.connect(cfDelayR, 1, 0);
        cfDelayL.connect(cfLowL);
        cfLowL.connect(cfCrossR);
        cfDelayR.connect(cfLowR);
        cfLowR.connect(cfCrossL);
        cfDirectL.connect(cfMerge, 0, 0);
        cfCrossL.connect(cfMerge, 0, 0);
        cfDirectR.connect(cfMerge, 0, 1);
        cfCrossR.connect(cfMerge, 0, 1);

        cfMerge.connect(dry);
        dry.connect(limiter);
        cfMerge.connect(reverbIn);
        reverbIn.connect(wet);
        wet.connect(limiter);

        limiter.connect(analyser);
        analyser.connect(audioContext.destination);

        graph = {
          source: source,
          preGain: preGain,
          bands: bands,
          bass: bass,
          treble: treble,
          gLL: gLL,
          gLR: gLR,
          gRL: gRL,
          gRR: gRR,
          cfCrossL: cfCrossL,
          cfCrossR: cfCrossR,
          dry: dry,
          wet: wet,
          reverbIn: reverbIn,
          /** Built on first use and detached again when the wet level returns to zero. */
          setReverbActive: function (on) {
            if (on) {
              if (!convolver) {
                convolver = audioContext.createConvolver();
                convolver.buffer = impulseBuffer(audioContext, 1.9, 3.2);
                convolver.connect(wet);
              }
              if (!reverbConnected) {
                reverbIn.connect(convolver);
                reverbConnected = true;
              }
            } else if (reverbConnected) {
              try {
                reverbIn.disconnect(convolver);
              } catch (error) {
                /* already detached */
              }
              reverbConnected = false;
            }
          },
          limiter: limiter,
          analyser: analyser,
          scope: scope,
          spectrum: spectrum,
        };
        applyEffects(effects);
        return graph;
      } catch (error) {
        graphFailed = true;
        onEvent({ type: 'effect-unavailable', error: error });
        return null;
      }
    }

    function applyEffects(next) {
      effects = next || effects || {};
      if (!graph) return;
      var bypass = Boolean(effects.bypass);

      var eq = Array.isArray(effects.eq) ? effects.eq : [];
      var auto = Array.isArray(effects.autoEq) ? effects.autoEq : [];
      for (var i = 0; i < graph.bands.length; i++) {
        var value = Number(eq[i]);
        var correction = Number(auto[i]) || 0;
        graph.bands[i].gain.value = bypass || !isFinite(value) ? 0 : value + correction;
      }
      graph.bass.gain.value = bypass
        ? 0
        : (Number(effects.bass) || 0) + (Number(effects.smartBass) || 0);
      graph.treble.gain.value = bypass ? 0 : Number(effects.treble) || 0;

      var cross = bypass ? 0 : effects.crossfeed ? Math.max(0, Math.min(1, Number(effects.crossfeedAmount) || 0.22)) : 0;
      graph.cfCrossL.gain.value = cross;
      graph.cfCrossR.gain.value = cross;

      var width = bypass ? 0 : Math.max(0, Math.min(1, Number(effects.width == null ? 0.18 : effects.width)));
      var fold = width * 0.32;
      var gLL = 1;
      var gRR = 1;
      var gLR = fold;
      var gRL = fold;
      var scale = 1 / (1 + fold);
      if (!bypass && effects.vocal) {
        gLL = 0.72;
        gRR = 0.72;
        gLR = -0.72;
        gRL = -0.72;
        scale = 1;
      } else if (!bypass && effects.mono) {
        gLL = gLR = gRL = gRR = 0.5;
        scale = 1;
      }
      var balance = bypass ? 0 : Math.max(-1, Math.min(1, Number(effects.balance) || 0));
      graph.gLL.gain.value = gLL * scale * (1 - Math.max(0, balance));
      graph.gRR.gain.value = gRR * scale * (1 + Math.min(0, balance));
      graph.gLR.gain.value = gLR * scale * (1 - Math.max(0, balance));
      graph.gRL.gain.value = gRL * scale * (1 + Math.min(0, balance));

      var reverb = bypass ? 0 : Math.max(0, Math.min(1, Number(effects.reverb) || 0));
      if (reverb > 0.001) {
        graph.setReverbActive(true);
        graph.wet.gain.value = reverb;
        graph.dry.gain.value = 1 - reverb * 0.3;
      } else {
        // Detach the wet path entirely so an idle reverb costs nothing per block.
        graph.setReverbActive(false);
        graph.wet.gain.value = 0;
        graph.dry.gain.value = 1;
      }

      var comp = bypass ? false : effects.comp !== false;
      graph.limiter.threshold.value = comp ? -1.5 : 0;
      graph.limiter.ratio.value = comp ? 14 : 1;
      graph.limiter.knee.value = comp ? 4 : 0;

      graph.preGain.gain.value = bypass || effects.normalize === false ? 1 : gainForNorm;
      element.playbackRate = Math.max(0.5, Math.min(2, Number(effects.rate) || 1));
    }

    /* Level-driven makeup gain for "volume levelling", updated a few times a second. */
    var gainForNorm = 1;
    var normTimer = null;
    function startNormalizer() {
      if (normTimer) return;
      normTimer = setInterval(function () {
        if (!graph || !NT.controller || !NT.controller.state) return;
        var settings = NT.controller.state().effects || {};
        var target = 1;
        if (!settings.bypass && settings.normalize !== false) {
          var level = readLevel();
          if (level > 0.004) target = Math.max(0.55, Math.min(1.9, 0.22 / level));
        }
        gainForNorm += (target - gainForNorm) * 0.25;
        if (graph) graph.preGain.gain.value = gainForNorm;
      }, 250);
    }

    function readLevel() {
      if (!graph) return 0;
      graph.analyser.getByteTimeDomainData(graph.scope);
      var sum = 0;
      for (var i = 0; i < graph.scope.length; i++) {
        var v = (graph.scope[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / graph.scope.length);
    }

    /* ------------------------------------------------------------ element events */

    element.addEventListener('timeupdate', function () {
      onEvent({ type: 'time', currentTime: element.currentTime, duration: element.duration || 0 });
    });
    element.addEventListener('ended', function () {
      onEvent({ type: 'ended' });
    });
    element.addEventListener('error', function () {
      onEvent({ type: 'error', error: element.error, direct: lastDirect });
    });
    element.addEventListener('playing', function () {
      startNormalizer();
      onEvent({ type: 'playing' });
    });
    element.addEventListener('waiting', function () {
      onEvent({ type: 'waiting' });
    });

    return {
      element: element,

      /**
       * Start one track: prefer the CDN, fall back to the local proxy when the host
       * refuses CORS. `proxyUrl` is only used as the fallback.
       */
      play: async function (url, proxyUrl) {
        if (!graph && !graphFailed) buildGraph();
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch (error) {
            /* resumes on the next gesture */
          }
        }
        var direct = null;
        if (url && proxyUrl && /^https?:/i.test(url) && (await probeCors(url))) direct = url;
        lastDirect = Boolean(direct);
        if (direct) element.crossOrigin = 'anonymous';
        else element.removeAttribute('crossorigin');
        element.src = direct || proxyUrl || url;
        try {
          await element.play();
          return true;
        } catch (error) {
          onEvent({ type: 'blocked', error: error });
          return false;
        }
      },

      /** Retry the same track through the proxy after a direct-load failure. */
      playProxy: async function (proxyUrl) {
        lastDirect = false;
        element.removeAttribute('crossorigin');
        element.src = proxyUrl;
        try {
          await element.play();
          return true;
        } catch (error) {
          onEvent({ type: 'blocked', error: error });
          return false;
        }
      },

      pause: function () {
        element.pause();
      },
      resume: async function () {
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch (error) {
            /* ignored */
          }
        }
        try {
          await element.play();
          return true;
        } catch (error) {
          onEvent({ type: 'blocked', error: error });
          return false;
        }
      },
      stop: function () {
        element.pause();
        element.removeAttribute('src');
        try {
          element.load();
        } catch (error) {
          /* ignored */
        }
      },
      seek: function (seconds) {
        if (!isFinite(seconds)) return;
        try {
          element.currentTime = Math.max(0, seconds);
        } catch (error) {
          /* seeking before metadata is a no-op */
        }
      },
      setVolume: function (value) {
        element.volume = Math.max(0, Math.min(1, value));
      },
      setMuted: function (muted) {
        element.muted = Boolean(muted);
      },
      applyEffects: applyEffects,
      get playing() {
        return !element.paused && !element.ended && element.readyState > 2;
      },
      get currentTime() {
        return element.currentTime || 0;
      },
      get duration() {
        var d = element.duration;
        return isFinite(d) && d > 0 ? d : 0;
      },
      readSpectrum: function () {
        if (!graph) return null;
        graph.analyser.getByteFrequencyData(graph.spectrum);
        return graph.spectrum;
      },
      /**
       * Average analyser value per octave band, 0..255. The smart equaliser compares
       * these against each other to flatten the response.
       */
      readBandLevels: function (freqs) {
        if (!graph) return null;
        graph.analyser.getByteFrequencyData(graph.spectrum);
        var nyquist = audioContext.sampleRate / 2;
        var binCount = graph.spectrum.length;
        var levels = [];
        for (var i = 0; i < freqs.length; i++) {
          var lo = Math.max(1, Math.floor(((freqs[i] / 1.6) / nyquist) * binCount));
          var hi = Math.min(binCount - 1, Math.ceil(((freqs[i] * 1.6) / nyquist) * binCount));
          var sum = 0;
          var count = 0;
          for (var b = lo; b <= hi; b++) {
            sum += graph.spectrum[b];
            count += 1;
          }
          levels.push(count ? sum / count : 0);
        }
        return levels;
      },
      readLevel: readLevel,
      dispose: function () {
        if (normTimer) {
          clearInterval(normTimer);
          normTimer = null;
        }
        try {
          element.pause();
          element.removeAttribute('src');
          element.load();
        } catch (error) {
          /* ignored */
        }
        if (audioContext) {
          try {
            audioContext.close();
          } catch (error) {
            /* ignored */
          }
        }
      },
    };
  };

  NT.EQ_FREQS = EQ_FREQS;
})(NT);
