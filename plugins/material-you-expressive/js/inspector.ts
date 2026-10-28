import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { callNativeMethod } from '@valenced/modules/native'
import { before } from '@valenced/patcher'

interface Seen {
	count: number
	props: Set<string>
}

const MaxNames = 300
// android cuts long clipboard text off, so long output is copied in pages
const PageSize = 12_000

let output = ''

function copy(text: string, page = 1) {
	output = text
	const pages = Math.max(Math.ceil(text.length / PageSize), 1)
	const index = Math.min(Math.max(page, 1), pages)
	Clipboard.setString(text.slice((index - 1) * PageSize, index * PageSize))
	return pages > 1
		? `Copied page ${index} of ${pages}. Run MaterialExpressiveInspector.page(${index + 1}) for the next`
		: 'Copied'
}

/** Copies another page of the last output. */
function page(index: number) {
	return copy(output, index)
}
const MaxProps = 10

// react native, navigation and animation building blocks, which every screen is made of
const Ignored =
	/^(View|Text|Image|FastImage|ScrollView|Pressable.*|PressableBase|PressableOpacity|Animated.*|AnimatedComponent.*|REAWorkaroundView|Wrap|Component|Screen.*|InnerScreen|ReanimatedScreenWrapper|ReanimatedNativeStackScreen|Freeze|Suspender|DelayedFreeze|GestureDetector|NavigationProvider|SceneView|StaticContainer|NativeStackView|EnsureSingleNavigator|_default|TransitionGroup|TransitionItem|PortalToNativeView|Layer|LayerScope|FrameSizeProvider|Icon|BaseIconImage|ClipView|Anonymous|Fragment)$|(Context|Provider)$/

let seen: Map<string, Seen> | undefined
const unpatches: (() => void)[] = []

function nameOf(type: unknown): string | undefined {
	if (typeof type === 'string') return
	const named = type as {
		displayName?: string
		name?: string
		render?: { displayName?: string; name?: string }
		type?: { displayName?: string; name?: string }
	} | null
	return (
		named?.displayName ||
		named?.name ||
		named?.render?.displayName ||
		named?.render?.name ||
		named?.type?.displayName ||
		named?.type?.name ||
		undefined
	)
}

function record([type, props]: unknown[]) {
	const name = nameOf(type)
	if (!name || !seen || Ignored.test(name)) return

	let entry = seen.get(name)
	if (!entry) seen.set(name, (entry = { count: 0, props: new Set() }))
	entry.count++
	if (props && typeof props === 'object')
		for (const key of Object.keys(props))
			if (key !== 'children' && entry.props.size < MaxProps)
				entry.props.add(key)
}

/** Starts recording which components render, until {@link stop}. */
function start() {
	stop()
	seen = new Map()

	const [runtime] = lookupModule(withProps('jsx', 'jsxs')) as unknown as [
		Record<string, (...args: unknown[]) => unknown>,
		unknown,
	]
	const [react] = lookupModule(
		withProps('createElement', 'useState'),
	) as unknown as [Record<string, (...args: unknown[]) => unknown>, unknown]

	for (const [module, key] of [
		[runtime, 'jsx'],
		[runtime, 'jsxs'],
		[react, 'createElement'],
	] as const)
		if (module?.[key])
			unpatches.push(before(module, key, args => (record(args), args)))

	return 'Recording. Open the screen, then run MaterialExpressiveInspector.stop()'
}

/** Stops recording, and copies the components and native views of the open screen. */
async function stop() {
	for (const unpatch of unpatches.splice(0)) unpatch()
	if (!seen) return 'Not recording'

	const components = [...seen]
		.sort(([, a], [, b]) => b.count - a.count)
		.slice(0, MaxNames)
		.map(
			([name, { count, props }]) =>
				`${name} x${count}: ${[...props].join(', ')}`,
		)
	seen = undefined

	return `${copy(components.join('\n'))} (${components.length} components). MaterialExpressiveInspector.views() copies the native views`
}

/** Copies the native views of the open screen that have an id or a background. */
async function views() {
	const dump = (await callNativeMethod('dim.expressive.dumpViews', [])) ?? ''
	const lines = dump
		.split('\n')
		.filter(line => line.includes('#') || line.includes(' bg='))
	return `${copy(lines.join('\n'))} (${lines.length} views)`
}

export const Inspector = { start, stop, views, page }

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dim.expressive.dumpViews': [args: [], returnValue: string | null]
	}
}
