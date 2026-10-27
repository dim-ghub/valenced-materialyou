@file:JvmName("TapTap")

package dim.taptap

import app.valenced.plugins.plugin
import app.valenced.xposed.api.callJSMethod
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@Suppress("UNUSED")
val tapTap = plugin {
    var taps: DoubleTaps? = null
    var scope: CoroutineScope? = null

    start {
        val jsScope = CoroutineScope(SupervisorJob() + Dispatchers.Default).also { scope = it }

        taps = DoubleTaps(dexFinder) { messageId ->
            jsScope.launch {
                runCatching { callJSMethod("dim.taptap.doubleTap", listOf(messageId)) }
                    .onFailure { log.w("doubleTap failed: ${it.message}") }
            }
        }
    }

    stop {
        taps?.dispose()
        taps = null
        scope?.cancel()
        scope = null
    }
}
