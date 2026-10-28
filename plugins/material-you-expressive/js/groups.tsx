import { Design } from '@valenced/discord/design'
import { Children, cloneElement, createElement, isValidElement } from 'react'
import { StyleSheet, View } from 'react-native'
import { AccentTitle } from './rows'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import type { ViewStyle } from 'react-native'

interface GroupProps {
	title?: string
	description?: string
	hasIcons?: boolean
	children?: ReactNode
	[key: string]: unknown
}

const Gap = 2
const Outer = 24
const Inner = 4
// how deep to look for the group's card in what it renders
const MaxDepth = 6

type Corners = Pick<
	ViewStyle,
	| 'borderTopLeftRadius'
	| 'borderTopRightRadius'
	| 'borderBottomLeftRadius'
	| 'borderBottomRightRadius'
>

/** Gives the first rounded view in a rendered tree (the group's card) new corners. */
function reshape(node: ReactNode, corners: Corners, depth = 0): ReactNode {
	if (!isValidElement(node) || depth > MaxDepth) return node

	const element = node as ReactElement<{
		style?: unknown
		children?: ReactNode
	}>
	const style = StyleSheet.flatten(element.props.style as ViewStyle) as
		| ViewStyle
		| undefined

	if (typeof style?.borderRadius === 'number' && style.borderRadius > 0)
		return cloneElement(element, { style: [element.props.style, corners] })

	const { children } = element.props
	if (children == null || typeof children !== 'object') return element

	return cloneElement(element, {
		children: Children.map(children, child =>
			reshape(child, corners, depth + 1),
		),
	})
}

function cornersOf(index: number, count: number): Corners {
	const top = index === 0 ? Outer : Inner
	const bottom = index === count - 1 ? Outer : Inner
	return {
		borderTopLeftRadius: top,
		borderTopRightRadius: top,
		borderBottomLeftRadius: bottom,
		borderBottomRightRadius: bottom,
	}
}

/**
 * Splits a row group into segments: each row renders in a group of its own, so Discord still
 * styles it, then the group's card gets M3's large outer and small inner corners.
 */
export function segmented(Group: ComponentType<GroupProps>) {
	// plain function components can be rendered inline, which lets the card be reshaped
	const inline =
		typeof Group === 'function' &&
		!(Group.prototype as { isReactComponent?: unknown } | undefined)
			?.isReactComponent

	const renderSegment = (props: GroupProps, corners: Corners) =>
		inline
			? reshape((Group as (props: GroupProps) => ReactNode)(props), corners)
			: createElement(Group, props)

	function Segment({ corners, ...props }: GroupProps & { corners: Corners }) {
		return <>{renderSegment(props, corners)}</>
	}

	return function SegmentedGroup(props: GroupProps) {
		const { title, description, children, ...rest } = props
		const rows = Children.toArray(children).filter(isValidElement)

		if (!rows.length) return <Group {...props} />

		const { Text } = Design as unknown as {
			Text: ComponentType<{
				variant: string
				color: string
				style?: object
				children: ReactNode
			}>
		}

		return (
			<View>
				{title ? <AccentTitle title={title} /> : null}
				<View style={styles.segments}>
					{rows.map((row, i) => (
						<Segment
							key={row.key ?? i}
							{...rest}
							corners={cornersOf(i, rows.length)}
						>
							{row}
						</Segment>
					))}
				</View>
				{description ? (
					<Text
						variant="text-sm/medium"
						color="text-muted"
						style={styles.description}
					>
						{description}
					</Text>
				) : null}
			</View>
		)
	}
}

const styles = StyleSheet.create({
	segments: { gap: Gap },
	description: { marginTop: 8, marginHorizontal: 16 },
})
