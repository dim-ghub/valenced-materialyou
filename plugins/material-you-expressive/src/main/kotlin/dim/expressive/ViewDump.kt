package dim.expressive

import android.content.res.Resources
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.TextView

private const val MAX_LENGTH = 120_000
private const val MAX_TEXT = 24

/** Indented tree of the visible views under [root]: class, resource id, size in dp, background and text. */
internal object ViewDump {
    fun of(root: View): String {
        val out = StringBuilder()
        walk(root, 0, out)
        return out.toString()
    }

    private fun walk(view: View, depth: Int, out: StringBuilder) {
        if (out.length > MAX_LENGTH || view.visibility != View.VISIBLE) return

        val density = view.resources.displayMetrics.density
        out.append(" ".repeat(depth)).append(view.javaClass.name.substringAfterLast('.'))

        idName(view)?.let { out.append(" #").append(it) }
        out.append(' ').append((view.width / density).toInt()).append('x').append((view.height / density).toInt())

        when (val background = view.background) {
            is ColorDrawable -> out.append(" bg=").append(hex(background.color))
            is GradientDrawable -> out.append(" bg=gradient r=").append((background.cornerRadius / density).toInt())
            null -> {}
            else -> out.append(" bg=").append(background.javaClass.simpleName)
        }

        if (view is TextView && view.text.isNotEmpty())
            out.append(" \"").append(view.text.take(MAX_TEXT).toString().replace('\n', ' ')).append('"')

        out.append('\n')

        if (view is ViewGroup) for (i in 0 until view.childCount) walk(view.getChildAt(i), depth + 1, out)
    }

    private fun idName(view: View): String? =
        if (view.id == View.NO_ID) null
        else try {
            view.resources.getResourceEntryName(view.id)
        } catch (_: Resources.NotFoundException) {
            null
        }

    private fun hex(color: Int) = "#%08X".format(color)
}
