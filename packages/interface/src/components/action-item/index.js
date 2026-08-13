import { MenuGroup, MenuItem, Slot, Fill } from '@wordpress/components';
import { Children } from '@wordpress/element';

function ActionItemSlot( {
	name,
	as: Component = MenuGroup,
	fillProps = {},
	bubblesVirtually,
	children,
	...props
} ) {
	return (
		<Slot
			name={ name }
			bubblesVirtually={ bubblesVirtually }
			fillProps={ fillProps }
		>
			{ ( fills ) => {
				// Each fill renders an array of its own, so flatten them into a
				// single list before handing them over.
				const items = Children.toArray( fills );

				if ( ! items.length ) {
					return null;
				}

				if ( typeof children === 'function' ) {
					return children( items );
				}

				return <Component { ...props }>{ items }</Component>;
			} }
		</Slot>
	);
}

function ActionItem( { name, as: Component = MenuItem, onClick, ...props } ) {
	return (
		<Fill name={ name }>
			{ ( { onClick: slotOnClick } ) => {
				// The slot passes a handler of its own through `fillProps`, for
				// example to close the menu the item lives in. It runs
				// alongside the item's `onClick`, not instead of it.
				const handlers = [ onClick, slotOnClick ].filter( Boolean );

				return (
					<Component
						onClick={
							handlers.length
								? ( ...args ) =>
										handlers.forEach( ( handler ) =>
											handler( ...args )
										)
								: undefined
						}
						{ ...props }
					/>
				);
			} }
		</Fill>
	);
}

ActionItem.Slot = ActionItemSlot;

export default ActionItem;
