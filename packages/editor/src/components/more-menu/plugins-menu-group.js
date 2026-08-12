import { Children, Fragment, isValidElement } from '@wordpress/element';
// eslint-disable-next-line @wordpress/use-recommended-components
import { Menu } from '@wordpress/ui';
import MoreMenuItem from './more-menu-item';

/**
 * Renders the fills of the plugins action item slot as a menu group.
 *
 * @param {Object}          props          Component properties.
 * @param {string}          props.label    Label of the group.
 * @param {React.ReactNode} props.children Fills of the slot.
 *
 * @return {React.ReactNode} The rendered component.
 */
export default function PluginsMenuGroup( { label, children } ) {
	return (
		<>
			<Menu.Separator />
			<Menu.Group>
				<Menu.GroupLabel>{ label }</Menu.GroupLabel>
				{ adoptItems( children ) }
			</Menu.Group>
		</>
	);
}

/**
 * Adopts the fills still rendering `@wordpress/components` menu items, which
 * the menu does not know about and keyboard navigation would skip. Rendering
 * them through the `render` prop registers them while keeping the markup of
 * the fill, whose own props take precedence over the ones of the item.
 *
 * @param {React.ReactNode} children Fills of the slot.
 * @param {string}          prefix   Key prefix of the adopted items.
 *
 * @return {React.ReactNode} The adopted fills.
 */
function adoptItems( children, prefix = '' ) {
	return Children.toArray( children ).flatMap( ( child, index ) => {
		if ( ! isValidElement( child ) ) {
			return child;
		}

		// Fills can wrap their items in a fragment, which `Children` keeps as
		// a single child.
		if ( child.type === Fragment ) {
			return adoptItems( child.props.children, `${ prefix }${ index }-` );
		}

		if ( child.type === MoreMenuItem ) {
			return child;
		}

		/*
		 * The fill provides the item content, so the label element the
		 * generated relationship points at is never rendered. Naming then
		 * falls back to the content of the fill.
		 */
		const key = `${ prefix }${ index }`;

		return child.props.href ? (
			<Menu.LinkItem key={ key } aria-labelledby="" render={ child } />
		) : (
			<Menu.Item
				key={ key }
				nativeButton
				aria-labelledby=""
				render={ child }
			/>
		);
	} );
}
