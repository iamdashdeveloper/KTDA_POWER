import React from "react";

interface DefaultLoaderProps {
	leafColor?: string;
	boltColor?: string;
	rotationSpeed?: number;
	className?: string;
}

const DefaultLoader: React.FC<DefaultLoaderProps> = ({
	leafColor = "#4CAF50",
	boltColor = "#FE2020",
	rotationSpeed = 3,
	className = ""
}) => {
	const viewBoxSize = 100;
	const center = viewBoxSize / 2;
	const boltWidth = 10;
	const boltHeight = 80;
	const scale = (viewBoxSize * 0.5) / Math.max(boltWidth, boltHeight);
	const leafCount = 8;
	const radius = viewBoxSize * 0.05;

	// Leaf path from your SVG (normalized to center)
	const leafPath =
		"M0 0 C-0.33 0.99 -0.66 1.98 -1 3 C-2.96 3.84 -2.96 3.84 -5.52 4.52 C-15.36 6.99 -15.36 6.99 -23.37 12.66 C-24.87 15.71 -25.54 18.94 -26.2 22.25 C-28.33 32.19 -36.17 39.87 -43 47 C-43.61 47.68 -44.23 48.35 -44.86 49.05 C-66.22 71.82 -106.04 91.87 -137.39 93.25 C-148.27 93.49 -148.27 93.49 -152 91 C-152 90.34 -152 89.68 -152 89 C-151.17 88.78 -150.33 88.56 -149.47 88.34 C-142.87 86.48 -137.43 84.46 -131.9 80.37 C-130 79 -130 79 -127.88 78.07 C-125.48 76.71 -125.15 75.48 -124 73 C-122.58 71.22 -121.11 69.47 -119.63 67.75 C-115.62 63.05 -111.86 58.21 -108.19 53.25 C-78.37 13.03 -78.37 13.03 -64 6 C-63.36 5.68 -62.72 5.37 -62.07 5.04 C-52.29 1.01 -40.09 1.98 -30.33 5.44 C-24.45 6.85 -18.39 3.27 -13.06 1 C-8.21 -0.94 -5.1 -1.16 0 0 Z";

	// Generate leaves arranged in a circle
	const leaves = Array.from({ length: leafCount }, (_, i) => {
		const angle = (360 / leafCount) * i;
		return {
			angle,
			key: i
		};
	});

	return (
		<div
			className={`inline-flex items-center transform scale-0.3 justify-center ${className}`}>
			<svg
				viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
				className='w-50 h-50 md:w-60 md:h-60 overflow-visible transform-gpu p-2 m-2'
				preserveAspectRatio='xMidYMid meet'
				style={{ maxWidth: "100%", maxHeight: "100%" }}>
				{/* Rotating group containing all leaves */}
				<g
					style={{
						animation: `spin ${rotationSpeed}s linear infinite`,
						transformOrigin: `${center}px ${center}px`
					}}>
					{leaves.map(({ angle, key }) => (
						<g
							key={key}
							transform={`rotate(${angle} ${center} ${center}) translate(${center} ${center - radius}) scale(${viewBoxSize * 0.0025})`}>
							{/* Tea leaf from SVG */}
							<path
								d={leafPath}
								fill={leafColor}
								opacity={0.85 + (key % 3) * 0.05}
								transform='translate(-75, -45)'
							/>
							{/* Leaf vein detail */}
							<path
								d='M-70 -40 Q-75 -20 -70 0'
								stroke={leafColor}
								strokeWidth='2'
								fill='none'
								opacity='0.4'
								transform='translate(0, -10)'
							/>
						</g>
					))}
				</g>

				{/* Lightning bolt - centered and static */}
				<g
					transform={`translate(${center - (boltHeight * scale) / 2}, ${center - (boltHeight * scale) / 1.4}) scale(${scale})`}>
					<path
						d='M72.5 0H57L14 68.5H47L0 130H2L68 57H36L72.5 0Z'
						fill={boltColor}
					/>
				</g>
			</svg>

			<style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
		</div>
	);
};

export default DefaultLoader;
