package com.pulsechat.app.media

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File
import java.io.IOException

class VoiceRecorder(private val context: Context) {

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var isRecording = false

    fun startRecording(): File? {
        if (isRecording) return null

        val dir = File(context.cacheDir, "voice")
        if (!dir.exists()) dir.mkdirs()

        outputFile = File(dir, "voice_${System.currentTimeMillis()}.m4a")

        recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioEncodingBitRate(128000)
            setAudioSamplingRate(44100)
            setOutputFile(outputFile!!.absolutePath)
            try {
                prepare()
                start()
                isRecording = true
            } catch (e: IOException) {
                release()
                return null
            }
        }
        return outputFile
    }

    fun stopRecording(): File? {
        if (!isRecording) return null
        return try {
            recorder?.apply {
                stop()
                release()
            }
            recorder = null
            isRecording = false
            outputFile
        } catch (e: Exception) {
            recorder?.release()
            recorder = null
            isRecording = false
            null
        }
    }

    fun cancelRecording() {
        try {
            recorder?.apply {
                stop()
                release()
            }
        } catch (_: Exception) { }
        recorder = null
        isRecording = false
        outputFile?.delete()
        outputFile = null
    }

    fun isRecording(): Boolean = isRecording
}
