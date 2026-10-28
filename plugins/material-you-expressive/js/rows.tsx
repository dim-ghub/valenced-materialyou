import { Design } from '@valenced/discord/design'
import { StyleSheet, View } from 'react-native'
import { Roles, withAlpha } from './colors'
import type { ComponentType, ReactNode } from 'react'

interface IconProps {
	variant?: string
	[key: string]: unknown
}

/** Puts row icons in a tonal circle, red for destructive rows. */
export function tonalIcon(Icon: ComponentType<IconProps>) {
	return function TonalRowIcon(props: IconProps) {
		const tint = props.variant === 'danger' ? Roles.danger() : Roles.primary()

		return (
			<View style={[styles.circle, { backgroundColor: withAlpha(tint, 0.16) }]}>
				<Icon {...props} />
			</View>
		)
	}
}

export function AccentTitle({ title }: { title: string }) {
	const { Text } = Design as unknown as {
		Text: ComponentType<{
			variant: string
			color?: string
			style?: object
			children: ReactNode
		}>
	}

	return (
		<Text
			variant="text-sm/bold"
			style={[styles.title, { color: Roles.primary() }]}
		>
			{title}
		</Text>
	)
}

const styles = StyleSheet.create({
	circle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: { marginHorizontal: 12, marginBottom: 8 },
})
