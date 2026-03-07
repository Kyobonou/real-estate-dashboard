import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { hapticMedium, hapticSuccess } from '../utils/haptics';
import './PullToRefresh.css';

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef(null);
    const thresholdHitRef = useRef(false);
    const y = useMotionValue(0);

    // Limits
    const PULL_THRESHOLD = 80;
    const MAX_PULL = 150;

    // Transform pull distance to visual properties
    const rotate = useTransform(y, [0, PULL_THRESHOLD], [0, 360]);
    const opacity = useTransform(y, [0, PULL_THRESHOLD / 2, PULL_THRESHOLD], [0, 0.5, 1]);
    const scale = useTransform(y, [0, PULL_THRESHOLD], [0.8, 1.1]);

    useEffect(() => {
        if (disabled) return;
        const element = containerRef.current;
        if (!element) return;

        let startY = 0;
        let isAtTop = false;

        const handleTouchStart = (e) => {
            // Check if we are at the top of the window
            isAtTop = window.scrollY <= 0;
            if (isAtTop && !isRefreshing) {
                startY = e.touches[0].clientY;
                animate(y, 0, { duration: 0 }); // reset immediate
            }
        };

        const handleTouchMove = (e) => {
            if (!isAtTop || isRefreshing) return;

            const touchY = e.touches[0].clientY;
            const deltaY = touchY - startY;

            // Only handle drag if pulling down
            if (deltaY > 0) {
                // Determine scrolling container. In most cases it's document/window scroll
                // Wait, if deltaY > 0 and we are at top, we want to start refreshing.
                const pullValue = Math.min(deltaY * 0.4, MAX_PULL); // add resistance
                y.set(pullValue);

                // Vibration de confirmation quand le seuil est atteint (une seule fois)
                if (pullValue >= PULL_THRESHOLD && !thresholdHitRef.current) {
                    thresholdHitRef.current = true;
                    hapticMedium();     // 🫳 "clic" haptique au passage du seuil
                } else if (pullValue < PULL_THRESHOLD) {
                    thresholdHitRef.current = false;
                }
            }
        };

        const handleTouchEnd = async () => {
            if (!isAtTop || isRefreshing) return;

            const finalY = y.get();
            if (finalY >= PULL_THRESHOLD) {
                setIsRefreshing(true);
                hapticSuccess();     // 🫳 vibration de succès à la libération
                animate(y, PULL_THRESHOLD, { duration: 0.2 });
                await onRefresh();
                setIsRefreshing(false);
            }

            thresholdHitRef.current = false;
            animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [disabled, isRefreshing, onRefresh, y]);

    return (
        <div className="pull-to-refresh-container" ref={containerRef}>
            <motion.div
                className="pull-indicator"
                style={{
                    y,
                    opacity,
                    scale,
                    rotate,
                    position: 'absolute',
                    top: -40,
                    left: '50%',
                    translateX: '-50%',
                    zIndex: 50
                }}
            >
                <div className={`refresh-circle ${isRefreshing ? 'refreshing' : ''}`}>
                    <RefreshCw size={20} />
                </div>
            </motion.div>

            <motion.div
                className="pull-content"
                style={{ y }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default PullToRefresh;
