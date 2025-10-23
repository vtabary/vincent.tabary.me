import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { STORE_NAME } from '@/store/constants';
import {
	AIAuthScreen,
	FixItForMeHeader,
} from '@GlobalComponents/fix-it-for-me';
import GenerateContent from './generate-content';
import { PROCESS_STATUSES } from '@/global/constants';
import { toast } from '@bsf/force-ui';
import { getAuth } from '@/functions/api';
import useAuthPolling from '@/global/hooks/use-auth-polling';
import { PAGE_SEO_CHECKS_LEARN_MORE_URL as LEARN_MORE_URL } from '@Global/constants';

const FixItForMe = () => {
	const {
		authenticated,
		previousScreen,
		currentScreen,
		previousTab,
		previousMetaTab,
	} = useSelect( ( select ) => {
		const seoChecks = select( STORE_NAME ).getPageSeoChecks();
		const appSettings = select( STORE_NAME ).getAppSettings();
		return {
			authenticated: seoChecks?.authenticated,
			previousScreen: appSettings?.previousScreen,
			currentScreen: appSettings?.currentScreen,
			previousTab: appSettings?.previousTab,
			previousMetaTab: appSettings?.previousMetaTab,
		};
	}, [] );
	const { updateAppSettings, setPageSeoCheck } = useDispatch( STORE_NAME );

	const { openAuthPopup } = useAuthPolling( () =>
		setPageSeoCheck( 'authenticated', true )
	);

	let screenTitle;
	let content = <GenerateContent />;

	if ( ! authenticated ) {
		const handleClickLearnMore = () =>
			window.open( LEARN_MORE_URL, '_blank', 'noopener' );

		const handleGetStarted = async () => {
			try {
				const response = await getAuth();
				if ( ! response?.success ) {
					throw new Error(
						response?.message ||
							__( 'Authentication failed', 'surerank' )
					);
				}
				if ( response?.auth_url ) {
					openAuthPopup( response.auth_url );
					return;
				}

				setPageSeoCheck( 'authenticated', true );
			} catch ( error ) {
				toast.error(
					error?.message ||
						__(
							'An error occurred during authentication',
							'surerank'
						)
				);
			}
		};

		screenTitle = __( 'Connect SureRank AI', 'surerank' );
		content = (
			<AIAuthScreen
				onClickLearnMore={ handleClickLearnMore }
				onClickGetStarted={ handleGetStarted }
			/>
		);
	}

	const handleClickBack = () => {
		updateAppSettings( {
			currentScreen: previousScreen,
			previousScreen: currentScreen,
			currentTab: previousTab || 'optimize', // Restore the main tab
			currentMetaTab: previousMetaTab || 'meta', // Restore the meta sub-tab
			// Clear generation state for both flows
			selectedCheckId: null,
			selectedFieldKey: null,
			onUseThis: null,
			generateContentProcess: PROCESS_STATUSES.IDLE,
			error: null,
		} );
	};

	return (
		<div className="p-2 space-y-6">
			<FixItForMeHeader
				className="p-0"
				title={ screenTitle }
				onBack={ handleClickBack }
			/>
			{ content }
		</div>
	);
};

export default FixItForMe;
