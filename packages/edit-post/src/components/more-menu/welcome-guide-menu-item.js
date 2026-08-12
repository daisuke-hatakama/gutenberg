import { useSelect } from '@wordpress/data';
import {
	privateApis as editorPrivateApis,
	store as editorStore,
} from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { unlock } from '../../lock-unlock';

const { MoreMenuPreferenceItem } = unlock( editorPrivateApis );

export default function WelcomeGuideMenuItem() {
	const isEditingTemplate = useSelect(
		( select ) =>
			select( editorStore ).getCurrentPostType() === 'wp_template',
		[]
	);

	return (
		<MoreMenuPreferenceItem
			scope="core/edit-post"
			name={ isEditingTemplate ? 'welcomeGuideTemplate' : 'welcomeGuide' }
			label={ __( 'Welcome Guide' ) }
		/>
	);
}
