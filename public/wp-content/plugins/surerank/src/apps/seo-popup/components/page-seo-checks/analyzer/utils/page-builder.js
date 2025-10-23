import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { Button, toast } from '@bsf/force-ui';
import { formatSeoChecks, cn } from '@/functions/utils';
import { STORE_NAME } from '@/store/constants';
import { fetchBrokenLinkStatus } from '../link-checks';
import { RefreshCcw } from 'lucide-react';

// Function to check broken links for Elementor editor
export const checkBrokenLinks = async (
	links,
	postId,
	allLinks,
	setBrokenLinkState,
	setPageSeoCheck,
	brokenLinkState,
	pageSeoChecks
) => {
	const totalLinks = allLinks.length;
	const brokenLinksArray = [];

	for ( const url of links ) {
		let isBroken = false;

		try {
			const result = await fetchBrokenLinkStatus( {
				postId,
				userAgent: window.navigator.userAgent,
				url,
				allLinks,
			} );

			if ( ! result.success ) {
				isBroken = true;
			}
		} catch {
			isBroken = true;
		}

		// Update checkedLinks and collect broken links
		setBrokenLinkState( ( prev ) => {
			const updatedChecked = new Set( prev.checkedLinks );
			const updatedBroken = new Set( prev.brokenLinks );

			updatedChecked.add( url );
			if ( isBroken ) {
				updatedBroken.add( url );
				brokenLinksArray.push( url ); // Add to array
			}

			// Update linkCheckProgress synchronously
			setPageSeoCheck( 'linkCheckProgress', {
				current: updatedChecked.size,
				total: totalLinks,
			} );

			return {
				...prev,
				checkedLinks: updatedChecked,
				brokenLinks: updatedBroken,
			};
		} );
	}

	// Final state update: mark checking as complete and update SEO checks
	setBrokenLinkState( ( prev ) => {
		const updatedChecks = [ ...pageSeoChecks ].filter(
			( c ) => c.id !== 'broken_links'
		);

		if ( brokenLinksArray.length > 0 ) {
			updatedChecks.push( {
				id: 'broken_links',
				title: __(
					'One or more broken links found on the page.',
					'surerank'
				),
				status: 'error',
				data: [
					__(
						'These broken links were found on the page:',
						'surerank'
					),
					{ list: [ ...brokenLinksArray ] },
				],
			} );
		}

		// Update all SEO checks at once
		setPageSeoCheck( 'checks', updatedChecks );
		setPageSeoCheck( 'isCheckingLinks', false );
		setPageSeoCheck( 'linkCheckProgress', {
			current: totalLinks,
			total: totalLinks,
		} );

		return {
			...prev,
			isChecking: false,
		};
	} );
};

// Function to refresh page SEO checks for Elementor editor
export const refreshPageChecks = async (
	setIsRefreshing,
	setBrokenLinkState,
	setPageSeoCheck,
	staticSelect,
	pageSeoChecks,
	brokenLinkState
) => {
	const dynamicPostId =
		staticSelect( STORE_NAME ).getVariables()?.post?.ID?.value || 0;
	setIsRefreshing( true );

	try {
		const response = await apiFetch( {
			path: `/surerank/v1/checks/page?post_id=${ dynamicPostId }&_t=${ Date.now() }`,
			method: 'GET',
		} );

		const checks = formatSeoChecks( response?.checks );
		const allLinks = response?.checks?.all_links || [];

		// Reset brokenLinkState, keeping only broken links that still exist
		setBrokenLinkState( ( prev ) => {
			const allLinksSet = new Set( allLinks );
			const cleanedBrokenLinks = new Set();
			prev.brokenLinks.forEach( ( link ) => {
				if ( allLinksSet.has( link ) ) {
					cleanedBrokenLinks.add( link );
				}
			} );

			return {
				isChecking: false,
				checkedLinks: new Set(),
				brokenLinks: cleanedBrokenLinks,
				allLinks,
			};
		} );

		const cleanedChecks = [ ...checks ].filter(
			( c ) => c.id !== 'broken_links'
		);

		// Update pageSeoChecks with cleaned checks
		setPageSeoCheck( 'checks', cleanedChecks );

		if ( allLinks.length === 0 ) {
			setPageSeoCheck( 'isCheckingLinks', false );
			setPageSeoCheck( 'linkCheckProgress', { current: 0, total: 0 } );
		} else {
			setPageSeoCheck( 'isCheckingLinks', true );
			setPageSeoCheck( 'linkCheckProgress', {
				current: 0,
				total: allLinks.length,
			} );

			await checkBrokenLinks(
				allLinks,
				dynamicPostId,
				allLinks,
				setBrokenLinkState,
				setPageSeoCheck,
				brokenLinkState,
				cleanedChecks
			);
		}
	} catch ( error ) {
		toast.error( error.message );
		// Reset states on error
		setBrokenLinkState( {
			isChecking: false,
			checkedLinks: new Set(),
			brokenLinks: new Set(),
			allLinks: [],
		} );
		setPageSeoCheck( 'isCheckingLinks', false );
		setPageSeoCheck( 'linkCheckProgress', { current: 0, total: 0 } );
	} finally {
		setIsRefreshing( false );
	}
};

export const isElementorBuilder = () => {
	return (
		typeof window !== 'undefined' &&
		typeof window.elementor !== 'undefined' &&
		window.elementor.hasOwnProperty( 'elements' )
	);
};

export const isBricksBuilder = () => {
	return !! surerank_globals?.is_bricks;
};

export const isPageBuilderActive = () => {
	return isBricksBuilder() || isElementorBuilder();
};

export const RefreshButton = ( { isRefreshing, isChecking, onClick } ) => {
	return (
		<Button
			variant="outline"
			size="xs"
			onClick={ onClick }
			disabled={ isRefreshing || isChecking }
			icon={
				<RefreshCcw
					className={ cn(
						'size-4',
						( isRefreshing || isChecking ) && 'animate-spin'
					) }
				/>
			}
		>
			{ isRefreshing || isChecking
				? __( 'Refreshing', 'surerank' )
				: __( 'Refresh', 'surerank' ) }
		</Button>
	);
};
