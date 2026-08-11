import { fireEvent, render, screen } from '@testing-library/react';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import PlaylistTrackEdit from '../edit';
import { PlaylistContext } from '../../playlist/context';
import { useUploadMediaFromBlobURL } from '../../utils/hooks';

let mockMediaReplaceFlowProps;
let mockMediaUploadProps;

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
	BlockControls: ( { children } ) => <div>{ children }</div>,
	BlockIcon: () => <span />,
	InspectorControls: ( { children } ) => <div>{ children }</div>,
	MediaPlaceholder: () => <div />,
	MediaReplaceFlow: ( props ) => {
		mockMediaReplaceFlowProps = props;
		const { name, onSelect } = props;
		return <button onClick={ () => onSelect( {} ) }>{ name }</button>;
	},
	MediaUpload: ( props ) => {
		mockMediaUploadProps.push( props );
		return props.render( { open: jest.fn() } );
	},
	MediaUploadCheck: ( { children } ) => <div>{ children }</div>,
	PlainText: ( {
		onChange,
		placeholder,
		tagName: TagName = 'div',
		value,
		__experimentalVersion,
		...props
	} ) => <TagName { ...props }>{ value || placeholder }</TagName>,
	useBlockProps: jest.fn( () => ( {} ) ),
} ) );

jest.mock( '@wordpress/data', () => ( {
	useDispatch: jest.fn(),
	useSelect: jest.fn(),
	combineReducers: jest.fn( ( reducers ) => ( state = {}, action ) => {
		const newState = {};
		Object.keys( reducers ).forEach( ( key ) => {
			newState[ key ] = reducers[ key ]( state[ key ], action );
		} );
		return newState;
	} ),
	createRegistrySelector: jest.fn( ( fn ) => fn ),
	createReduxStore: jest.fn( () => ( {} ) ),
	createSelector: jest.fn( ( fn ) => fn ),
	register: jest.fn(),
} ) );

jest.mock( '@wordpress/notices', () => ( {
	store: 'core/notices',
} ) );

jest.mock( '../../utils/hooks', () => ( {
	useUploadMediaFromBlobURL: jest.fn(),
} ) );

const defaultAttributes = {
	id: 1,
	src: 'https://example.com/song.mp3',
	album: 'Great Album',
	artist: 'The Artist',
	image: 'https://example.com/cover.jpg',
	imageAlt: 'A bright abstract track image',
	length: '3:45',
	title: 'Song One',
};

function renderEdit( props = {} ) {
	const setAttributes = jest.fn();
	const setCurrentTrackClientId = props.setCurrentTrackClientId || jest.fn();

	render(
		<PlaylistContext.Provider
			value={ {
				currentTrackClientId: props.currentTrackClientId ?? null,
				setCurrentTrackClientId,
			} }
		>
			<PlaylistTrackEdit
				attributes={ {
					...defaultAttributes,
					...props.attributes,
				} }
				setAttributes={ setAttributes }
				context={ {
					showArtists: true,
					showImages: true,
					...props.context,
				} }
				clientId={ props.clientId || 'playlist-track-client-id' }
				isSelected={ props.isSelected ?? false }
			/>
		</PlaylistContext.Provider>
	);

	return { setAttributes, setCurrentTrackClientId };
}

describe( 'PlaylistTrackEdit', () => {
	let updateBlockAttributes;

	beforeEach( () => {
		mockMediaReplaceFlowProps = undefined;
		mockMediaUploadProps = [];
		updateBlockAttributes = jest.fn();
		useDispatch.mockImplementation( ( store ) => {
			if ( store === blockEditorStore ) {
				return { updateBlockAttributes };
			}

			return { createErrorNotice: jest.fn() };
		} );
		useSelect.mockReturnValue( {
			selectedTrackClientIds: [],
			selectedTracks: [],
		} );
		useUploadMediaFromBlobURL.mockClear();
	} );

	it( 'allows the track image alternative text to be edited', () => {
		const { setAttributes } = renderEdit();

		expect(
			screen.getByRole( 'link', {
				name: /Describe the purpose of the image\./,
			} )
		).toHaveAttribute(
			'href',
			'https://www.w3.org/WAI/tutorials/images/decision-tree/'
		);
		expect(
			screen.queryByText( 'Leave empty if decorative.' )
		).not.toBeInTheDocument();

		fireEvent.change( screen.getByLabelText( 'Alternative text' ), {
			target: { value: 'A silver microphone on a red background' },
		} );

		expect( setAttributes ).toHaveBeenCalledWith( {
			imageAlt: 'A silver microphone on a red background',
		} );
	} );

	it( 'does not show the alternative text control without a track image', () => {
		renderEdit( {
			attributes: {
				image: undefined,
				imageAlt: undefined,
			},
		} );

		expect(
			screen.queryByLabelText( 'Alternative text' )
		).not.toBeInTheDocument();
	} );

	it( 'sets the selected track as the current track', () => {
		const { setCurrentTrackClientId } = renderEdit( {
			currentTrackClientId: 'another-track-client-id',
			isSelected: true,
		} );

		expect( setCurrentTrackClientId ).toHaveBeenCalledWith(
			'playlist-track-client-id'
		);
	} );

	it( 'does not set a selected placeholder track as the current track', () => {
		const { setCurrentTrackClientId } = renderEdit( {
			attributes: {
				blob: undefined,
				src: undefined,
			},
			currentTrackClientId: 'another-track-client-id',
			isSelected: true,
		} );

		expect( setCurrentTrackClientId ).not.toHaveBeenCalled();
	} );

	it( 'uploads temporary blob tracks', () => {
		renderEdit( {
			attributes: {
				blob: 'blob:https://example.com/temporary-track',
				src: undefined,
			},
		} );

		expect( useUploadMediaFromBlobURL ).toHaveBeenCalledWith(
			expect.objectContaining( {
				url: 'blob:https://example.com/temporary-track',
			} )
		);
	} );

	it( 'preserves the current track source when a replacement upload fails', () => {
		const { setAttributes } = renderEdit();

		mockMediaReplaceFlowProps.onSelect();

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes.mock.calls[ 0 ][ 0 ] ).not.toHaveProperty(
			'src'
		);
	} );

	it( 'accepts raw uploaded attachment data when replacing a track', () => {
		const { setAttributes } = renderEdit();

		mockMediaReplaceFlowProps.onSelect( {
			id: 2,
			source_url: 'https://example.com/replacement.mp3',
			title: { raw: 'Replacement &amp; Track' },
		} );

		expect( setAttributes ).toHaveBeenCalledWith(
			expect.objectContaining( {
				blob: undefined,
				id: 2,
				src: 'https://example.com/replacement.mp3',
				title: 'Replacement & Track',
			} )
		);
	} );

	it( 'allows artist and album to be edited for multiple selected tracks', () => {
		const selectedTrackClientIds = [
			'track-client-id-1',
			'track-client-id-2',
		];
		useSelect.mockReturnValue( {
			selectedTrackClientIds,
			selectedTracks: [
				{
					clientId: 'track-client-id-1',
					attributes: {
						artist: 'The Artist',
						album: 'Great Album',
					},
				},
				{
					clientId: 'track-client-id-2',
					attributes: {
						artist: 'The Artist',
						album: 'Great Album',
					},
				},
			],
		} );

		renderEdit( {
			clientId: 'track-client-id-1',
		} );

		expect( screen.getByText( 'Selected tracks' ) ).toBeInTheDocument();

		fireEvent.change( screen.getByLabelText( 'Artist' ), {
			target: { value: 'Shared Artist' },
		} );
		fireEvent.change( screen.getByLabelText( 'Album' ), {
			target: { value: 'Shared Album' },
		} );

		expect( updateBlockAttributes ).toHaveBeenCalledWith(
			selectedTrackClientIds,
			{ artist: 'Shared Artist' }
		);
		expect( updateBlockAttributes ).toHaveBeenCalledWith(
			selectedTrackClientIds,
			{ album: 'Shared Album' }
		);
		expect( screen.queryByLabelText( 'Title' ) ).not.toBeInTheDocument();
	} );

	it( 'allows track images to be edited for multiple selected tracks', () => {
		const selectedTrackClientIds = [
			'track-client-id-1',
			'track-client-id-2',
		];
		useSelect.mockReturnValue( {
			selectedTrackClientIds,
			selectedTracks: [
				{
					clientId: 'track-client-id-1',
					attributes: {
						image: 'https://example.com/old-cover.jpg',
						imageAlt: 'Old cover',
					},
				},
				{
					clientId: 'track-client-id-2',
					attributes: {
						image: 'https://example.com/old-cover.jpg',
						imageAlt: 'Old cover',
					},
				},
			],
		} );

		renderEdit( {
			clientId: 'track-client-id-1',
		} );

		mockMediaUploadProps[ 0 ].onSelect( {
			url: 'https://example.com/new-cover.jpg',
			alt: 'New cover',
		} );

		expect( updateBlockAttributes ).toHaveBeenCalledWith(
			selectedTrackClientIds,
			{
				image: 'https://example.com/new-cover.jpg',
				imageAlt: 'New cover',
			}
		);

		fireEvent.click(
			screen.getByRole( 'button', {
				name: 'Remove',
			} )
		);

		expect( updateBlockAttributes ).toHaveBeenCalledWith(
			selectedTrackClientIds,
			{
				image: undefined,
				imageAlt: undefined,
			}
		);
	} );
} );
