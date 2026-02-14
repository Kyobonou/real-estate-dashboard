import React from 'react';
import './Skeleton.css';

const Skeleton = ({
    type = 'text', // 'text', 'rect', 'circle'
    width,
    height,
    className = '',
    style = {}
}) => {
    const styles = {
        width,
        height,
        ...style
    };

    return (
        <div
            className={`skeleton skeleton-${type} ${className}`}
            style={styles}
        />
    );
};

export default Skeleton;
