@file:JvmName("ChatBubbles")

package dim.chatbubbles

import app.valenced.bridge.asDelegate
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeMethod

@Suppress("UNUSED")
val chatBubbles = plugin {
    var bubbles: Bubbles? = null

    start {
        bubbles = Bubbles(dexFinder)

        registerNativeMethod("dim.chat-bubbles.colors") { args ->
            bubbles?.setColors((args[0] as Number).toInt(), (args[1] as Number).toInt())
            null
        }

        registerNativeMethod("dim.chat-bubbles.own") { args ->
            val id by args.asDelegate().string()
            bubbles?.markOwn(id)
            null
        }
    }

    stop {
        bubbles?.dispose()
        bubbles = null
    }
}
