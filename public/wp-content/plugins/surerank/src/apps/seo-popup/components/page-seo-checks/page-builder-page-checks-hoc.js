import { useSelect, useDispatch } from '@wordpress/data';
import { Suspense, useMemo } from '@wordpress/element';
import { Text } from '@bsf/force-ui';
import { __ } from '@wordpress/i18n';
import { PageChecks } from '..';
import { PAGE_SEO_CHECKS_ID_TO_STATE_MAPPING } from '@Global/constants/content-generation';
import { isBricksBuilder } from './analyzer/utils/page-builder';
import { STORE_NAME } from '@/store/constants';
import PageChecksListSkeleton from './page-checks-list-skeleton';
import { PROCESS_STATUSES } from '@/global/constants';
import { useKeywordChecks } from '@SeoPopup/components/keyword-checks/hooks/use-keyword-checks';

const PageBuilderPageSeoChecksHoc = ( { type = 'page' } ) => {
	const pageSeoChecks = useSelect(
		( select ) => select( STORE_NAME ).getPageSeoChecks(),
		[]
	);
	const {
		ignorePageSeoCheck,
		restorePageSeoCheck,
		updateAppSettings,
		updatePostSeoMeta,
	} = useDispatch( STORE_NAME );
	const { categorizedChecks } = pageSeoChecks;

	// For keyword checks, we need focus keyword and ignored list
	const { focusKeyword, ignoredList, currentScreen, currentTab } = useSelect(
		( select ) => {
			const selectors = select( STORE_NAME );
			const appSettings = selectors.getAppSettings();
			return {
				focusKeyword: selectors?.getPostSeoMeta?.()?.focus_keyword,
				ignoredList: selectors.getCurrentPostIgnoredList(),
				currentScreen: appSettings?.currentScreen,
				currentTab: appSettings?.currentTab,
			};
		},
		[]
	);

	// Use keyword checks hook when type is keyword
	const keywordChecksResult = useKeywordChecks( {
		focusKeyword: type === 'keyword' ? focusKeyword : null,
		ignoredList,
	} );

	// Get the appropriate checks based on type
	const checksData = useMemo( () => {
		if ( type === 'keyword' ) {
			// For keyword checks, use pre-filtered keyword checks from store
			if ( ! pageSeoChecks.filteredKeywordChecks ) {
				return {};
			}

			return pageSeoChecks.filteredKeywordChecks;
		}

		// For page checks, use pre-filtered page checks from store
		if ( ! pageSeoChecks.filteredPageChecks ) {
			return {};
		}

		const allowedChecks = window?.surerank_seo_popup?.page_checks || [];
		const filterChecksByType = ( checks ) => {
			return checks.filter( ( check ) =>
				allowedChecks.includes( check.id )
			);
		};

		return {
			badChecks: filterChecksByType( categorizedChecks.badChecks || [] ),
			fairChecks: filterChecksByType(
				categorizedChecks.fairChecks || []
			),
			passedChecks: filterChecksByType(
				categorizedChecks.passedChecks || []
			),
			ignoredChecks: filterChecksByType(
				categorizedChecks.ignoredChecks || []
			),
			suggestionChecks: filterChecksByType(
				categorizedChecks.suggestionChecks || []
			),
		};
	}, [ type, keywordChecksResult, categorizedChecks ] );

	const handleIgnoreCheck = ( checkId ) => {
		ignorePageSeoCheck( checkId );
	};
	const handleRestoreCheck = ( checkId ) => {
		restorePageSeoCheck( checkId );
	};

	const handleOnSuccess = ( { selectedCheckId, content } ) => {
		// Get the proper state key from the mapping
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

	// Bricks builder doesn't support page level SEO checks
	if ( isBricksBuilder() ) {
		return null;
	}

	// Handle the case where no focus keyword is provided for keyword checks
	if ( type === 'keyword' && ! focusKeyword ) {
		return (
			<div className="text-center py-4">
				<Text as="p" color="secondary" size={ 14 }>
					{ __(
						'Enter a focus keyword to see keyword-specific SEO checks.',
						'surerank'
					) }
				</Text>
			</div>
		);
	}

	return (
		<div className="p-1 space-y-2 flex-1 flex flex-col">
			<div className="flex-1">
				<Suspense fallback={ <PageChecksListSkeleton /> }>
					<PageChecks
						type={ type }
						pageSeoChecks={ {
							...pageSeoChecks,
							...checksData,
							isCheckingLinks: pageSeoChecks.isCheckingLinks,
						} }
						onIgnore={ handleIgnoreCheck }
						onRestore={ handleRestoreCheck }
						onFix={ handleClickFix }
					/>
				</Suspense>
			</div>
		</div>
	);
};

export default PageBuilderPageSeoChecksHoc;
