@file:JvmName("MaterialYouExpressive")

package dim.expressive

import android.app.Activity
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeAsyncMethod
import java.lang.ref.WeakReference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Suppress("UNUSED")
val materialYouExpressive = plugin {
    var avatars: AvatarShapes? = null

    start {
        avatars = AvatarShapes(dexFinder)

        var activity: WeakReference<Activity>? = null
        withAppActivity { activity = WeakReference(it) }

        // for the inspector: what native views make up the screen that's open
        registerNativeAsyncMethod("dim.expressive.dumpViews") {
            val root = activity?.get()?.window?.decorView ?: return@registerNativeAsyncMethod null
            withContext(Dispatchers.Main) { ViewDump.of(root) }
        }
    }

    stop {
        avatars?.dispose()
        avatars = null
    }
}
