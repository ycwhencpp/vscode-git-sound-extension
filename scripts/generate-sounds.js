/**
 * Generates two WAV sound files:
 * 1. faah.wav  — a dramatic descending "fail" tone (sad trombone style)
 * 2. clap.wav  — a burst of applause-style noise claps
 *
 * Both are 16-bit mono PCM WAV at 44100 Hz.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

function writeWav(filePath, samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, 28);
  buffer.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.round(val), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`Written: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// --- FAAH SOUND: Sad trombone / dramatic descending brass ---
function generateFaah() {
  const duration = 2.0;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(totalSamples);

  // Four descending notes like the classic "wah wah wah wahhh"
  const notes = [
    { startFreq: 370, endFreq: 370, start: 0.0,  end: 0.35 },
    { startFreq: 349, endFreq: 349, start: 0.35, end: 0.70 },
    { startFreq: 330, endFreq: 330, start: 0.70, end: 1.05 },
    { startFreq: 311, endFreq: 260, start: 1.05, end: 2.00 },
  ];

  for (const note of notes) {
    const sStart = Math.floor(note.start * SAMPLE_RATE);
    const sEnd = Math.floor(note.end * SAMPLE_RATE);
    const len = sEnd - sStart;

    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const progress = i / len;
      const freq = note.startFreq + (note.endFreq - note.startFreq) * progress;

      // Brass-like timbre: fundamental + harmonics
      let sample = 0;
      sample += 0.5  * Math.sin(2 * Math.PI * freq * t);
      sample += 0.3  * Math.sin(2 * Math.PI * freq * 2 * t);
      sample += 0.15 * Math.sin(2 * Math.PI * freq * 3 * t);
      sample += 0.05 * Math.sin(2 * Math.PI * freq * 4 * t);

      // Vibrato on the last note
      if (note === notes[3]) {
        const vibratoDepth = 4 * progress;
        const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * vibratoDepth;
        sample = 0;
        const vFreq = freq + vibrato;
        sample += 0.5  * Math.sin(2 * Math.PI * vFreq * t);
        sample += 0.3  * Math.sin(2 * Math.PI * vFreq * 2 * t);
        sample += 0.15 * Math.sin(2 * Math.PI * vFreq * 3 * t);
        sample += 0.05 * Math.sin(2 * Math.PI * vFreq * 4 * t);
      }

      // Envelope: attack-sustain-release
      let env = 1.0;
      const attackTime = 0.02;
      const releaseTime = 0.08;
      if (t < attackTime) {
        env = t / attackTime;
      } else if (progress > 0.85) {
        env = (1 - progress) / 0.15;
      }

      samples[sStart + i] += sample * env * 0.6;
    }
  }

  return samples;
}

// --- CLAP SOUND: A series of fast hand claps with reverb tail ---
function generateClap() {
  const duration = 1.5;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(totalSamples);

  // Generate multiple clap hits to simulate applause
  const clapTimes = [];
  // Main claps: 3 distinct hits
  clapTimes.push(0.0, 0.12, 0.24);
  // Scatter some background claps
  for (let i = 0; i < 20; i++) {
    clapTimes.push(0.05 + Math.random() * 0.5);
  }

  for (const time of clapTimes) {
    const sStart = Math.floor(time * SAMPLE_RATE);
    const clapLen = Math.floor(0.04 * SAMPLE_RATE); // each clap ~40ms
    const isMain = time < 0.3 && (Math.abs(time) < 0.01 || Math.abs(time - 0.12) < 0.01 || Math.abs(time - 0.24) < 0.01);
    const volume = isMain ? 0.7 : 0.15 + Math.random() * 0.15;

    for (let i = 0; i < clapLen && (sStart + i) < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      // Clap = filtered noise burst with sharp attack and fast decay
      const noise = (Math.random() * 2 - 1);

      // Band-pass style: multiple resonances typical of a hand clap
      const f1 = Math.sin(2 * Math.PI * 2300 * t) * 0.3;
      const f2 = Math.sin(2 * Math.PI * 1800 * t) * 0.2;
      const f3 = Math.sin(2 * Math.PI * 3500 * t) * 0.15;

      const clap = noise * 0.5 + (noise * (f1 + f2 + f3));

      // Sharp exponential decay
      const env = Math.exp(-t * 120) * volume;

      samples[sStart + i] += clap * env;
    }
  }

  // Add a short reverb/echo tail
  const delayMs = 35;
  const delaySamples = Math.floor(delayMs / 1000 * SAMPLE_RATE);
  const feedback = 0.3;
  for (let i = delaySamples; i < totalSamples; i++) {
    samples[i] += samples[i - delaySamples] * feedback;
  }

  // Normalize
  let maxAmp = 0;
  for (let i = 0; i < totalSamples; i++) {
    maxAmp = Math.max(maxAmp, Math.abs(samples[i]));
  }
  if (maxAmp > 0) {
    for (let i = 0; i < totalSamples; i++) {
      samples[i] = (samples[i] / maxAmp) * 0.8;
    }
  }

  return samples;
}

// Generate both sounds
const mediaDir = path.join(__dirname, '..', 'media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

writeWav(path.join(mediaDir, 'faah.wav'), generateFaah());
writeWav(path.join(mediaDir, 'clap.wav'), generateClap());

console.log('Sound generation complete!');
