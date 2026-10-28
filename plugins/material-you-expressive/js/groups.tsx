import { Design } from '@valenced/discord/design'
import { Children, isValidElement } from 'react'
import { StyleSheet, View } from 'react-native'
import type { ComponentType, ReactNode } from 'react'

interface GroupProps {
	title?: string
	description?: string
	hasIcons?: boolean
	children?: ReactNode
	[key: string]: unknown
}

const Gap = 2
const Outer = 24
const Inner = 6

/**
 * Splits a row group into segments: each row renders in a group of its own, so Discord still
 * styles it, and the segment clips it to M3's large outer and small inner corners.
 */
export function segmented(Group: ComponentType<GroupProps>) {
	return function SegmentedGroup(props: GroupProps) {
		const { title, description, children, ...rest } = props
		const rows = Children.toArray(children).filter(isValidElement)

		// nothing to split
		if (rows.length < 2) return <Group {...props} />

		const { TableRowGroupTitle, Text } = Design as unknown as {
			TableRowGroupTitle: ComponentType<{ title: string }>
			Text: ComponentType<{
				variant: string
				color: string
				style?: object
				children: ReactNode
			}>
		}

		return (
			<View>
				{title ? <TableRowGroupTitle title={title} /> : null}
				<View style={styles.segments}>
					{rows.map((row, i) => (
						<View
							key={row.key ?? i}
							style={[
								styles.segment,
								{
									borderTopLeftRadius: i === 0 ? Outer : Inner,
									borderTopRightRadius: i === 0 ? Outer : Inner,
									borderBottomLeftRadius: i === rows.length - 1 ? Outer : Inner,
									borderBottomRightRadius:
										i === rows.length - 1 ? Outer : Inner,
								},
							]}
						>
							<Group {...rest}>{row}</Group>
						</View>
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
	segment: { overflow: 'hidden' },
	description: { marginTop: 8, marginHorizontal: 16 },
})
