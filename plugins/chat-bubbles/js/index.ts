import { Tokens } from '@valenced/discord/common/tokens'
import { Stores } from '@valenced/discord/flux'
import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { callNativeMethodSync } from '@valenced/modules/native'
import { after } from '@valenced/patcher'
import { processColor } from 'react-native'
import type { DiscordModules } from '@valenced/discord/types'

interface RowManager {
	prototype: {
		generate(row: unknown): MessageRow
	}
}

interface MessageRow {
	type?: number
	message?: { id: string; authorId?: string }
}

const MessageRowType = 1

// first token this discord version has wins
const OtherTokens = [
	'BACKGROUND_SURFACE_HIGH',
	'BACKGROUND_MOD_SUBTLE',
	'BACKGROUND_SECONDARY',
]
const OwnToken = 'BACKGROUND_BRAND'
const OwnAlpha = 0.3

type ThemeStore = DiscordModules.Flux.Store<{ theme: string }>

function resolve(names: string[]) {
	const theme = (Stores.ThemeStore as ThemeStore).theme
	const { colors, internal } = Tokens.default
	const name = names.find(name => name in colors)
	return name ? internal.resolveSemanticColor(theme, colors[name]) : undefined
}

function argb(hex: string | undefined, alpha = 1) {
	const color = processColor(hex) as number | null | undefined
	if (color == null) return 0
	const a = Math.round(((color >>> 24) & 0xff) * alpha)
	return (a << 24) | (color & 0xffffff) | 0
}

function sendColors() {
	callNativeMethodSync('dim.chat-bubbles.colors', [
		argb(resolve([OwnToken]), OwnAlpha),
		argb(resolve(OtherTokens)),
	])
}

export default plugin({
	start({ cleanup }) {
		sendColors()
		Stores.ThemeStore.addChangeListener(sendColors)
		cleanup(() => Stores.ThemeStore.removeChangeListener(sendColors))

		const myId = () =>
			(Stores.AuthenticationStore as unknown as { getId(): string }).getId()

		cleanup(
			// modules/messages/native/renderer/RowGenerator.tsx
			getModules(withName<RowManager>('RowManager'), ({ prototype }) => {
				cleanup(
					after(prototype, 'generate', row => {
						const message = row?.type === MessageRowType ? row.message : null
						// before native binds the row, so the bubble gets the right color
						if (message?.authorId && message.authorId === myId())
							callNativeMethodSync('dim.chat-bubbles.own', [message.id])
						return row
					}),
				)
			}),
		)
	},
})

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dim.chat-bubbles.colors': [[own: number, other: number], null]
		'dim.chat-bubbles.own': [[id: string], null]
	}
}
