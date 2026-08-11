import { isBlobURL } from '@wordpress/blob';
import { useContext, useEffect, useRef, useState } from '@wordpress/element';
import {
	MediaPlaceholder,
	MediaReplaceFlow,
	MediaUpload,
	MediaUploadCheck,
	BlockIcon,
	store as blockEditorStore,
	useBlockProps,
	BlockControls,
	InspectorControls,
	PlainText,
} from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	TextControl,
	TextareaControl,
	BaseControl,
	Spinner,
} from '@wordpress/components';
import { Link } from '@wordpress/ui';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { __ } from '@wordpress/i18n';
import { audio as icon } from '@wordpress/icons';
import { __unstableStripHTML as stripHTML } from '@wordpress/dom';
import { PlaylistContext } from '../playlist/context';
import { getTrackAttributes, getTrackImageAttributes } from '../playlist/utils';
import { useUploadMediaFromBlobURL } from '../utils/hooks';

const ALLOWED_MEDIA_TYPES = [ 'audio' ];
const TRACK_IMAGE_ALLOWED_MEDIA_TYPES = [ 'image' ];

function getSharedTrackAttribute( tracks, attribute ) {
	if ( tracks.length === 0 ) {
		return '';
	}

	const firstValue = tracks[ 0 ].attributes[ attribute ] || '';
	const hasSharedValue = tracks.every(
		( track ) => ( track.attributes[ attribute ] || '' ) === firstValue
	);

	return hasSharedValue ? firstValue : '';
}

const PlaylistTrackEdit = ( {
	attributes,
	setAttributes,
	context,
	clientId,
	isSelected,
} ) => {
	const { id, src, album, artist, image, imageAlt, length, title } =
		attributes;
	const [ temporaryURL, setTemporaryURL ] = useState( attributes.blob );
	const showArtists = context?.showArtists;
	const showImages = context?.showImages ?? true;
	const imageButton = useRef();
	const blockProps = useBlockProps();
	const { currentTrackClientId, setCurrentTrackClientId } =
		useContext( PlaylistContext );
	const { createErrorNotice } = useDispatch( noticesStore );
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const { selectedTrackClientIds, selectedTracks } = useSelect(
		( select ) => {
			const {
				getBlock,
				getBlockName,
				getBlockRootClientId,
				getMultiSelectedBlockClientIds,
			} = select( blockEditorStore );
			const multiSelectedClientIds = getMultiSelectedBlockClientIds();
			const playlistClientId = getBlockRootClientId( clientId );

			if ( multiSelectedClientIds.length <= 1 || ! playlistClientId ) {
				return {
					selectedTrackClientIds: [],
					selectedTracks: [],
				};
			}

			const isSelectingPlaylistTracks = multiSelectedClientIds.every(
				( selectedClientId ) =>
					getBlockName( selectedClientId ) ===
						'core/playlist-track' &&
					getBlockRootClientId( selectedClientId ) ===
						playlistClientId
			);

			if ( ! isSelectingPlaylistTracks ) {
				return {
					selectedTrackClientIds: [],
					selectedTracks: [],
				};
			}

			return {
				selectedTrackClientIds: multiSelectedClientIds,
				selectedTracks: multiSelectedClientIds
					.map( getBlock )
					.filter( Boolean ),
			};
		},
		[ clientId ]
	);
	function onUploadError( message ) {
		createErrorNotice( message, { type: 'snackbar' } );
	}
	const hasTrackSource = !! src || !! temporaryURL;
	const hasSelectedTracks = selectedTrackClientIds.length > 1;
	const isEditingSelectedTracks =
		hasSelectedTracks && selectedTrackClientIds[ 0 ] === clientId;
	const selectedTracksHaveImage = selectedTracks.some(
		( track ) => !! track.attributes.image
	);

	useEffect( () => {
		if (
			isSelected &&
			hasTrackSource &&
			currentTrackClientId !== clientId
		) {
			setCurrentTrackClientId( clientId );
		}
	}, [
		isSelected,
		hasTrackSource,
		clientId,
		currentTrackClientId,
		setCurrentTrackClientId,
	] );

	useUploadMediaFromBlobURL( {
		url: temporaryURL,
		allowedTypes: ALLOWED_MEDIA_TYPES,
		onChange: onSelectTrack,
		onError: onUploadError,
	} );

	function onSelectTrack( media ) {
		const mediaUrl = media?.url ?? media?.source_url;

		if ( ! media || ! mediaUrl ) {
			// In this case there was an error and we should continue in the editing state
			// previous attributes should be removed because they may be temporary blob urls.
			setAttributes( {
				blob: undefined,
				id: undefined,
				artist: undefined,
				album: undefined,
				image: undefined,
				imageAlt: undefined,
				length: undefined,
				title: undefined,
				url: undefined,
			} );
			setTemporaryURL();
			return;
		}

		if ( isBlobURL( mediaUrl ) ) {
			setTemporaryURL( mediaUrl );
			return;
		}

		setAttributes( {
			blob: undefined,
			...getTrackAttributes( media ),
		} );
		setTemporaryURL();
	}

	function onSelectTrackImage( trackImage ) {
		setAttributes( getTrackImageAttributes( trackImage ) );
	}

	function onRemoveTrackImage() {
		setAttributes( { image: undefined, imageAlt: undefined } );

		// Move focus back to the Media Upload button.
		imageButton.current.focus();
	}

	function updateSelectedTracksAttribute( attribute ) {
		return ( value ) => {
			updateBlockAttributes( selectedTrackClientIds, {
				[ attribute ]: value,
			} );
		};
	}

	function onSelectSelectedTrackImage( trackImage ) {
		updateBlockAttributes(
			selectedTrackClientIds,
			getTrackImageAttributes( trackImage )
		);
	}

	function onRemoveSelectedTrackImage() {
		updateBlockAttributes( selectedTrackClientIds, {
			image: undefined,
			imageAlt: undefined,
		} );
	}

	if ( ! hasTrackSource ) {
		return (
			<div { ...blockProps }>
				<MediaPlaceholder
					icon={ <BlockIcon icon={ icon } /> }
					labels={ {
						title: __( 'Track' ),
						instructions: __(
							'Upload an audio file or pick one from your media library.'
						),
					} }
					onSelect={ onSelectTrack }
					accept="audio/*"
					allowedTypes={ ALLOWED_MEDIA_TYPES }
					value={ attributes }
					onError={ onUploadError }
				/>
			</div>
		);
	}

	return (
		<>
			<BlockControls group="other">
				<MediaReplaceFlow
					name={ __( 'Replace' ) }
					onSelect={ onSelectTrack }
					accept="audio/*"
					mediaId={ id }
					mediaURL={ src }
					allowedTypes={ ALLOWED_MEDIA_TYPES }
					onError={ onUploadError }
					variant="toolbar"
				/>
			</BlockControls>
			{ isEditingSelectedTracks && (
				<InspectorControls>
					<PanelBody title={ __( 'Selected tracks' ) }>
						<TextControl
							label={ __( 'Artist' ) }
							value={ stripHTML(
								getSharedTrackAttribute(
									selectedTracks,
									'artist'
								)
							) }
							onChange={ updateSelectedTracksAttribute(
								'artist'
							) }
						/>
						<TextControl
							label={ __( 'Album' ) }
							value={ stripHTML(
								getSharedTrackAttribute(
									selectedTracks,
									'album'
								)
							) }
							onChange={ updateSelectedTracksAttribute(
								'album'
							) }
						/>
						<MediaUploadCheck>
							<BaseControl>
								<BaseControl.VisualLabel>
									{ __( 'Track image' ) }
								</BaseControl.VisualLabel>
								<div className="editor-video-poster-control">
									{ !! getSharedTrackAttribute(
										selectedTracks,
										'image'
									) && (
										<img
											src={ getSharedTrackAttribute(
												selectedTracks,
												'image'
											) }
											alt={ __(
												'Preview of the track image'
											) }
										/>
									) }
									<MediaUpload
										title={ __( 'Select image' ) }
										onSelect={ onSelectSelectedTrackImage }
										allowedTypes={
											TRACK_IMAGE_ALLOWED_MEDIA_TYPES
										}
										render={ ( { open } ) => (
											<Button
												__next40pxDefaultSize
												variant="primary"
												onClick={ open }
												ref={ imageButton }
											>
												{ ! selectedTracksHaveImage
													? __( 'Select' )
													: __( 'Replace' ) }
											</Button>
										) }
									/>
									{ selectedTracksHaveImage && (
										<Button
											__next40pxDefaultSize
											onClick={
												onRemoveSelectedTrackImage
											}
											variant="tertiary"
										>
											{ __( 'Remove' ) }
										</Button>
									) }
								</div>
							</BaseControl>
						</MediaUploadCheck>
						{ selectedTracksHaveImage && (
							<TextareaControl
								label={ __( 'Alternative text' ) }
								value={ getSharedTrackAttribute(
									selectedTracks,
									'imageAlt'
								) }
								onChange={ updateSelectedTracksAttribute(
									'imageAlt'
								) }
								help={
									<Link
										openInNewTab
										href={
											// translators: Localized tutorial, if one exists. W3C Web Accessibility Initiative link has list of existing translations.
											__(
												'https://www.w3.org/WAI/tutorials/images/decision-tree/'
											)
										}
									>
										{ __(
											'Describe the purpose of the image.'
										) }
									</Link>
								}
							/>
						) }
					</PanelBody>
				</InspectorControls>
			) }
			{ ! hasSelectedTracks && (
				<InspectorControls>
					<PanelBody title={ __( 'Settings' ) }>
						<TextControl
							label={ __( 'Artist' ) }
							value={ artist ? stripHTML( artist ) : '' }
							onChange={ ( artistValue ) => {
								setAttributes( { artist: artistValue } );
							} }
						/>
						<TextControl
							label={ __( 'Album' ) }
							value={ album ? stripHTML( album ) : '' }
							onChange={ ( albumValue ) => {
								setAttributes( { album: albumValue } );
							} }
						/>
						<TextControl
							label={ __( 'Title' ) }
							value={ title ? stripHTML( title ) : '' }
							onChange={ ( titleValue ) => {
								setAttributes( { title: titleValue } );
							} }
						/>
						<MediaUploadCheck>
							<BaseControl>
								<BaseControl.VisualLabel>
									{ __( 'Track image' ) }
								</BaseControl.VisualLabel>
								<div className="editor-video-poster-control">
									{ !! image && (
										<img
											src={ image }
											alt={ __(
												'Preview of the track image'
											) }
										/>
									) }
									<MediaUpload
										title={ __( 'Select image' ) }
										onSelect={ onSelectTrackImage }
										allowedTypes={
											TRACK_IMAGE_ALLOWED_MEDIA_TYPES
										}
										render={ ( { open } ) => (
											<Button
												__next40pxDefaultSize
												variant="primary"
												onClick={ open }
												ref={ imageButton }
											>
												{ ! image
													? __( 'Select' )
													: __( 'Replace' ) }
											</Button>
										) }
									/>
									{ !! image && (
										<Button
											__next40pxDefaultSize
											onClick={ onRemoveTrackImage }
											variant="tertiary"
										>
											{ __( 'Remove' ) }
										</Button>
									) }
								</div>
							</BaseControl>
						</MediaUploadCheck>
						{ !! image && (
							<TextareaControl
								label={ __( 'Alternative text' ) }
								value={ imageAlt || '' }
								onChange={ ( value ) =>
									setAttributes( { imageAlt: value } )
								}
								help={
									<Link
										openInNewTab
										href={
											// translators: Localized tutorial, if one exists. W3C Web Accessibility Initiative link has list of existing translations.
											__(
												'https://www.w3.org/WAI/tutorials/images/decision-tree/'
											)
										}
									>
										{ __(
											'Describe the purpose of the image.'
										) }
									</Link>
								}
							/>
						) }
					</PanelBody>
				</InspectorControls>
			) }
			<li { ...blockProps }>
				{ !! temporaryURL && <Spinner /> }
				<button
					className="wp-block-playlist-track__button"
					onClick={ () => setCurrentTrackClientId( clientId ) }
					aria-current={
						currentTrackClientId === clientId ? 'true' : 'false'
					}
				>
					{ showImages && !! image && (
						<img
							className="wp-block-playlist-track__image"
							src={ image }
							alt={ imageAlt || '' }
						/>
					) }
					<span className="wp-block-playlist-track__content">
						<PlainText
							tagName="span"
							className="wp-block-playlist-track__title"
							value={ title }
							placeholder={ __( 'Add title' ) }
							onChange={ ( value ) => {
								setAttributes( { title: value } );
							} }
							__experimentalVersion={ 2 }
						/>
						{ showArtists && (
							<PlainText
								tagName="span"
								className="wp-block-playlist-track__artist"
								value={ artist }
								placeholder={ __( 'Add artist' ) }
								onChange={ ( value ) =>
									setAttributes( { artist: value } )
								}
								__experimentalVersion={ 2 }
							/>
						) }
					</span>
					<span className="wp-block-playlist-track__length">
						{ length && (
							<span className="screen-reader-text">
								{
									/* translators: Visually hidden label for the track duration (screen reader text). */
									__( 'Duration:' )
								}
							</span>
						) }
						{ length }
					</span>
					<span className="screen-reader-text">{ __( 'Play' ) }</span>
				</button>
			</li>
		</>
	);
};

export default PlaylistTrackEdit;
