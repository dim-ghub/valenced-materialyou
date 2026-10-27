package dim.chatbubbles

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import app.valenced.xposed.api.DexFinder
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import java.util.WeakHashMap

private const val MESSAGE_VIEW = "com.discord.chat.presentation.message.MessageView"
private const val MESSAGE = "com.discord.chat.bridge.Message"

private const val RADIUS_DP = 16f
private const val PADDING_H_DP = 10f
private const val PADDING_V_DP = 4f
private const val AVATAR_GAP_DP = 4f

private const val OWN_CAPACITY = 2000

internal class Bubbles(dexFinder: DexFinder) {
    @Volatile
    private var ownColor = 0

    @Volatile
    private var otherColor = 0

    private val own = object : LinkedHashMap<String, Unit>(256, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Unit>) = size > OWN_CAPACITY
    }

    private val messageIdField = dexFinder.classLoader.loadClass(MESSAGE).getDeclaredField("id")
        .apply { isAccessible = true }

    // Main thread only
    private val backgrounds = WeakHashMap<ViewGroup, Bubble>()
    private val mainHandler = Handler(Looper.getMainLooper())

    private val unhooks: List<XC_MethodHook.Unhook>

    init {
        val setMessage = dexFinder.findMethod {
            matcher {
                declaredClass(MESSAGE_VIEW)
                usingEqStrings("message", "messageContext", "eventHandler")
            }
        } ?: error("MessageView.setMessage not found")

        unhooks = listOf(XposedBridge.hookMethod(setMessage, object : XC_MethodHook() {
            override fun afterHookedMethod(param: MethodHookParam) {
                val view = param.thisObject as ViewGroup
                val id = messageIdField.get(param.args[0]) as String
                val isOwn = synchronized(own) { id in own }

                val current = view.background
                val bubble = (current as? Bubble) ?: Bubble(view, current).also {
                    view.background = it
                    backgrounds[view] = it
                }
                bubble.own = isOwn
                bubble.invalidateSelf()
            }
        }))
    }

    fun markOwn(id: String) {
        synchronized(own) { own[id] = Unit }
    }

    fun setColors(own: Int, other: Int) {
        ownColor = own
        otherColor = other
        mainHandler.post { for (bubble in backgrounds.values) bubble.invalidateSelf() }
    }

    fun dispose() {
        for (unhook in unhooks) unhook.unhook()
        mainHandler.post {
            for ((view, bubble) in backgrounds) if (view.background === bubble) view.background = bubble.original
            backgrounds.clear()
        }
    }

    /** Draws a bubble behind everything in the message but the avatar, then Discord's own background on top. */
    private inner class Bubble(private val view: ViewGroup, val original: Drawable?) : Drawable() {
        var own = false

        private val density = view.resources.displayMetrics.density
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val rect = RectF()
        private val avatarIds = listOf("author_avatar", "author_avatar_decoration").map(view::idOf).toSet()

        override fun draw(canvas: Canvas) {
            val color = if (own) ownColor else otherColor
            if (color != 0 && contentBounds()) {
                paint.color = color
                canvas.drawRoundRect(rect, RADIUS_DP * density, RADIUS_DP * density, paint)
            }

            original?.let {
                it.bounds = bounds
                it.draw(canvas)
            }
        }

        private fun contentBounds(): Boolean {
            var left = Float.MAX_VALUE
            var top = Float.MAX_VALUE
            var right = Float.MIN_VALUE
            var bottom = Float.MIN_VALUE
            var avatarRight = 0f

            for (i in 0 until view.childCount) {
                val child = view.getChildAt(i)
                if (child.visibility != View.VISIBLE || child.width == 0 || child.height == 0) continue

                if (child.id in avatarIds) {
                    avatarRight = maxOf(avatarRight, child.right.toFloat())
                    continue
                }

                left = minOf(left, child.left.toFloat())
                top = minOf(top, child.top.toFloat())
                right = maxOf(right, child.right.toFloat())
                bottom = maxOf(bottom, child.bottom.toFloat())
            }

            if (left > right || top > bottom) return false

            rect.set(
                maxOf(left - PADDING_H_DP * density, avatarRight + AVATAR_GAP_DP * density),
                maxOf(top - PADDING_V_DP * density, 0f),
                minOf(right + PADDING_H_DP * density, view.width.toFloat()),
                minOf(bottom + PADDING_V_DP * density, view.height.toFloat()),
            )
            return true
        }

        override fun setAlpha(alpha: Int) {
            paint.alpha = alpha
        }

        override fun setColorFilter(colorFilter: ColorFilter?) {
            paint.colorFilter = colorFilter
        }

        @Deprecated("Deprecated in Java")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
    }
}

@Suppress("DiscouragedApi")
private fun View.idOf(name: String) = resources.getIdentifier(name, "id", context.packageName)
