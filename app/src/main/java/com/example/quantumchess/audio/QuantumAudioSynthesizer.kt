package com.example.quantumchess.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.example.quantumchess.model.PieceType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/**
 * Procedural Audio Synthesizer running natively on Android using AudioTrack.
 * Faithfully ports the procedural Web Audio API from src/quantumEngine.js:
 * - Sub-bass Mach sonic boom (exponential frequency drop 140Hz -> 24Hz)
 * - N-wave transient shock discontinuity
 * - Piece-unique hit signatures:
 *   - Pawn: sharp needle metallic crack
 *   - Knight: cavalry double thunder
 *   - Bishop: sacred harmonic beam overtone
 *   - Rook: deep subterranean seismic rumble
 *   - Queen: singularity vortex pitch sweep
 *   - King: monarch cathedral resonance gong
 */
class QuantumAudioSynthesizer {
    var isMuted: Boolean = false
    private val scope = CoroutineScope(Dispatchers.Default)
    private val sampleRate = 22050

    fun playSonicBoom(pieceType: PieceType, isFullCollapse: Boolean = false) {
        if (isMuted) return
        scope.launch {
            try {
                val durationSeconds = if (isFullCollapse) 0.55f else 0.40f
                val numSamples = (sampleRate * durationSeconds).toInt()
                val buffer = ShortArray(numSamples)

                val startFreq = if (isFullCollapse) 160.0 else 125.0
                val endFreq = 24.0

                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val progress = t / durationSeconds

                    // Exponential frequency sweep
                    val currentFreq = startFreq * Math.pow(endFreq / startFreq, progress)
                    val phase = 2.0 * PI * currentFreq * t

                    // Amplitude envelope: fast attack, exponential decay
                    val amp = (1.0 - progress) * exp(-progress * 3.5)

                    // Sub-bass sine boom + slight saturation distortion
                    var sample = sin(phase) * 1.3
                    sample = sample.coerceIn(-1.0, 1.0)

                    // N-wave Mach transient at start (first 25ms)
                    if (progress < 0.08) {
                        val nProg = progress / 0.08
                        val nWave = if (nProg < 0.35) 1.0 - nProg * 2.8 else -(1.0 - (nProg - 0.35) * 1.5)
                        sample = sample * 0.6 + nWave * 0.4
                    }

                    // Piece-unique timbre addition
                    when (pieceType) {
                        PieceType.PAWN -> {
                            val pawnHigh = sin(2.0 * PI * (520.0 - progress * 400.0) * t) * exp(-progress * 8.0)
                            sample = sample * 0.7 + pawnHigh * 0.3
                        }
                        PieceType.KNIGHT -> {
                            // Double thunder hit
                            val t2 = (t - 0.08).coerceAtLeast(0.0)
                            val kSaw = (2.0 * ((110.0 * t2) % 1.0) - 1.0) * exp(-t2 * 6.0)
                            sample = sample * 0.6 + kSaw * 0.4
                        }
                        PieceType.BISHOP -> {
                            val bChord = (sin(2.0 * PI * 528.0 * t) + sin(2.0 * PI * 792.0 * t)) * 0.5 * exp(-progress * 4.0)
                            sample = sample * 0.65 + bChord * 0.35
                        }
                        PieceType.ROOK -> {
                            val rSub = sin(2.0 * PI * (75.0 - progress * 45.0) * t) * exp(-progress * 2.5)
                            sample = sample * 0.55 + rSub * 0.45
                        }
                        PieceType.QUEEN -> {
                            val qPitch = 280.0 + sin(progress * PI) * 800.0
                            val qVortex = sin(2.0 * PI * qPitch * t) * exp(-progress * 3.0)
                            sample = sample * 0.6 + qVortex * 0.4
                        }
                        PieceType.KING -> {
                            val kGong = (sin(2.0 * PI * 110.0 * t) + sin(2.0 * PI * 220.0 * t) * 0.5) * exp(-progress * 2.0)
                            sample = sample * 0.5 + kGong * 0.5
                        }
                    }

                    buffer[i] = (sample.coerceIn(-1.0, 1.0) * Short.MAX_VALUE * 0.85).toInt().toShort()
                }

                playBuffer(buffer)
            } catch (e: Exception) {
                // Audio synthesis gracefully recovers if hardware channel is busy
            }
        }
    }

    fun playHodgeAbsorbSound() {
        if (isMuted) return
        scope.launch {
            try {
                val duration = 0.25f
                val numSamples = (sampleRate * duration).toInt()
                val buffer = ShortArray(numSamples)
                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val progress = t / duration
                    val freq = 880.0 - progress * 600.0
                    val amp = exp(-progress * 5.0)
                    val s = sin(2.0 * PI * freq * t) * amp
                    buffer[i] = (s * Short.MAX_VALUE * 0.6).toInt().toShort()
                }
                playBuffer(buffer)
            } catch (_: Exception) {}
        }
    }

    fun playEntanglementPulse() {
        if (isMuted) return
        scope.launch {
            try {
                val duration = 0.30f
                val numSamples = (sampleRate * duration).toInt()
                val buffer = ShortArray(numSamples)
                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val progress = t / duration
                    val freq = if (progress < 0.5) 1320.0 + progress * 880.0 else 1760.0 - (progress - 0.5) * 1200.0
                    val amp = exp(-progress * 4.0)
                    val s = sin(2.0 * PI * freq * t) * amp
                    buffer[i] = (s * Short.MAX_VALUE * 0.55).toInt().toShort()
                }
                playBuffer(buffer)
            } catch (_: Exception) {}
        }
    }

    private fun playBuffer(buffer: ShortArray) {
        val audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(buffer.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        audioTrack.write(buffer, 0, buffer.size)
        audioTrack.play()
        scope.launch {
            kotlinx.coroutines.delay((buffer.size.toDouble() / sampleRate * 1000).toLong() + 50)
            try {
                audioTrack.stop()
                audioTrack.release()
            } catch (_: Exception) {}
        }
    }
}
