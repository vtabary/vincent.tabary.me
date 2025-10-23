import { useDispatch, useSelect } from '@wordpress/data';
import { STORE_NAME } from '@AdminStore/constants';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { addCategoryToSiteSeoChecks } from '@Functions/utils';

/**
 * Custom hook for running SEO checks
 *
 * @param {Object} options            - Configuration options for the hook
 * @param {Array}  options.categories - Array of categories to fetch ('settings', 'other', 'general'). If not provided, fetches all categories.
 * @return {Object} Hook return object containing isLoading state and handleRunChecksAgain function
 */
export const useRunSeoChecks = ( options = {} ) => {
	const { categories = [ 'settings', 'other', 'general' ] } = options;
	const dispatch = useDispatch( STORE_NAME );
	const { runningChecks, report } =
		useSelect( ( select ) => select( STORE_NAME ).getSiteSeoAnalysis() ) ||
		false;
	const { setSiteSeoAnalysis } = dispatch;

	const handleRunChecksAgain = async () => {
		if ( runningChecks ) {
			return;
		}
		setSiteSeoAnalysis( { runningChecks: true } );
		const url = surerank_globals.site_url;
		const force = true;

		let settingsResponse = {};
		let otherResponse = {};
		let generalResponse = {};

		// Fetch only the requested categories
		if ( categories.includes( 'settings' ) ) {
			try {
				settingsResponse = await apiFetch( {
					path: addQueryArgs( '/surerank/v1/checks/settings', {
						url,
						force,
					} ),
				} );
				settingsResponse = addCategoryToSiteSeoChecks(
					settingsResponse,
					'settings'
				);
			} catch ( error ) {}
		}

		if ( categories.includes( 'other' ) ) {
			try {
				otherResponse = await apiFetch( {
					path: addQueryArgs( '/surerank/v1/checks/other', {
						url,
						force,
					} ),
				} );
				otherResponse = addCategoryToSiteSeoChecks(
					otherResponse,
					'other'
				);
			} catch ( error ) {}
		}

		if ( categories.includes( 'general' ) ) {
			try {
				generalResponse = await apiFetch( {
					path: addQueryArgs( '/surerank/v1/checks/general', {
						url,
						force,
					} ),
				} );
				generalResponse = addCategoryToSiteSeoChecks(
					generalResponse,
					'general'
				);
			} catch ( error ) {}
		}

		const hasAnyData =
			Object.keys( settingsResponse ).length > 0 ||
			Object.keys( otherResponse ).length > 0 ||
			Object.keys( generalResponse ).length > 0;

		const payload = {
			runningChecks: false,
		};
		if ( hasAnyData ) {
			payload.report = {
				...report,
				...generalResponse,
				...settingsResponse,
				...otherResponse,
			};
		}
		setSiteSeoAnalysis( payload );
	};

	return { isLoading: runningChecks, handleRunChecksAgain };
};
