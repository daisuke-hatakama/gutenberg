import { Icon as WCIcon } from '@wordpress/components';
import { forwardRef } from '@wordpress/element';
// eslint-disable-next-line @wordpress/use-recommended-components
import { Menu } from '@wordpress/ui';

function UnforwardedMoreMenuItem(
	{ children, icon, info, target, ...props },
	ref
) {
	const content = info ? (
		<>
			<Menu.ItemLabel>{ children }</Menu.ItemLabel>
			<Menu.ItemDescription>{ info }</Menu.ItemDescription>
		</>
	) : (
		children
	);
	const prefix = icon ? <WCIcon icon={ icon } size={ 24 } /> : undefined;

	if ( props.href ) {
		return (
			<Menu.LinkItem
				ref={ ref }
				prefix={ prefix }
				openInNewTab={ target === '_blank' }
				{ ...props }
			>
				{ content }
			</Menu.LinkItem>
		);
	}

	return (
		<Menu.Item ref={ ref } prefix={ prefix } { ...props }>
			{ content }
		</Menu.Item>
	);
}

/**
 * Renders an item of the more menu. Fills use it instead of the menu parts,
 * which only share their context within the package they are bundled into.
 */
export default forwardRef( UnforwardedMoreMenuItem );
