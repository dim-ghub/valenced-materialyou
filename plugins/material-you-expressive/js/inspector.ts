import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { callNativeMethod } from '@valenced/modules/native'
import { before } from '@valenced/patcher'

interface Seen {
	count: number
	props: Set<string>
}

const MaxNames = 500

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
	if (!name || !seen) return

	let entry = seen.get(name)
	if (!entry) seen.set(name, (entry = { count: 0, props: new Set() }))
	entry.count++
	if (props && typeof props === 'object')
		for (const key of Object.keys(props))
			if (key !== 'children') entry.props.add(key)
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

	let views = ''
	try {
		views = (await callNativeMethod('dim.expressive.dumpViews', [])) ?? ''
	} catch (e) {
		views = `failed: ${e}`
	}

	Clipboard.setString(
		`# Components\n${components.join('\n')}\n\n# Native views\n${views}`,
	)
	return `Copied ${components.length} components and ${views.split('\n').length} views`
}

export const Inspector = { start, stop }

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dim.expressive.dumpViews': [args: [], returnValue: string | null]
	}
}
