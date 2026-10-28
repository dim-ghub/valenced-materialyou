/// <reference types="@valenced/themes-api" />

import { Tokens } from '@valenced/discord/common/tokens'
import { callNativeMethodSync } from '@valenced/modules/native'
import { AppState } from 'react-native'
import iconSymbols from '../icons.json'
import type {
	DiscordColors,
	ThemeBase,
	ThemeColors,
	ThemesApi,
} from '@valenced/themes-api/types'

const PluginId = 'dim.material-you'
const GroupId = 'material-you'

type PaletteName = 'accent1' | 'accent2' | 'accent3' | 'neutral1' | 'neutral2'
type Palettes = Record<PaletteName, string[]>

type Rgb = [r: number, g: number, b: number]

function parseHex(hex: string): Rgb {
	const n = Number.parseInt(hex.slice(1, 7), 16)
	return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function toHex([r, g, b]: Rgb) {
	return `#${[r, g, b]
		.map(c => Math.round(c).toString(16).padStart(2, '0'))
		.join('')}`
}

function linearize(c: number) {
	const s = c / 255
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

// m3 tone = CIE L*
function toneOf([r, g, b]: Rgb) {
	const y =
		0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
	return y <= 216 / 24389 ? (y * 24389) / 27 : 116 * Math.cbrt(y) - 16
}

type TonalPalette = { tone: number; rgb: Rgb }[]

function tonalPalette(shades: string[]): TonalPalette {
	return shades
		.map(parseHex)
		.map(rgb => ({ tone: toneOf(rgb), rgb }))
		.sort((a, b) => a.tone - b.tone)
}

function at(palette: TonalPalette, tone: number) {
	const first = palette[0]!
	const last = palette[palette.length - 1]!
	if (tone <= first.tone) return toHex(first.rgb)
	if (tone >= last.tone) return toHex(last.rgb)

	for (let i = 1; i < palette.length; i++) {
		const hi = palette[i]!
		if (hi.tone < tone) continue

		const lo = palette[i - 1]!
		const mix = (t: number) =>
			[0, 1, 2].map(c => lo.rgb[c]! + (hi.rgb[c]! - lo.rgb[c]!) * t) as Rgb

		// rgb blends aren't linear in tone, so search for the right mix
		let min = 0
		let max = 1
		for (let j = 0; j < 16; j++) {
			const t = (min + max) / 2
			if (toneOf(mix(t)) < tone) min = t
			else max = t
		}
		return toHex(mix((min + max) / 2))
	}

	return toHex(last.rgb)
}

function withAlpha(hex: string, alpha: number) {
	return (
		hex +
		Math.round(alpha * 255)
			.toString(16)
			.padStart(2, '0')
	)
}

interface Roles {
	onSurface: string
	onSurfaceVariant: string
	outline: string
	outlineVariant: string

	primary: string
	onPrimary: string
	primaryContainer: string
	onPrimaryContainer: string
	secondaryContainer: string
	onSecondaryContainer: string
	tertiary: string
}

interface Variant {
	surfaces: PaletteName
}

function rolesOf(base: ThemeBase, p: Record<PaletteName, TonalPalette>): Roles {
	if (base === 'light')
		return {
			onSurface: at(p.neutral1, 10),
			onSurfaceVariant: at(p.neutral2, 30),
			outline: at(p.neutral2, 50),
			outlineVariant: at(p.neutral2, 80),
			primary: at(p.accent1, 40),
			onPrimary: at(p.accent1, 100),
			primaryContainer: at(p.accent1, 90),
			onPrimaryContainer: at(p.accent1, 10),
			secondaryContainer: at(p.accent2, 90),
			onSecondaryContainer: at(p.accent2, 10),
			tertiary: at(p.accent3, 40),
		}

	return {
		onSurface: at(p.neutral1, 90),
		onSurfaceVariant: at(p.neutral2, 80),
		outline: at(p.neutral2, 60),
		outlineVariant: at(p.neutral2, 30),
		primary: at(p.accent1, 80),
		onPrimary: at(p.accent1, 20),
		primaryContainer: at(p.accent1, 30),
		onPrimaryContainer: at(p.accent1, 90),
		secondaryContainer: at(p.accent2, 30),
		onSecondaryContainer: at(p.accent2, 90),
		tertiary: at(p.accent3, 80),
	}
}

// unknown names are just ignored, so old and new token names can both live here.
// backgrounds aren't listed on purpose: they come from the re-toned raw colors, which keeps
// surfaces that match in stock discord matching here too
const SemanticRoles: Partial<Record<keyof Roles, string[]>> = {
	onSurface: [
		'TEXT_DEFAULT',
		'TEXT_NORMAL',
		'TEXT_STRONG',
		'HEADER_PRIMARY',
		'MOBILE_TEXT_HEADING_PRIMARY',
		'INTERACTIVE_ACTIVE',
		'INTERACTIVE_HOVER',
		'INTERACTIVE_TEXT_ACTIVE',
		'INTERACTIVE_TEXT_HOVER',
		'ICON_STRONG',
		'CHANNELS_ACTIVE',
	],
	onSurfaceVariant: [
		'TEXT_MUTED',
		'TEXT_SUBTLE',
		'HEADER_SECONDARY',
		'INTERACTIVE_NORMAL',
		'INTERACTIVE_TEXT_DEFAULT',
		'ICON_DEFAULT',
		'ICON_SUBTLE',
		'CHANNELS_DEFAULT',
		'CHANNEL_ICON',
	],
	outline: [
		'INTERACTIVE_MUTED',
		'ICON_MUTED',
		'TEXT_PLACEHOLDER',
		'BORDER_STRONG',
	],
	outlineVariant: [
		'BORDER_SUBTLE',
		'BORDER_FAINT',
		'BORDER_NORMAL',
		'CONTROL_SECONDARY_BORDER_DEFAULT',
	],
	primary: [
		'BACKGROUND_BRAND',
		'TEXT_BRAND',
		'TEXT_LINK',
		'ICON_BRAND',
		'CONTROL_BRAND_FOREGROUND',
		'CONTROL_BRAND_FOREGROUND_NEW',
		'CONTROL_PRIMARY_BACKGROUND_DEFAULT',
		'CONTROL_PRIMARY_BACKGROUND_HOVER',
		'CONTROL_PRIMARY_BACKGROUND_ACTIVE',
		'REDESIGN_BUTTON_PRIMARY_BACKGROUND',
		'REDESIGN_BUTTON_PRIMARY_PRESSED_BACKGROUND',
		'BUTTON_FILLED_BRAND_BACKGROUND',
		'MENTION_FOREGROUND',
	],
	onPrimary: [
		'CONTROL_PRIMARY_TEXT_DEFAULT',
		'CONTROL_PRIMARY_TEXT_HOVER',
		'CONTROL_PRIMARY_TEXT_ACTIVE',
		'REDESIGN_BUTTON_PRIMARY_TEXT',
		'BUTTON_FILLED_BRAND_TEXT',
	],
	secondaryContainer: [
		'CONTROL_SECONDARY_BACKGROUND_DEFAULT',
		'CONTROL_SECONDARY_BACKGROUND_HOVER',
		'CONTROL_SECONDARY_BACKGROUND_ACTIVE',
		'REDESIGN_BUTTON_SECONDARY_BACKGROUND',
	],
	onSecondaryContainer: [
		'CONTROL_SECONDARY_TEXT_DEFAULT',
		'CONTROL_SECONDARY_TEXT_HOVER',
		'CONTROL_SECONDARY_TEXT_ACTIVE',
		'REDESIGN_BUTTON_SECONDARY_TEXT',
	],
}

const TranslucentSemanticRoles: Record<string, [keyof Roles, number]> = {
	MENTION_BACKGROUND: ['primary', 0.16],
	BACKGROUND_MENTIONED: ['primary', 0.1],
	BACKGROUND_MENTIONED_HOVER: ['primary', 0.14],
	INFO_BOX_BACKGROUND: ['primary', 0.1],
}

const NeutralRaw = /^(PRIMARY|NEUTRAL)_\d+$/
const BrandRaw = /^(BRAND|BLURPLE)_\d+$/
// grays from families not named above
const MaxGrayChroma = 24

function isGray(hex: string) {
	const rgb = parseHex(hex)
	return Math.max(...rgb) - Math.min(...rgb) <= MaxGrayChroma
}

interface SemanticDefinition {
	raw?: string
	opacity?: number
}

/** Discord's own definition of a semantic color for a base, a raw color name and an opacity. */
function definitionOf(name: string, base: ThemeBase) {
	const definitions = (
		Tokens.SemanticColor as Record<
			string,
			Record<string, SemanticDefinition | undefined> | undefined
		>
	)[name]
	const definition = definitions?.[base] ?? definitions?.[base.toUpperCase()]
	return typeof definition?.raw === 'string' ? definition : undefined
}

function withOpacity(hex: string, opacity = 1) {
	if (opacity >= 1) return hex
	const alpha = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1
	return withAlpha(hex.slice(0, 7), alpha * opacity)
}

const Bases: ThemeBase[] = ['dark', 'darker', 'midnight', 'light']

function buildColors(
	palettes: Palettes,
	discord: DiscordColors,
	variant: Variant,
): ThemeColors {
	const p = Object.fromEntries(
		Object.entries(palettes).map(([name, shades]) => [
			name,
			tonalPalette(shades),
		]),
	) as Record<PaletteName, TonalPalette>

	// swap discord's grays/blurple for system colors of the same tone
	const raw: Record<string, string> = {}
	for (const [name, value] of Object.entries(discord.raw)) {
		if (!/^#[0-9a-f]{6}/i.test(value)) continue
		const palette = BrandRaw.test(name)
			? 'accent1'
			: NeutralRaw.test(name) || isGray(value)
				? variant.surfaces
				: undefined
		if (!palette) continue

		raw[name] = at(p[palette], toneOf(parseHex(value))) + value.slice(7)
	}

	const semantic: NonNullable<ThemeColors['semantic']> = {}
	for (const base of Bases) {
		const roles = rolesOf(base, p)
		const colors: Record<string, string> = {}

		// every semantic color, so native views that only read semantic colors match too
		for (const name of Object.keys(Tokens.SemanticColor ?? {})) {
			const definition = definitionOf(name, base)
			const value =
				definition && (raw[definition.raw!] ?? discord.raw[definition.raw!])
			if (value) colors[name] = withOpacity(value, definition.opacity)
		}

		for (const [role, names] of Object.entries(SemanticRoles))
			for (const name of names!) colors[name] = roles[role as keyof Roles]

		for (const [name, [role, alpha]] of Object.entries(
			TranslucentSemanticRoles,
		))
			colors[name] = withAlpha(roles[role], alpha)

		semantic[base] = colors
	}

	return { raw, semantic }
}

let palettesJson: string | null = null

function readPalettes() {
	try {
		palettesJson = callNativeMethodSync(`${PluginId}.getPalettes`, [])
	} catch (e) {
		console.error(`[${PluginId}] Failed to read system palettes`, e)
		palettesJson = null
	}
	return palettesJson
}

function currentPalettes(): Palettes | undefined {
	return palettesJson ? JSON.parse(palettesJson) : undefined
}

const Variants: {
	id: string
	name: string
	description: string
	variant: Variant
}[] = [
	{
		id: 'system',
		name: 'Material You',
		description: 'Your system colors, with neutral surfaces.',
		variant: { surfaces: 'neutral1' },
	},
	{
		id: 'tinted',
		name: 'Material You (Tinted)',
		description: 'Your system colors, with surfaces tinted by your accent.',
		variant: { surfaces: 'neutral2' },
	},
]

function registerThemes(themes: ThemesApi) {
	for (const { id, name, description, variant } of Variants)
		themes.registerTheme(GroupId, id, {
			name,
			description,
			getColors: discord => {
				const palettes = currentPalettes()
				// android < 12
				return palettes ? buildColors(palettes, discord, variant) : {}
			},
		})
}

const SansStyles = ['Normal', 'Medium', 'Semibold', 'Bold', 'ExtraBold']

export default plugin({
	start({ themes, cleanup }) {
		themes.registerGroup(GroupId, {
			name: 'Material You',
			description: 'Colors from your Android system theme',
		})

		readPalettes()
		// re-registering re-applies the theme if it's selected
		registerThemes(themes)

		themes.registerEmojiPack(GroupId, 'system', {
			name: 'System',
			description: "Your device's emoji",
			font: 'system',
		})

		themes.registerFontPack(GroupId, 'system', {
			name: 'System',
			description: "Your device's font",
			families: Object.fromEntries(
				SansStyles.map(style => [`ggsans-${style}`, 'system-ui']),
			),
		})

		// pngs are rendered from icons.json by scripts/render-icons.py
		themes.registerIconPack(GroupId, 'symbols', {
			name: 'Material Symbols',
			description: 'Closest Material Symbols for Discord icons',
			icons: Object.fromEntries(
				Object.keys(iconSymbols).map(name => [
					name,
					`assets/icons/${name}.png`,
				]),
			),
		})

		// wallpaper/palette may have changed while backgrounded
		const subscription = AppState.addEventListener('change', state => {
			if (state !== 'active') return

			const previous = palettesJson
			if (readPalettes() !== previous) registerThemes(themes)
		})
		cleanup(() => subscription.remove())
	},
})

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dim.material-you.getPalettes': [args: [], returnValue: string | null]
	}
}
