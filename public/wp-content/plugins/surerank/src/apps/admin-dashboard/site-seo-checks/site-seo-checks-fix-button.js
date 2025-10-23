import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { applyFilters } from '@wordpress/hooks';
import { LockIcon } from 'lucide-react';
import FixButton from '@GlobalComponents/fix-button';
import { isFixItForMeButton } from '@Global/constants';

/**
 * SiteSeoChecksFixButton component that renders a FixButton with consistent logic
 * @param {Object} props                 - Component props
 * @param {Object} props.selectedItem    - The selected item object containing status and other properties
 * @param {Object} props.additionalProps - Additional props to pass to the FixButton
 * @return {JSX.Element} The rendered FixButton component
 */
const SiteSeoChecksFixButton = ( { selectedItem, ...additionalProps } ) => {
	const SHOW_FIX_BUTTON_FOR = isFixItForMeButton( selectedItem?.id );

	const fixItButtonProps = useMemo( () => {
		const baseProps = {
			...additionalProps,
			hidden: false,
			id: selectedItem?.id,
			category: selectedItem?.category ?? '',
		};

		if ( SHOW_FIX_BUTTON_FOR ) {
			return {
				...baseProps,
				buttonLabel: __( 'Fix It For Me', 'surerank' ),
			};
		}

		const { runBeforeOnClick, runAfterOnClick, ...helpProps } = baseProps;
		return {
			...helpProps,
			buttonLabel: __( 'Help Me Fix', 'surerank' ),
			locked: true,
		};
	}, [ selectedItem, additionalProps, SHOW_FIX_BUTTON_FOR ] );

	const ProFixButton = applyFilters(
		'surerank-pro.dashboard.site-seo-checks-fix-it-button'
	);

	return ProFixButton ? (
		<ProFixButton { ...fixItButtonProps } />
	) : (
		<FixButton
			icon={ <LockIcon /> }
			tooltipProps={ { className: 'z-999999' } }
			locked={ true }
			{ ...fixItButtonProps }
		/>
	);
};

export default SiteSeoChecksFixButton;
