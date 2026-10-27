package dim.taptap

import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import app.valenced.xposed.api.DexFinder
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import java.util.WeakHashMap
import kotlin.math.hypot

private const val MESSAGE_VIEW = "com.discord.chat.presentation.message.MessageView"
private const val MESSAGE = "com.discord.chat.bridge.Message"

internal class DoubleTaps(dexFinder: DexFinder, private val onDoubleTap: (messageId: String) -> Unit) {
    private class Tap(val messageId: String, val time: Long, val x: Float, val y: Float)

    private val messageViewClass = dexFinder.classLoader.loadClass(MESSAGE_VIEW)
    private val messageIdField = dexFinder.classLoader.loadClass(MESSAGE).getDeclaredField("id")
        .apply { isAccessible = true }

    // Main thread only
    private val messageIds = WeakHashMap<View, String>()
    private var down: Tap? = null
    private var lastTap: Tap? = null
    private var moved = false
    // nested message views (replies, link previews) see the same event, the innermost one handles it
    private var handledEventTime = -1L

    private val unhooks: List<XC_MethodHook.Unhook>

    init {
        val setMessage = dexFinder.findMethod {
            matcher {
                declaredClass(MESSAGE_VIEW)
                usingEqStrings("message", "messageContext", "eventHandler")
            }
        } ?: error("MessageView.setMessage not found")

        val dispatchTouchEvent = ViewGroup::class.java
            .getDeclaredMethod("dispatchTouchEvent", MotionEvent::class.java)

        unhooks = listOf(
            XposedBridge.hookMethod(setMessage, object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    messageIds[param.thisObject as View] = messageIdField.get(param.args[0]) as String
                }
            }),
            // after, so the innermost view runs first
            XposedBridge.hookMethod(dispatchTouchEvent, object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    if (messageViewClass.isInstance(param.thisObject))
                        onTouch(param.thisObject as View, param.args[0] as MotionEvent)
                }
            }),
        )
    }

    private fun onTouch(view: View, event: MotionEvent) {
        if (event.eventTime == handledEventTime) return
        val id = messageIds[view] ?: return
        handledEventTime = event.eventTime

        val config = ViewConfiguration.get(view.context)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                down = Tap(id, event.eventTime, event.rawX, event.rawY)
                moved = false
            }

            MotionEvent.ACTION_MOVE -> {
                val start = down ?: return
                if (hypot(event.rawX - start.x, event.rawY - start.y) > config.scaledTouchSlop) moved = true
            }

            MotionEvent.ACTION_UP -> {
                val start = down ?: return
                down = null
                if (moved || start.messageId != id || event.eventTime - start.time > ViewConfiguration.getTapTimeout() * 3) {
                    lastTap = null
                    return
                }

                val tap = Tap(id, event.eventTime, event.rawX, event.rawY)
                val previous = lastTap

                if (
                    previous != null &&
                    previous.messageId == id &&
                    tap.time - previous.time <= ViewConfiguration.getDoubleTapTimeout() &&
                    hypot(tap.x - previous.x, tap.y - previous.y) <= config.scaledDoubleTapSlop
                ) {
                    lastTap = null
                    view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                    onDoubleTap(id)
                } else {
                    lastTap = tap
                }
            }

            MotionEvent.ACTION_CANCEL -> {
                down = null
                lastTap = null
            }
        }
    }

    fun dispose() {
        for (unhook in unhooks) unhook.unhook()
    }
}
