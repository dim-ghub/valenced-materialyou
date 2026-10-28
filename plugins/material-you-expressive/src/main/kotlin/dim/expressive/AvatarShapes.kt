package dim.expressive

import android.graphics.Outline
import android.graphics.Path
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import app.valenced.xposed.api.DexFinder
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private const val MESSAGE_VIEW = "com.discord.chat.presentation.message.MessageView"

private const val LOBES = 9
private const val DEPTH = 0.12f
private const val STEPS = 180

/** Clips chat avatars to M3's 9-lobed cookie shape. Clipping to a path needs Android 13. */
internal class AvatarShapes(dexFinder: DexFinder) {
    private val unhooks: List<XC_MethodHook.Unhook>

    init {
        unhooks = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) emptyList() else {
            val setMessage = dexFinder.findMethod {
                matcher {
                    declaredClass(MESSAGE_VIEW)
                    usingEqStrings("message", "messageContext", "eventHandler")
                }
            } ?: error("MessageView.setMessage not found")

            listOf(XposedBridge.hookMethod(setMessage, object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    val view = param.thisObject as ViewGroup
                    val id = view.idOf("author_avatar")
                    if (id == 0) return

                    // not findViewById, replies have avatars with the same id
                    val avatar = (0 until view.childCount).map(view::getChildAt).firstOrNull { it.id == id }
                        ?: return
                    if (avatar.outlineProvider !== Cookie) {
                        avatar.outlineProvider = Cookie
                        avatar.clipToOutline = true
                    }
                }
            }))
        }
    }

    fun dispose() {
        for (unhook in unhooks) unhook.unhook()
    }

    private object Cookie : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) {
            if (view.width == 0 || view.height == 0) return
            outline.setPath(path(view.width.toFloat(), view.height.toFloat()))
        }

        private fun path(width: Float, height: Float) = Path().apply {
            for (i in 0..STEPS) {
                val angle = i.toFloat() / STEPS * 2 * PI.toFloat()
                // peaks reach the edge, so the shape stays inside discord's round avatar
                val radius = 0.5f * (1 - DEPTH + DEPTH * (0.5f + 0.5f * cos(LOBES * angle)))
                val x = width * (0.5f + radius * cos(angle - PI.toFloat() / 2))
                val y = height * (0.5f + radius * sin(angle - PI.toFloat() / 2))
                if (i == 0) moveTo(x, y) else lineTo(x, y)
            }
            close()
        }
    }
}

@Suppress("DiscouragedApi")
internal fun View.idOf(name: String) = resources.getIdentifier(name, "id", context.packageName)
