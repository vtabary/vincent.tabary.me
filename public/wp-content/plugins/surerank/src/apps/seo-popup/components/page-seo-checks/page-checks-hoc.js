import { useSuspenseSelect, useDispatch } from '@wordpress/data';
import { useMemo, Suspense } from '@wordpress/element';
import { STORE_NAME } from '@/store/constants';
import { applyFilters } from '@wordpress/hooks';
import PageChecks from './page-checks';
import {
	ENABLE_PAGE_LEVEL_SEO,
	PROCESS_STATUSES,
	PAGE_SEO_CHECKS_ID_TO_STATE_MAPPING,
} from '@Global/constants';
import { __ } from '@wordpress/i18n';
import { Text } from '@bsf/force-ui';
import PageChecksListSkeleton from './page-checks-list-skeleton';
import { useKeywordChecks } from '@SeoPopup/components/keyword-checks/hooks/use-keyword-checks';

const PageSeoChecksWrapper = ( { type = 'page' } ) => {
	const {
		pageSeoChecks,
		focusKeyword,
		ignoredList,
		currentScreen,
		currentTab,
	} = useSuspenseSelect( ( select ) => {
		const selectors = select( STORE_NAME );
		const appSettings = selectors.getAppSettings();
		return {
			pageSeoChecks: selectors?.getPageSeoChecks() || {},
			focusKeyword: selectors?.getPostSeoMeta?.()?.focus_keyword,
			ignoredList: selectors.getCurrentPostIgnoredList(),
			currentScreen: appSettings?.currentScreen,
			currentTab: appSettings?.currentTab,
		};
	}, [] );
	const {
		ignorePageSeoCheck,
		restorePageSeoCheck,
		updateAppSettings,
		updatePostSeoMeta,
	} = useDispatch( STORE_NAME );

	// Use keyword checks hook when type is keyword
	const keywordChecksResult = useKeywordChecks( {
		focusKeyword: type === 'keyword' ? focusKeyword : null,
		ignoredList,
	} );

	// Get the appropriate checks based on type
	const checksData = useMemo( () => {
		if ( type === 'keyword' ) {
			// For keyword checks, return the client-side computed results
			return keywordChecksResult;
		}

		// For page checks, use pre-filtered checks from store
		if ( ! pageSeoChecks.filteredPageChecks ) {
			return {};
		}

		return pageSeoChecks.filteredPageChecks;
	}, [ type, keywordChecksResult, pageSeoChecks.filteredPageChecks ] );

	const handleIgnoreCheck = ( checkId ) => {
		ignorePageSeoCheck( checkId );
	};
	const handleRestoreCheck = ( checkId ) => {
		restorePageSeoCheck( checkId );
	};

	const handleOnSuccess = ( { selectedCheckId, content } ) => {
		if ( selectedCheckId === 'url_length' && content ) {
			const fixCallback = applyFilters(
				'surerank-pro.page-seo-checks-fix-url-length',
				null
			);
			if ( typeof fixCallback !== 'function' ) {
				return;
			}
			fixCallback( content );
			return;
		}
		// Map SEO check ID to the corresponding state property for the page
		const stateKey = PAGE_SEO_CHECKS_ID_TO_STATE_MAPPING[ selectedCheckId ];

		if ( ! stateKey ) {
			return;
		}
		// Update the state with the content used to fix the issue
		updatePostSeoMeta( {
			[ stateKey ]: content,
		} );
	};

	const handleClickFix = ( checkId ) => {
		updateAppSettings( {
			selectedCheckId: checkId,
			onSuccess: handleOnSuccess,
			generateContentProcess: PROCESS_STATUSES.IDLE,
			error: null,
			fixProcess: PROCESS_STATUSES.IDLE,
			currentScreen: 'fixItForMe',
			previousScreen: currentScreen,
			previousTab: currentTab,
		} );
	};
	// Handle the case where no focus keyword is provided for keyword checks
	if ( type === 'keyword' && ! focusKeyword ) {
		return (
			<div className="text-center py-4">
				<Text as="p" color="secondary" size={ 14 }>
					{ __(
						'To see keyword-specific SEO checks, first set a focus keyword under the Optimize tab.',
						'surerank'
					) }
				</Text>
			</div>
		);
	}

	return (
		<PageChecks
			type={ type }
			pageSeoChecks={ {
				...pageSeoChecks,
				...checksData,
			} }
			onIgnore={ handleIgnoreCheck }
			onRestore={ handleRestoreCheck }
			onFix={ handleClickFix }
		/>
	);
};

const WithPageSeoChecks = ( { type = 'page' } ) => {
	if ( ENABLE_PAGE_LEVEL_SEO === false ) {
		return null;
	}

	return (
		<Suspense fallback={ <PageChecksListSkeleton /> }>
			<PageSeoChecksWrapper type={ type } />
		</Suspense>
	);
};

export default WithPageSeoChecks;
