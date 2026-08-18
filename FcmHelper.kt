package com.pulsechat.app.util

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessaging
import com.pulsechat.app.data.repository.UserRepository
import kotlinx.coroutines.tasks.await

object FcmHelper {

    suspend fun refreshAndSaveToken() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            UserRepository().updateFcmToken(uid, token)
        } catch (_: Exception) {
            // Ignore – token will be saved on next onNewToken
        }
    }
}
