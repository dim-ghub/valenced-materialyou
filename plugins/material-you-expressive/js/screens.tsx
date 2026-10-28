import { Design } from '@valenced/discord/design'
import { StyleSheet, View } from 'react-native'
import { color, Roles, withAlpha } from './colors'
import type { ComponentType, ReactNode } from 'react'

type Props = Record<string, any>
type Component = ComponentType<Props>

const Pill = 999

const Surface = () =>
	color(['BACKGROUND_SURFACE_HIGH', 'BACKGROUND_MOD_SUBTLE'], '#242b2a')

/** Pill corners unless a caller asks for others. */
export const pillButton = (Button: Component) =>
	function PillButton(props: Props) {
		return <Button {...props} cornerRadius={props.cornerRadius ?? Pill} />
	}

/** Header actions (call, video, search) grouped in one tonal pill. */
export const tonalActions = (Actions: Component) =>
	function TonalActions(props: Props) {
		return (
			<View style={[styles.actions, { backgroundColor: Surface() }]}>
				<Actions {...props} />
			</View>
		)
	}

export const pillChatInput = (Container: Component) =>
	function PillChatInput(props: Props) {
		return <Container {...props} style={[props.style, styles.chatInput]} />
	}

export const largeTitle = () =>
	function LargeTitle({ title }: { title?: ReactNode }) {
		const { Text } = Design as unknown as {
			Text: ComponentType<{
				variant: string
				color?: string
				lineClamp?: number
				style?: object
				children?: ReactNode
			}>
		}

		return (
			<Text variant="heading-xl/extrabold" color="text-strong" lineClamp={1}>
				{title}
			</Text>
		)
	}

const RowGap = 2

/** Each DM as a rounded card, a little apart from the next. */
export const cardRow = (Row: Component) =>
	function CardRow(props: Props) {
		const height = typeof props.height === 'number' ? props.height : undefined

		return (
			<View
				style={[
					styles.card,
					height !== undefined && { height },
					{ backgroundColor: Surface() },
				]}
			>
				<Row
					{...props}
					height={height !== undefined ? height - RowGap * 2 : props.height}
				/>
			</View>
		)
	}

/** The selected tab sits on a pill. */
export const pillTab = (Tab: Component) =>
	function PillTab(props: Props) {
		return (
			<View
				style={[
					styles.tab,
					props.grow && styles.grow,
					props.selected && {
						backgroundColor: withAlpha(Roles.primary(), 0.16),
					},
				]}
			>
				<Tab {...props} />
			</View>
		)
	}

/** Servers are circles, the selected one morphs into a rounded square. */
export const shapedGuild = (Item: Component) =>
	function ShapedGuild(props: Props) {
		return <Item {...props} circle={!props.selected} />
	}

const styles = StyleSheet.create({
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 24,
		paddingHorizontal: 4,
	},
	chatInput: { borderRadius: 28, overflow: 'hidden' },
	card: {
		marginHorizontal: 8,
		paddingVertical: RowGap,
		borderRadius: 20,
		overflow: 'hidden',
		justifyContent: 'center',
	},
	tab: { borderRadius: 20, overflow: 'hidden' },
	grow: { flexGrow: 1 },
})
